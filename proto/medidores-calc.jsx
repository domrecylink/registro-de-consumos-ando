// medidores-calc.jsx — cálculos puros del módulo Medidores.
// Sin estado ni React: lectura → consumo → costo, totales vs boleta global,
// validaciones de lectura y estado de pago. Espejo de emissions-calc.jsx.

// Tipos de medidor soportados. Reusa tokens de color de TYPES global.
const MED_TYPES = {
  electricidad: { id: "electricidad", label: "Electricidad", unit: "kWh", icon: "bolt",              color: "var(--rl-primary-900)", bg: "var(--rl-primary-50)" },
  combustible:  { id: "combustible",  label: "Combustible",  unit: "L",   icon: "local_gas_station", color: "var(--rl-fuel)",        bg: "var(--rl-fuel-bg)" },
  agua:         { id: "agua",         label: "Agua",         unit: "m³",  icon: "water_drop",         color: "var(--rl-success-700)", bg: "var(--rl-success-50)" },
};

function medUnit(type) { return MED_TYPES[type] ? MED_TYPES[type].unit : ""; }

function _hasVal(r) {
  return r && r.lectura != null && r.lectura !== "" && !isNaN(r.lectura);
}

// Lecturas de un medidor, cronológicas, solo las que tienen valor numérico.
function meterReadings(readings, meterId) {
  return (readings || [])
    .filter(r => r.meterId === meterId && _hasVal(r))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

// Lectura puntual de un medidor en un mes (o null).
function meterReadingFor(readings, meterId, month) {
  const r = (readings || []).find(x => x.meterId === meterId && x.month === month);
  return _hasVal(r) ? Number(r.lectura) : null;
}

// Lectura previa CON valor, estrictamente anterior a `month` (o null).
function prevReading(readings, meterId, month) {
  const list = meterReadings(readings, meterId).filter(r => r.month < month);
  return list.length ? list[list.length - 1] : null;
}

// Lectura siguiente CON valor, estrictamente posterior a `month` (o null).
function nextReading(readings, meterId, month) {
  const list = meterReadings(readings, meterId).filter(r => r.month > month);
  return list.length ? list[0] : null;
}

// ¿Es la primera lectura del medidor? (no hay lectura previa con valor)
function isFirstReading(readings, meterId, month) {
  return prevReading(readings, meterId, month) == null;
}

// Pasos de mes de `a` a `b` (b-a). 1 = meses consecutivos.
function monthsGap(a, b) {
  if (!a || !b) return 0;
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

// Consumo = lectura(month) − lectura(previa con valor). null si no hay lectura
// actual o es el primer mes del medidor (sin previa → sin cálculo).
function consumoFor(readings, meterId, month) {
  const cur = meterReadingFor(readings, meterId, month);
  if (cur == null) return null;
  const prev = prevReading(readings, meterId, month);
  if (!prev) return null;
  return cur - Number(prev.lectura);
}

// Precio unitario vigente para (sucursal, tipo, mes): el más reciente con month ≤ pedido
// (herencia del mes anterior). Si no hay ninguno anterior, cae al más temprano disponible
// — así un único precio configurado aplica también a meses previos.
function priceFor(prices, suc, type, month) {
  const all = (prices || [])
    .filter(p => p.sucursal === suc && p.type === type
      && p.precio != null && p.precio !== "" && !isNaN(p.precio))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
  if (!all.length) return null;
  const leq = all.filter(p => p.month <= month);
  if (leq.length) return Number(leq[leq.length - 1].precio);
  return Number(all[0].precio); // fallback: precio más temprano
}

// Costo a pagar = consumo × precio. null si falta consumo o precio.
function costoFor(readings, prices, meter, month) {
  const cons = consumoFor(readings, meter.id, month);
  if (cons == null) return null;
  const price = priceFor(prices, meter.sucursal, meter.type, month);
  if (price == null) return null;
  return cons * price;
}

// Total Boleta = Σ costo de registros globales (state.records) de la sucursal+tipo+mes.
// null si no hay ningún registro global para ese mes (→ no mostrar diferencia, advertir).
function boletaFor(records, suc, type, month) {
  let sum = 0, any = false;
  (records || []).forEach(r => {
    if (r.estado === "eliminada") return;
    if (r.sucursal !== suc || r.type !== type) return;
    if (!r.date || !String(r.date).startsWith(month)) return;
    any = true;
    sum += Number(r.costo) || 0;
  });
  return any ? sum : null;
}

// Totales por mes para el footer de la matriz.
function monthTotals(meters, readings, prices, records, suc, type, month) {
  let totalMedidores = 0;
  let anyMed = false;
  (meters || []).forEach(m => {
    const c = costoFor(readings, prices, m, month);
    if (c != null) { totalMedidores += c; anyMed = true; }
  });
  const totalBoleta = boletaFor(records, suc, type, month);
  const diferencia = totalBoleta == null ? null : totalMedidores - totalBoleta;
  return { totalMedidores: anyMed ? totalMedidores : null, totalBoleta, diferencia };
}

// Valida un valor de lectura para (medidor, mes). Devuelve { ok, error?, warn? }.
//   - menor que anterior → error (bloquea)
//   - igual a anterior   → ok + warn (consumo 0)
//   - hueco de meses      → ok + warn (completar mes faltante)
//   - mayor que siguiente → ok + warn (supera lectura siguiente)
function validateReading({ readings, meterId, month, value }) {
  if (value === "" || value == null || isNaN(value)) return { ok: true };
  const v = Number(value);
  const prev = prevReading(readings, meterId, month);
  const next = nextReading(readings, meterId, month);
  if (prev) {
    const pv = Number(prev.lectura);
    if (v < pv)  return { ok: false, error: "Lectura menor que la anterior (" + fmtNum(pv) + "). No se permite." };
    if (v === pv) return { ok: true, warn: "Consumo 0 — igual a la lectura anterior." };
    if (monthsGap(prev.month, month) > 1) {
      return { ok: true, warn: "Hay meses sin lectura entre medio. Completa el mes faltante." };
    }
  }
  if (next) {
    const nv = Number(next.lectura);
    if (v > nv) return { ok: true, warn: "Supera la lectura del mes siguiente (" + fmtNum(nv) + "). Revisa el dato." };
  }
  return { ok: true };
}

// Estado de pago según documentos adjuntos.
function payStatus(docs, meterId, month) {
  const d = (docs || {})[meterId + "__" + month];
  if (d && d.pago && d.pago.link)    return "pagado";
  if (d && d.factura && d.factura.link) return "facturado";
  return "por-facturar";
}
const PAY_LABEL = { "por-facturar": "Por facturar", "facturado": "Facturado", "pagado": "Pagado" };
const PAY_CHIP  = { "por-facturar": "neutral",       "facturado": "info",      "pagado": "success" };

Object.assign(window, {
  MED_TYPES, medUnit, meterReadings, meterReadingFor, prevReading, nextReading,
  isFirstReading, monthsGap, consumoFor, priceFor, costoFor, boletaFor, monthTotals,
  validateReading, payStatus, PAY_LABEL, PAY_CHIP,
});
