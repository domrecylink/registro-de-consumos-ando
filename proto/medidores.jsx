// medidores.jsx — Módulo Medidores.
// Registra lecturas físicas de medidores (agua/electricidad/combustible) por
// sucursal, calcula consumo (diferencia entre lecturas) y costo (consumo ×
// precio unitario), y compara con el consumo global ya registrado (Total Boleta).
// Vistas: matriz (mes×medidor), mensual (un mes) y pagos (estado de documentos).
// Helpers de cálculo en medidores-calc.jsx.

// ============================================================
// Helpers locales
// ============================================================
const MED_TYPE_OPTS = Object.values(MED_TYPES).map(t => ({
  value: t.id, label: t.label, icon: t.icon, iconBg: t.bg, iconColor: t.color,
}));

const MED_PERIOD_OPTS = [
  { value: "12m", label: "Últimos 12 meses" },
  { value: "6m",  label: "Últimos 6 meses" },
  { value: "3m",  label: "Últimos 3 meses" },
  { value: "1m",  label: "Mes actual" },
  { value: "custom", label: "Personalizado" },
];

// Paleta de líneas por medidor (misma del diseño de referencia).
const MED_LINE_COLORS = ["#0069A6", "#12B76A", "#F79009", "#7A5AF8", "#EF4444", "#0E9384", "#D444F1", "#EAAA08"];
const medColorAt = (i) => MED_LINE_COLORS[((i % MED_LINE_COLORS.length) + MED_LINE_COLORS.length) % MED_LINE_COLORS.length];

const monthSelectOpts = () => months.map(mk => ({ value: mk, label: monthLabelShort(mk) }));
// Desc: mes actual arriba (para el selector de Mensual).
const monthSelectOptsDesc = () => months.slice().reverse().map(mk => ({ value: mk, label: monthLabelShort(mk) }));

// Medidores de la (sucursal, tipo) seleccionada.
function metersFor(M, suc, type, includeInactive) {
  return (M.meters || []).filter(m =>
    m.sucursal === suc && m.type === type && (includeInactive || m.activo));
}

// ============================================================
// Segmented tabs
// ============================================================
const MedTabs = ({ value, onChange }) => {
  const tabs = [
    { id: "resumen", label: "Resumen", icon: "dashboard" },
    { id: "matriz",  label: "Matriz",  icon: "table_view" },
    { id: "mensual", label: "Mensual", icon: "calendar_today" },
    { id: "pagos",   label: "Pagos",   icon: "payments" },
  ];
  return (
    <div className="rc-med-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          className={"rc-med-tab" + (value === t.id ? " active" : "")}
          onClick={() => onChange(t.id)}
        >
          <Icon name={t.icon} size={16} />
          {t.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================
// Editor de precio unitario (sucursal/tipo, mes de referencia)
// ============================================================
const PriceEditor = ({ suc, type, month, label }) => {
  const { state, dispatch } = useApp();
  const M = state.medidores;
  const current = priceFor(M.prices, suc, type, month);
  // ¿el precio aplicado es heredado (no hay uno exacto para este mes)?
  const exact = (M.prices || []).some(p => p.sucursal === suc && p.type === type && p.month === month);
  return (
    <Field label={label || "Precio unitario"} style={{ width: 220, marginBottom: 0 }}
      helper={current != null && !exact ? "Heredado del mes anterior" : null}>
      <NumericInput
        value={current == null ? "" : current}
        onChange={v => dispatch({ type: "MED/SET_PRICE", sucursal: suc, tipo: type, month, precio: v })}
        placeholder="0"
        suffix={"$ / " + medUnit(type)}
      />
    </Field>
  );
};

// ============================================================
// Celda de lectura editable (inline) con validación
// ============================================================
const LecturaCell = ({ meterId, month }) => {
  const { state, dispatch } = useApp();
  const M = state.medidores;
  const [msg, setMsg] = React.useState(null); // { kind, text }
  const saved = meterReadingFor(M.readings, meterId, month);

  const onChange = (v) => {
    const res = validateReading({ readings: M.readings, meterId, month, value: v });
    setMsg(res.error ? { kind: "error", text: res.error }
         : res.warn ? { kind: "warn", text: res.warn } : null);
    if (res.ok) dispatch({ type: "MED/SET_READING", meterId, month, lectura: v });
  };

  return (
    <div className="rc-med-lectura">
      <NumericInput
        value={saved == null ? "" : saved}
        onChange={onChange}
        placeholder="—"
        error={msg && msg.kind === "error"}
        style={{ height: 34, textAlign: "right" }}
      />
      {msg && (
        <span className={"rc-med-cellmsg " + msg.kind} title={msg.text}>
          <Icon name={msg.kind === "error" ? "error" : "warning"} size={12} />
        </span>
      )}
    </div>
  );
};

// ============================================================
// Subida de documento (Factura / Pago) → Drive
// ============================================================
const DocButton = ({ meterId, month, kind, compact }) => {
  const { state, dispatch } = useApp();
  const key = meterId + "__" + month;
  const doc = (state.medidores.docs[key] || {})[kind] || null;
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);
  const label = kind === "factura" ? "Factura" : "Pago";

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const up = await rcUploadMedidorDoc(file, kind);
      dispatch({ type: "MED/SET_DOC", meterId, month, kind, doc: { link: up.link, fileId: up.id || "", name: file.name } });
      dispatch({ type: "TOAST/SHOW", toast: { kind: "success", title: label + " adjuntada", body: file.name } });
    } catch (err) {
      dispatch({ type: "TOAST/SHOW", toast: { kind: "error", title: "No se pudo subir " + label.toLowerCase(), body: err.message } });
    } finally {
      setBusy(false);
    }
  };

  const remove = () => dispatch({ type: "MED/SET_DOC", meterId, month, kind, doc: null });

  if (doc && doc.link) {
    return (
      <span className={"rc-med-doc has " + kind + (compact ? " compact" : "")}>
        <a href={doc.link} target="_blank" rel="noopener" title={label + ": " + (doc.name || "ver")}>
          <Icon name={kind === "factura" ? "receipt_long" : "payments"} size={compact ? 13 : 14} />
          {!compact && <span>{label}</span>}
        </a>
        <button onClick={remove} title={"Quitar " + label.toLowerCase()} aria-label={"Quitar " + label.toLowerCase()}>
          <Icon name="close" size={compact ? 11 : 12} />
        </button>
      </span>
    );
  }
  return (
    <button
      className={"rc-med-doc empty " + (compact ? "compact" : "")}
      onClick={() => inputRef.current && inputRef.current.click()}
      disabled={busy}
      title={"Subir " + label.toLowerCase()}
    >
      {busy ? <span className="prt-spinner" /> : <Icon name={compact ? (kind === "factura" ? "receipt_long" : "payments") : "cloud_upload"} size={compact ? 13 : 14} />}
      {!compact && <span>{label}</span>}
      <input ref={inputRef} type="file" style={{ display: "none" }} onChange={onPick} />
    </button>
  );
};

// ============================================================
// Input de precio por mes (compartido matriz / mensual)
// Lee y escribe el mismo prices[sucursal,tipo,mes].
// ============================================================
const MedPriceInput = ({ suc, type, month, compact }) => {
  const { state, dispatch } = useApp();
  const M = state.medidores;
  const price = priceFor(M.prices, suc, type, month);
  const exact = (M.prices || []).some(p => p.sucursal === suc && p.type === type && p.month === month);
  return (
    <div className={"rc-med-price" + (compact ? " compact" : "")}>
      <NumericInput
        value={price == null ? "" : price}
        placeholder="0"
        suffix={compact ? null : ("$/" + (medUnit(type) || "u"))}
        onChange={v => dispatch({ type: "MED/SET_PRICE", sucursal: suc, tipo: type, month, precio: v })}
        style={{ height: 32, textAlign: "right" }}
      />
      {price != null && !exact && (
        <span className="rc-med-price-inh" title="Heredado de un mes anterior"><Icon name="info" size={12} /></span>
      )}
    </div>
  );
};

// ============================================================
// Gráfico de líneas suavizadas — consumo por medidor × mes
// ============================================================
const MedResumenChart = ({ series, monthsView, unit }) => {
  const W = 720, H = 280, padL = 56, padR = 16, padT = 16, padB = 34;
  const n = monthsView.length;
  const all = series.flatMap(s => s.vals).filter(v => v != null);
  const maxV = all.length ? Math.max(...all) : 0;
  const top = maxV > 0 ? maxV * 1.15 : 10;
  const x = i => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = v => padT + (1 - v / top) * (H - padT - padB);
  const grid = [0, 0.25, 0.5, 0.75, 1];

  if (!series.length || !all.length) {
    return <div className="prt-muted" style={{ padding: "40px 0", textAlign: "center" }}>Sin consumo calculado para graficar. Carga lecturas en al menos dos meses.</div>;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {grid.map((g, i) => {
        const gy = padT + g * (H - padT - padB);
        return (
          <g key={i}>
            <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke={i === grid.length - 1 ? "var(--rl-gray-200)" : "var(--rl-gray-100)"} strokeWidth="1" />
            <text x={padL - 8} y={gy + 3} textAnchor="end" fontSize="10" fill="var(--rl-gray-400)" fontFamily="var(--rl-font-body)">{fmtNum(top * (1 - g))}</text>
          </g>
        );
      })}
      {monthsView.map((mk, i) => (
        <text key={mk} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--rl-gray-600)" fontFamily="var(--rl-font-body)">{monthLabelShort(mk)}</text>
      ))}
      {series.map(s => {
        const pts = s.vals.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
        const d = (typeof smoothPath === "function") ? smoothPath(pts) : pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
        return (
          <g key={s.meter.id}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2" />)}
          </g>
        );
      })}
    </svg>
  );
};

// Dropdown multi-select de medidores (el Select del proyecto es single).
const MedMeterPicker = ({ meters, selected, onToggle, onAll, onNone, colorOf }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const count = selected.size;
  return (
    <div ref={ref} className="rc-med-picker">
      <button className="rc-med-picker-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Icon name="speed" size={15} />
        <span className="rc-med-picker-txt">{count === 0 ? "Selecciona medidores" : count + " medidor" + (count === 1 ? "" : "es")}</span>
        <Icon name="expand_more" size={16} />
      </button>
      {open && (
        <div className="rc-med-picker-menu" role="listbox">
          <div className="rc-med-picker-actions">
            <button onClick={onAll}>Todos</button>
            <button onClick={onNone}>Ninguno</button>
          </div>
          {meters.length === 0 && <div className="prt-muted" style={{ padding: "8px 10px", fontSize: 13 }}>Sin medidores.</div>}
          {meters.map(m => {
            const on = selected.has(m.id);
            return (
              <button key={m.id} role="option" aria-selected={on} className={"rc-med-picker-item" + (on ? " on" : "")} onClick={() => onToggle(m.id)}>
                <span className="chk">{on && <Icon name="check" size={13} />}</span>
                <span className="dot" style={{ background: colorOf(m) }} />
                <span className="lbl">{m.nombre}{m.numero ? " · N° " + m.numero : ""}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Tab: Resumen (dashboard) — KPIs + gráfico + descarga de reporte
// ============================================================
const ResumenTab = ({ suc, type, meters, monthsView }) => {
  const { state } = useApp();
  const M = state.medidores;
  const unit = medUnit(type);
  // Selección vacía por defecto — el usuario elige en el dropdown.
  const [selected, setSelected] = React.useState(() => new Set());
  const toggle = (id) => setSelected(s => { const nx = new Set(s); nx.has(id) ? nx.delete(id) : nx.add(id); return nx; });
  const selectAll = () => setSelected(new Set(meters.map(m => m.id)));
  const selectNone = () => setSelected(new Set());

  const colorOf = (m) => medColorAt(meters.findIndex(x => x.id === m.id));
  const shown = meters.filter(m => selected.has(m.id));
  const series = shown.map(m => ({ meter: m, color: colorOf(m), vals: monthsView.map(mk => consumoFor(M.readings, m.id, mk)) }));
  const hasSel = shown.length > 0;

  const lastMonth = monthsView[monthsView.length - 1];
  const sum = (fn) => shown.reduce((acc, m) => { const v = fn(m); return acc + (v == null ? 0 : v); }, 0);
  const totalPeriodo = shown.reduce((acc, m) => acc + monthsView.reduce((a, mk) => { const c = consumoFor(M.readings, m.id, mk); return a + (c == null ? 0 : c); }, 0), 0);
  const consumoUlt = sum(m => consumoFor(M.readings, m.id, lastMonth));
  const costoUlt = sum(m => costoFor(M.readings, M.prices, m, lastMonth));

  return (
    <div className="rc-med-resumen">
      <div className="rc-med-resumen-bar">
        <MedMeterPicker meters={meters} selected={selected} onToggle={toggle} onAll={selectAll} onNone={selectNone} colorOf={colorOf} />
        <Btn icon="file_download" disabled={!hasSel} onClick={() => medDownloadReport({ suc, type, meters: shown, M, records: state.records })}>Descargar reporte</Btn>
      </div>

      {!hasSel ? (
        <EmptyState icon="dashboard" title="Selecciona medidores"
          body="Elige uno o más medidores en el desplegable para ver KPIs y el gráfico de consumo." />
      ) : (
        <>
          <div className="rc-med-kpis">
            <div className="rc-med-kpi primary">
              <div className="rc-med-kpi-label">Consumo total del período</div>
              <div className="rc-med-kpi-val">{fmtNum(totalPeriodo)}<span className="rc-med-kpi-unit">{unit}</span></div>
              <div className="rc-med-kpi-sub">{periodLabel(M.period)}</div>
            </div>
            <div className="rc-med-kpi">
              <div className="rc-med-kpi-label">Consumo último mes</div>
              <div className="rc-med-kpi-val">{fmtNum(consumoUlt)}<span className="rc-med-kpi-unit">{unit}</span></div>
              <div className="rc-med-kpi-sub">{lastMonth ? monthLabelShort(lastMonth) : "—"}</div>
            </div>
            <div className="rc-med-kpi">
              <div className="rc-med-kpi-label">Costo último mes</div>
              <div className="rc-med-kpi-val">{fmtCLP(costoUlt)}</div>
              <div className="rc-med-kpi-sub">{lastMonth ? monthLabelShort(lastMonth) : "—"}</div>
            </div>
          </div>

          <Card>
            <div className="rc-med-chart-head">
              <div className="rc-med-chart-title">Consumo mensual por medidor <span>({unit})</span></div>
              <div className="rc-med-chart-legend">
                {series.map(s => (
                  <span key={s.meter.id} className="rc-med-legend-item">
                    <span className="rc-med-legend-line" style={{ background: s.color }} />
                    {s.meter.nombre}{s.meter.numero ? " · N° " + s.meter.numero : ""}
                  </span>
                ))}
              </div>
            </div>
            <MedResumenChart series={series} monthsView={monthsView} unit={unit} />
          </Card>
        </>
      )}
    </div>
  );
};

// ============================================================
// Tab: Matriz (medidores × meses)
// ============================================================
const MatrizTab = ({ suc, type, meters, monthsView }) => {
  const { state } = useApp();
  const M = state.medidores;
  const u = medUnit(type);

  if (!meters.length) return null;

  return (
    <Card flush>
      <div style={{ overflowX: "auto" }}>
        <table className="prt-table rc-med-matriz">
          <thead>
            <tr>
              <th className="rc-med-sticky" style={{ minWidth: 200, textAlign: "left" }}>Medidor</th>
              {monthsView.map(mk => (
                <th key={mk} colSpan={4} className="rc-med-monthgroup">{monthLabelShort(mk)}</th>
              ))}
            </tr>
            <tr className="rc-med-subhead">
              <th className="rc-med-sticky"></th>
              {monthsView.map(mk => (
                <React.Fragment key={mk}>
                  <th>Lectura</th>
                  <th>Consumo</th>
                  <th>Costo</th>
                  <th>Docs</th>
                </React.Fragment>
              ))}
            </tr>
            <tr className="rc-med-pricerow">
              <th className="rc-med-sticky">Precio <em>$/{u}</em></th>
              {monthsView.map(mk => (
                <th key={mk} colSpan={4}>
                  <MedPriceInput suc={suc} type={type} month={mk} compact />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meters.map(m => (
              <tr key={m.id}>
                <td className="rc-med-sticky">
                  <strong>{m.nombre}</strong>
                  {m.numero && <span className="rc-med-num">N° {m.numero}</span>}
                </td>
                {monthsView.map(mk => {
                  const cons = consumoFor(M.readings, m.id, mk);
                  const costo = costoFor(M.readings, M.prices, m, mk);
                  const first = meterReadingFor(M.readings, m.id, mk) != null && isFirstReading(M.readings, m.id, mk);
                  return (
                    <React.Fragment key={mk}>
                      <td style={{ minWidth: 96 }}><LecturaCell meterId={m.id} month={mk} /></td>
                      <td className="rc-med-num-cell">
                        {first ? <span className="rc-med-hint">inicial</span>
                          : cons == null ? "—" : <span>{fmtNum(cons)} <em>{u}</em></span>}
                      </td>
                      <td className="rc-med-num-cell">{costo == null ? "—" : fmtCLP(costo)}</td>
                      <td className="rc-med-doc-cell">
                        <div className="rc-med-doc-pair">
                          <DocButton meterId={m.id} month={mk} kind="factura" compact />
                          <DocButton meterId={m.id} month={mk} kind="pago" compact />
                        </div>
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {[
              { key: "totalMedidores", label: "Total medidores" },
              { key: "totalBoleta",    label: "Total boleta" },
              { key: "diferencia",     label: "Diferencia" },
            ].map(row => (
              <tr key={row.key} className={"rc-med-foot " + row.key}>
                <td className="rc-med-sticky">{row.label}</td>
                {monthsView.map(mk => {
                  const t = monthTotals(meters, M.readings, M.prices, state.records, suc, type, mk);
                  let content, cls = "";
                  if (row.key === "totalMedidores") {
                    content = t.totalMedidores == null ? "—" : fmtCLP(t.totalMedidores);
                  } else if (row.key === "totalBoleta") {
                    content = t.totalBoleta == null
                      ? <span className="rc-med-hint" title="No hay consumo global registrado para este mes"><Icon name="warning" size={12} /> falta</span>
                      : fmtCLP(t.totalBoleta);
                  } else {
                    if (t.diferencia == null) { content = "—"; }
                    else {
                      cls = Math.abs(t.diferencia) < 1 ? "ok" : t.diferencia > 0 ? "pos" : "neg";
                      content = (t.diferencia > 0 ? "+" : "") + fmtCLP(t.diferencia);
                    }
                  }
                  return <td key={mk} colSpan={4} className={"rc-med-num-cell " + cls}>{content}</td>;
                })}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

// ============================================================
// Tab: Mensual (un mes, detalle por medidor)
// ============================================================
const MensualTab = ({ suc, type, meters }) => {
  const { state } = useApp();
  const M = state.medidores;
  const month = M.mensualMonth || CURRENT_MONTH_KEY;
  const u = medUnit(type);
  const totals = monthTotals(meters, M.readings, M.prices, state.records, suc, type, month);
  if (!meters.length) return null;

  return (
    <Card flush>
      <div className="rc-med-mensual-price">
        <span className="rc-med-tb-label">Precio unitario · {monthLabelShort(month)}</span>
        <div style={{ width: 160 }}><MedPriceInput suc={suc} type={type} month={month} /></div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="prt-table rc-med-mensual">
          <thead>
            <tr>
              <th style={{ minWidth: 180, textAlign: "left" }}>Medidor</th>
              <th style={{ textAlign: "right" }}>Lectura</th>
              <th style={{ textAlign: "right" }}>Consumo</th>
              <th style={{ textAlign: "right" }}>Costo</th>
              <th style={{ textAlign: "center" }}>Estado</th>
              <th style={{ minWidth: 230 }}>Documentos</th>
            </tr>
          </thead>
          <tbody>
            {meters.map(m => {
              const cons = consumoFor(M.readings, m.id, month);
              const costo = costoFor(M.readings, M.prices, m, month);
              const first = meterReadingFor(M.readings, m.id, month) != null && isFirstReading(M.readings, m.id, month);
              const st = payStatus(M.docs, m.id, month);
              return (
                <tr key={m.id}>
                  <td>
                    <strong>{m.nombre}</strong>
                    {m.numero && <span className="rc-med-num">N° {m.numero}</span>}
                  </td>
                  <td style={{ width: 130 }}><LecturaCell meterId={m.id} month={month} /></td>
                  <td className="rc-med-num-cell">
                    {first ? <span className="rc-med-hint">inicial</span>
                      : cons == null ? "—" : <span>{fmtNum(cons)} <em>{u}</em></span>}
                  </td>
                  <td className="rc-med-num-cell">{costo == null ? "—" : fmtCLP(costo)}</td>
                  <td style={{ textAlign: "center" }}>
                    <Chip kind={PAY_CHIP[st]} size="sm">{PAY_LABEL[st]}</Chip>
                  </td>
                  <td>
                    <div className="rc-med-doc-pair full">
                      <DocButton meterId={m.id} month={month} kind="factura" />
                      <DocButton meterId={m.id} month={month} kind="pago" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: Total medidores (izq) · Boleta + Diferencia (der), separados por divider */}
      <div className="rc-med-summary">
        <div className="rc-med-summary-left">
          <span className="rc-med-summary-label">Total medidores</span>
          <span className="rc-med-summary-val">{totals.totalMedidores == null ? "—" : fmtCLP(totals.totalMedidores)}</span>
        </div>
        <div className="rc-med-summary-right">
          <div className="rc-med-summary-item">
            <span className="rc-med-summary-label">Boleta registrada</span>
            <span className="rc-med-summary-val">
              {totals.totalBoleta == null
                ? <span className="rc-med-hint"><Icon name="warning" size={13} /> Sin dato</span>
                : fmtCLP(totals.totalBoleta)}
            </span>
          </div>
          <MedDivider />
          <div className="rc-med-summary-item">
            <span className="rc-med-summary-label">Diferencia</span>
            <span className={"rc-med-summary-val " + (totals.diferencia == null ? "" : Math.abs(totals.diferencia) < 1 ? "ok" : totals.diferencia > 0 ? "pos" : "neg")}>
              {totals.diferencia == null ? "—" : (totals.diferencia > 0 ? "+" : "") + fmtCLP(totals.diferencia)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ============================================================
// Tab: Pagos (estado por medidor × mes)
// ============================================================
const PagosTab = ({ meters, monthsView }) => {
  const { state } = useApp();
  const M = state.medidores;
  if (!meters.length) return null;
  return (
    <Card flush>
      <div style={{ overflowX: "auto" }}>
        <table className="prt-table rc-med-pagos">
          <thead>
            <tr>
              <th className="rc-med-sticky" style={{ minWidth: 200, textAlign: "left" }}>Medidor</th>
              {monthsView.map(mk => <th key={mk} style={{ textAlign: "center" }}>{monthLabelShort(mk)}</th>)}
            </tr>
          </thead>
          <tbody>
            {meters.map(m => (
              <tr key={m.id}>
                <td className="rc-med-sticky">
                  <strong>{m.nombre}</strong>
                  {m.numero && <span className="rc-med-num">N° {m.numero}</span>}
                </td>
                {monthsView.map(mk => {
                  const st = payStatus(M.docs, m.id, mk);
                  return (
                    <td key={mk} style={{ textAlign: "center" }}>
                      <Chip kind={PAY_CHIP[st]} size="sm">{PAY_LABEL[st]}</Chip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ============================================================
// Gestión de medidores (modal)
// ============================================================
const MedManageModal = ({ suc, type, onClose }) => {
  const { state, dispatch } = useApp();
  const list = metersFor(state.medidores, suc, type, true);
  const [nombre, setNombre] = React.useState("");
  const [numero, setNumero] = React.useState("");
  const [err, setErr] = React.useState("");
  const [editId, setEditId] = React.useState(null);
  const [editNombre, setEditNombre] = React.useState("");
  const [editNumero, setEditNumero] = React.useState("");

  // Número duplicado dentro de la misma sucursal+tipo (vacío siempre permitido).
  const dupNumero = (num, ignoreId) => {
    const n = (num || "").trim();
    if (!n) return false;
    return list.some(m => m.id !== ignoreId && (m.numero || "").trim() === n);
  };

  const add = () => {
    const nom = nombre.trim();
    if (!nom) { setErr("El nombre es obligatorio."); return; }
    if (dupNumero(numero)) { setErr("Ya existe un medidor con ese número en esta sucursal."); return; }
    dispatch({ type: "MED/ADD_METER", sucursal: suc, tipo: type, nombre: nom, numero: numero.trim() });
    setNombre(""); setNumero(""); setErr("");
  };

  const startEdit = (m) => { setEditId(m.id); setEditNombre(m.nombre); setEditNumero(m.numero || ""); setErr(""); };
  const saveEdit = () => {
    const nom = editNombre.trim();
    if (!nom) { setErr("El nombre es obligatorio."); return; }
    if (dupNumero(editNumero, editId)) { setErr("Ya existe un medidor con ese número en esta sucursal."); return; }
    dispatch({ type: "MED/EDIT_METER", id: editId, patch: { nombre: nom, numero: editNumero.trim() } });
    setEditId(null); setErr("");
  };

  return (
    <div className="rc-med-modal-backdrop" onClick={onClose}>
      <div className="rc-med-modal" onClick={e => e.stopPropagation()}>
        <div className="rc-med-modal-head">
          <div>
            <div className="prt-eyebrow">{MED_TYPES[type] ? MED_TYPES[type].label : type} · {suc}</div>
            <h2 className="prt-h2" style={{ marginTop: 2 }}>Gestionar medidores</h2>
          </div>
          <button className="rc-med-modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
        </div>

        <div className="rc-med-modal-body">
          {/* Crear */}
          <div className="rc-med-addrow">
            <Field label="Nombre" required style={{ flex: 1, marginBottom: 0 }}>
              <Input value={nombre} onChange={setNombre} placeholder="Ej: Medidor bodega" />
            </Field>
            <Field label="Número" style={{ width: 150, marginBottom: 0 }}>
              <Input value={numero} onChange={setNumero} placeholder="Opcional" />
            </Field>
            <Btn kind="primary" icon="add" onClick={add} style={{ marginBottom: 1 }}>Agregar</Btn>
          </div>
          {err && <div className="prt-help error" style={{ marginTop: 8 }}><Icon name="error" size={14} /><span>{err}</span></div>}

          {/* Lista */}
          <div className="rc-med-list" style={{ marginTop: 16 }}>
            {list.length === 0 && <div className="prt-muted" style={{ padding: "8px 0" }}>Aún no hay medidores. Agrega el primero arriba.</div>}
            {list.map(m => (
              <div key={m.id} className={"rc-med-list-item" + (m.activo ? "" : " inactive")}>
                {editId === m.id ? (
                  <>
                    <Input value={editNombre} onChange={setEditNombre} style={{ flex: 1 }} />
                    <Input value={editNumero} onChange={setEditNumero} placeholder="N°" style={{ width: 110 }} />
                    <Btn size="sm" kind="primary" icon="check" onClick={saveEdit}>Guardar</Btn>
                    <Btn size="sm" kind="ghost" onClick={() => setEditId(null)}>Cancelar</Btn>
                  </>
                ) : (
                  <>
                    <div className="rc-med-list-name">
                      <strong>{m.nombre}</strong>
                      {m.numero && <span className="rc-med-num">N° {m.numero}</span>}
                      {!m.activo && <Chip size="sm" kind="neutral">Inactivo</Chip>}
                    </div>
                    <Btn size="sm" kind="ghost" icon="edit" onClick={() => startEdit(m)}>Editar</Btn>
                    <Btn size="sm" kind="ghost" icon={m.activo ? "close" : "check"}
                      onClick={() => dispatch({ type: "MED/TOGGLE_METER", id: m.id })}>
                      {m.activo ? "Desactivar" : "Reactivar"}
                    </Btn>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="prt-hint" style={{ fontSize: 12, marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="info" size={14} />
            Desactivar no borra el historial: el medidor deja de aparecer en los meses futuros.
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Toolbar unificado — filtros (izq) + tabs (der), grupos con divider
// ============================================================
const MedDivider = () => <span className="rc-med-tb-divider" aria-hidden="true" />;

const MedToolbar = () => {
  const { state, dispatch } = useApp();
  const M = state.medidores;
  const sucNames = activeSucNames(state);
  const isCustom = (M.period || "").startsWith("custom:");
  const custom = parseCustomPeriod(M.period) || { start: months[months.length - 3], end: CURRENT_MONTH_KEY };

  const setPeriodSel = (v) => {
    if (v === "custom") dispatch({ type: "MED/SET_PERIOD", period: "custom:" + months[months.length - 3] + ":" + CURRENT_MONTH_KEY });
    else dispatch({ type: "MED/SET_PERIOD", period: v });
  };
  const setCustom = (key, val) => {
    const next = { ...custom, [key]: val };
    dispatch({ type: "MED/SET_PERIOD", period: "custom:" + next.start + ":" + next.end });
  };
  const shiftMensualMonth = (dir) => {
    const idx = months.indexOf(M.mensualMonth || CURRENT_MONTH_KEY);
    const ni = idx + dir;
    if (ni < 0 || ni >= months.length) return;
    dispatch({ type: "MED/SET_MENSUAL_MONTH", month: months[ni] });
  };

  return (
    <div className="rc-med-toolbar">
      <div className="rc-med-toolbar-left">
        {/* Grupo: sucursal + tipo */}
        <div className="rc-med-tb-group">
          <Select size="sm" value={M.selSucursal} placeholder="Sucursal" style={{ minWidth: 160 }}
            options={sucNames.map(n => ({ value: n, label: n }))}
            onChange={v => dispatch({ type: "MED/SET_SUCURSAL", sucursal: v })} />
          <Select size="sm" value={M.selType} placeholder="Tipo" style={{ minWidth: 150 }}
            options={MED_TYPE_OPTS}
            onChange={v => dispatch({ type: "MED/SET_TYPE", tipo: v })} />
        </div>

        <MedDivider />

        {/* Grupo: período (matriz/pagos) o mes (mensual) — contextual */}
        <div className="rc-med-tb-group">
          {M.tab === "mensual" ? (
            <div className="rc-med-monthnav">
              <button className="rc-med-navbtn" title="Mes anterior"
                disabled={months.indexOf(M.mensualMonth || CURRENT_MONTH_KEY) <= 0}
                onClick={() => shiftMensualMonth(-1)}><Icon name="chevron_left" size={16} /></button>
              <Select size="sm" value={M.mensualMonth || CURRENT_MONTH_KEY} style={{ minWidth: 132 }}
                options={monthSelectOptsDesc()}
                onChange={v => dispatch({ type: "MED/SET_MENSUAL_MONTH", month: v })} />
              <button className="rc-med-navbtn" title="Mes siguiente"
                disabled={months.indexOf(M.mensualMonth || CURRENT_MONTH_KEY) >= months.length - 1}
                onClick={() => shiftMensualMonth(1)}><Icon name="chevron_right" size={16} /></button>
            </div>
          ) : (
            <>
              <Select size="sm" value={isCustom ? "custom" : M.period} style={{ minWidth: 160 }}
                options={MED_PERIOD_OPTS} onChange={setPeriodSel} />
              {isCustom && (
                <>
                  <Select size="sm" value={custom.start} style={{ minWidth: 108 }} options={monthSelectOptsDesc()} onChange={v => setCustom("start", v)} />
                  <span className="rc-med-tb-label">—</span>
                  <Select size="sm" value={custom.end} style={{ minWidth: 108 }} options={monthSelectOptsDesc()} onChange={v => setCustom("end", v)} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Exportar a Excel (XLSX) — Detalle + Totales por mes
// ============================================================
function medExportExcel(M, records, dispatch) {
  if (typeof XLSX === "undefined") {
    dispatch && dispatch({ type: "TOAST/SHOW", toast: { kind: "error", title: "No se pudo exportar", body: "Librería XLSX no disponible." } });
    return;
  }
  const suc = M.selSucursal, type = M.selType;
  const meters = metersFor(M, suc, type);
  const monthsView = periodToMonthKeys(M.period);
  const u = medUnit(type);
  const typeLbl = MED_TYPES[type] ? MED_TYPES[type].label : type;

  // Hoja Detalle: una fila por (medidor, mes)
  const detHead = ["Sucursal", "Tipo", "Medidor", "N°", "Mes", "Lectura", "Consumo", "Unidad", "Costo", "Estado pago", "Factura", "Pago"];
  const detRows = [detHead];
  meters.forEach(m => {
    monthsView.forEach(mk => {
      const lect = meterReadingFor(M.readings, m.id, mk);
      const cons = consumoFor(M.readings, m.id, mk);
      const costo = costoFor(M.readings, M.prices, m, mk);
      const d = M.docs[m.id + "__" + mk] || {};
      detRows.push([
        suc, typeLbl, m.nombre, m.numero || "", monthLabelShort(mk),
        lect == null ? "" : lect,
        cons == null ? "" : cons, u,
        costo == null ? "" : Math.round(costo),
        PAY_LABEL[payStatus(M.docs, m.id, mk)],
        (d.factura && d.factura.link) || "",
        (d.pago && d.pago.link) || "",
      ]);
    });
  });

  // Hoja Totales por mes
  const totRows = [["Mes", "Total medidores", "Total boleta", "Diferencia"]];
  monthsView.forEach(mk => {
    const t = monthTotals(meters, M.readings, M.prices, records, suc, type, mk);
    totRows.push([
      monthLabelShort(mk),
      t.totalMedidores == null ? "" : Math.round(t.totalMedidores),
      t.totalBoleta == null ? "" : Math.round(t.totalBoleta),
      t.diferencia == null ? "" : Math.round(t.diferencia),
    ]);
  });

  const wb = XLSX.utils.book_new();
  const wsDet = XLSX.utils.aoa_to_sheet(detRows);
  wsDet["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 13 }, { wch: 30 }, { wch: 30 }];
  // Hipervínculos en columnas Factura (K=idx10) y Pago (L=idx11)
  for (let r = 1; r < detRows.length; r++) {
    [["K", 10], ["L", 11]].forEach(([col, ci]) => {
      const url = detRows[r][ci];
      const ref = col + (r + 1);
      if (url && wsDet[ref]) wsDet[ref].l = { Target: url, Tooltip: "Abrir documento" };
    });
  }
  const wsTot = XLSX.utils.aoa_to_sheet(totRows);
  wsTot["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, wsDet, "Detalle");
  XLSX.utils.book_append_sheet(wb, wsTot, "Totales por mes");
  const safe = (s) => String(s || "").replace(/[^\wáéíóúñÁÉÍÓÚÑ-]+/g, "-");
  XLSX.writeFile(wb, "Medidores_" + safe(suc) + "_" + safe(typeLbl) + ".xlsx");
}

// ============================================================
// Descargable "Estado de medidores" — reporte HTML (print → PDF)
// Usa el período seleccionado en el toolbar. Inspirado en el diseño de referencia.
// ============================================================
function medDownloadReport({ suc, type, meters, M, records }) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const unit = medUnit(type);
  const typeLbl = MED_TYPES[type] ? MED_TYPES[type].label : type;
  const typeIcon = { electricidad: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>', agua: '<path d="M12 2.69 5.64 9.06a9 9 0 1 0 12.72 0L12 2.69z"></path>', combustible: '<path d="M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v18z"></path><line x1="3" y1="10" x2="15" y2="10"></line>' }[type] || "";
  const rep = periodToMonthKeys(M.period);               // respeta el período seleccionado (incl. personalizado)
  const last = rep[rep.length - 1];
  const perLbl = rep.length ? (monthLabelShort(rep[0]) + " – " + monthLabelShort(last)) : "—";
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const fechaCorta = pad(now.getDate()) + "/" + pad(now.getMonth() + 1) + "/" + now.getFullYear();
  const fechaLarga = now.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }) + " · " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + " hrs";

  // Datos por medidor
  const rows = meters.map((m, i) => ({
    m, color: medColorAt(i),
    cells: rep.map(mk => ({
      lect: meterReadingFor(M.readings, m.id, mk),
      cons: consumoFor(M.readings, m.id, mk),
      costo: costoFor(M.readings, M.prices, m, mk),
      pay: payStatus(M.docs, m.id, mk),
    })),
  }));
  // Totales por mes
  const totCons = rep.map((mk, ci) => rows.reduce((a, r) => a + (r.cells[ci].cons == null ? 0 : r.cells[ci].cons), 0));
  const totCosto = rep.map((mk, ci) => rows.reduce((a, r) => a + (r.cells[ci].costo == null ? 0 : r.cells[ci].costo), 0));
  const anyCons = rep.map((mk, ci) => rows.some(r => r.cells[ci].cons != null));
  const consUlt = totCons[totCons.length - 1] || 0;
  const consPrev = totCons.length > 1 ? totCons[totCons.length - 2] : 0;
  const costoUlt = totCosto[totCosto.length - 1] || 0;
  const acumulado = totCosto.reduce((a, b) => a + b, 0);
  const consValidos = totCons.filter((v, i) => anyCons[i]);
  const promedio = consValidos.length ? consValidos.reduce((a, b) => a + b, 0) / consValidos.length : 0;
  const varPct = consPrev > 0 ? ((consUlt - consPrev) / consPrev) * 100 : null;
  const boletaTotal = rep.reduce((a, mk) => { const b = boletaFor(records, suc, type, mk); return a + (b == null ? 0 : b); }, 0);
  const totalPeriodo = acumulado;
  const dif = boletaTotal > 0 ? (totalPeriodo - boletaTotal) : null;
  const difPct = (dif != null && boletaTotal > 0) ? (dif / boletaTotal) * 100 : null;

  // Gráfico
  const W = 720, H = 250, padL = 60, padR = 30, padT = 18, padB = 38;
  const n = rep.length;
  const allV = rows.flatMap(r => r.cells.map(c => c.cons)).filter(v => v != null);
  const top = allV.length && Math.max(...allV) > 0 ? Math.max(...allV) * 1.15 : 10;
  const X = i => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const Y = v => padT + (1 - v / top) * (H - padT - padB);
  const gridY = [0, 0.25, 0.5, 0.75, 1];
  const chartLines = rows.map(r => {
    const pts = r.cells.map((c, i) => (c.cons == null ? null : [X(i), Y(c.cons)])).filter(Boolean);
    if (!pts.length) return "";
    const d = (typeof smoothPath === "function") ? smoothPath(pts) : pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
    const dots = pts.map(p => `<circle cx="${p[0]}" cy="${p[1].toFixed(1)}" r="3.5" fill="#fff" stroke="${r.color}" stroke-width="2"></circle>`).join("");
    return `<path d="${d}" fill="none" stroke="${r.color}" stroke-width="2.5" stroke-linecap="round"></path>${dots}`;
  }).join("");
  const gridSvg = gridY.map(g => { const gy = padT + g * (H - padT - padB); return `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="${g === 1 ? "#E4E7EC" : "#F2F4F7"}"></line><text x="${padL - 8}" y="${gy + 3}" text-anchor="end" font-size="10" fill="#919599">${fmtNum(top * (1 - g))}</text>`; }).join("");
  const xSvg = rep.map((mk, i) => `<text x="${X(i)}" y="${H - 12}" text-anchor="middle" font-size="11" font-weight="600" fill="#475467">${monthLabelShort(mk)}</text>`).join("");
  const legend = rows.map(r => `<span style="display:inline-flex;align-items:center;gap:7px;"><span style="width:16px;height:3px;border-radius:2px;background:${r.color};display:inline-block;"></span>${esc(r.m.nombre)}${r.m.numero ? " · N° " + esc(r.m.numero) : ""}</span>`).join("");

  const payChip = (st) => {
    const S = { pagado: ["#ECFDF3", "#027A48", "#12B76A", "Pagado"], facturado: ["#E6F4FB", "#0069A6", "#0069A6", "Facturado"], "por-facturar": ["#FFFAEB", "#B54708", "#F79009", "Por facturar"] }[st];
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:600;background:${S[0]};color:${S[1]};"><span style="width:6px;height:6px;border-radius:999px;background:${S[2]};"></span>${S[3]}</span>`;
  };
  const money = (v) => v == null ? "—" : fmtCLP(v);
  const num = (v) => v == null ? "—" : fmtNum(v);

  const th = (label, extra) => `<th colspan="3" style="text-align:center;padding:6px 8px;font-size:10.5px;font-weight:700;color:#0069A6;background:#E6F4FB;border-left:1px solid #E4E7EC;">${label}</th>`;
  const subTh = () => `<th style="text-align:right;padding:6px 8px;font-size:9.5px;font-weight:600;color:#727272;border-bottom:2px solid #0069A6;border-left:1px solid #E4E7EC;">Lectura</th><th style="text-align:right;padding:6px 8px;font-size:9.5px;font-weight:600;color:#727272;border-bottom:2px solid #0069A6;">Consumo</th><th style="text-align:right;padding:6px 8px;font-size:9.5px;font-weight:600;color:#727272;border-bottom:2px solid #0069A6;">Costo</th>`;

  const detBody = rows.map(r => `<tr>
    <td style="text-align:left;padding:9px 10px;border-bottom:1px solid #EEE;"><span style="font-weight:700;color:#101828;">${esc(r.m.nombre)}</span>${r.m.numero ? ` <span style="color:#919599;">· N° ${esc(r.m.numero)}</span>` : ""}</td>
    ${r.cells.map(c => `<td style="text-align:right;padding:9px 8px;border-bottom:1px solid #EEE;color:#667085;border-left:1px solid #E4E7EC;">${num(c.lect)}</td><td style="text-align:right;padding:9px 8px;border-bottom:1px solid #EEE;font-weight:600;color:#101828;">${num(c.cons)}</td><td style="text-align:right;padding:9px 8px;border-bottom:1px solid #EEE;color:#344054;">${money(c.costo)}</td>`).join("")}
  </tr>`).join("");
  const detTot = `<tr style="background:#F9FAFB;"><td style="text-align:left;padding:10px;font-weight:700;color:#101828;border-top:2px solid #0069A6;">Totales</td>${rep.map((mk, ci) => `<td style="text-align:right;padding:10px 8px;color:#919599;border-top:2px solid #0069A6;border-left:1px solid #E4E7EC;">—</td><td style="text-align:right;padding:10px 8px;font-weight:700;color:#0069A6;border-top:2px solid #0069A6;">${anyCons[ci] ? fmtNum(totCons[ci]) : "—"}</td><td style="text-align:right;padding:10px 8px;font-weight:700;color:#101828;border-top:2px solid #0069A6;">${fmtCLP(totCosto[ci])}</td>`).join("")}</tr>`;

  const payHead = rep.map(mk => `<th style="text-align:center;padding:8px;font-size:10.5px;font-weight:700;color:#344054;border-bottom:1px solid #E4E7EC;">${monthLabelShort(mk)}</th>`).join("");
  const payBody = rows.map(r => `<tr><td style="text-align:left;padding:9px 10px;border-bottom:1px solid #EEE;font-weight:700;color:#101828;">${esc(r.m.nombre)}${r.m.numero ? ` <span style="color:#919599;font-weight:400;">· N° ${esc(r.m.numero)}</span>` : ""}</td>${r.cells.map(c => `<td style="text-align:center;padding:9px 8px;border-bottom:1px solid #EEE;">${payChip(c.pay)}</td>`).join("")}</tr>`).join("");

  const difChip = dif == null
    ? `<span style="font-size:13px;font-weight:700;color:#919599;">Sin boleta registrada</span>`
    : `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:700;background:${dif < 0 ? "#FEF3F2" : "#ECFDF3"};color:${dif < 0 ? "#B42318" : "#027A48"};">${dif > 0 ? "+" : ""}${fmtCLP(dif)}${difPct != null ? " · " + (difPct > 0 ? "+" : "") + difPct.toFixed(2).replace(".", ",") + "%" : ""}</span>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Estado de medidores · ${esc(suc)}</title>
<style>
  :root{--rl-font-display:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;--rl-font-body:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
  *{box-sizing:border-box;} body{margin:0;background:#ece8dd;font-family:var(--rl-font-body);color:#313334;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:794px;min-height:1123px;max-width:100%;margin:20px auto;background:#fff;border-radius:6px;padding:30px 34px;box-shadow:0 8px 40px rgba(0,0,0,.12);}
  h1{font:700 24px/30px var(--rl-font-display);letter-spacing:-.02em;color:#101828;margin:0;}
  .btnbar{width:794px;max-width:100%;margin:16px auto 0;display:flex;gap:8px;justify-content:flex-end;}
  .btnbar button{font:600 13px var(--rl-font-display);border:none;border-radius:8px;padding:9px 16px;cursor:pointer;background:#0069A6;color:#fff;}
  .btnbar button.ghost{background:#fff;color:#0069A6;border:1px solid #0069A6;}
  .btnbar button[disabled]{opacity:.5;cursor:default;}
  table{width:100%;border-collapse:collapse;}
  @page{size:A4 portrait;margin:0;}
  @media print{ body{background:#fff;} .page{box-shadow:none;margin:0;width:210mm;min-height:auto;border-radius:0;} .noprint{display:none!important;} }
</style></head><body>
<div class="btnbar noprint"><button class="ghost" onclick="window.print()">Imprimir</button><button id="dlbtn" disabled onclick="dlPDF()">Cargando…</button></div>
<div class="page">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;">
    <div>
      <h1>Estado de medidores</h1>
    </div>
    <div style="display:inline-flex;align-items:center;gap:8px;background:#E6F4FB;color:#0069A6;border-radius:999px;padding:8px 16px;font-weight:700;font-size:13px;white-space:nowrap;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${typeIcon}</svg>${esc(typeLbl)}
    </div>
  </div>
  <div style="display:flex;margin-top:12px;border:1px solid #E4E7EC;border-radius:10px;overflow:hidden;background:#F9FAFB;">
    ${[["Tipo de consumo", esc(typeLbl)], ["Periodo del reporte", perLbl], ["Medidores", meters.length + " seleccionado" + (meters.length === 1 ? "" : "s")], ["Fecha de generación", fechaCorta]].map((c, i) => `${i ? '<div style="width:1px;background:#E4E7EC;"></div>' : ""}<div style="flex:1;padding:12px 16px;"><div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#919599;font-weight:700;">${c[0]}</div><div style="font-size:13px;font-weight:600;color:#101828;margin-top:3px;">${c[1]}</div></div>`).join("")}
  </div>
  <div style="display:flex;gap:10px;margin-top:14px;">
    <div style="flex:1.3;background:#0069A6;color:#fff;border-radius:10px;padding:15px 16px;"><div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.82);">Consumo último mes</div><div style="font:700 27px/1.1 var(--rl-font-display);margin-top:9px;">${fmtNum(consUlt)}<span style="font-size:14px;font-weight:600;margin-left:4px;">${unit}</span></div><div style="font-size:11px;color:rgba(255,255,255,.82);margin-top:6px;">${last ? monthLabelShort(last) : "—"}</div></div>
    <div style="flex:1;background:#fff;border:1px solid #E4E7EC;border-radius:10px;padding:15px 16px;"><div style="font-size:11px;font-weight:600;color:#727272;">Costo último mes</div><div style="font:700 21px/1.1 var(--rl-font-display);color:#101828;margin-top:9px;">${fmtCLP(costoUlt)}</div><div style="font-size:11px;color:#919599;margin-top:6px;">${last ? monthLabelShort(last) : "—"}</div></div>
    <div style="flex:1;background:#fff;border:1px solid #E4E7EC;border-radius:10px;padding:15px 16px;"><div style="font-size:11px;font-weight:600;color:#727272;">Promedio mensual</div><div style="font:700 21px/1.1 var(--rl-font-display);color:#101828;margin-top:9px;">${fmtNum(promedio)}<span style="font-size:12px;font-weight:600;margin-left:3px;">${unit}</span></div><div style="font-size:11px;color:#919599;margin-top:6px;">Consumo · ${perLbl}</div></div>
    <div style="flex:1;background:#fff;border:1px solid #E4E7EC;border-radius:10px;padding:15px 16px;"><div style="font-size:11px;font-weight:600;color:#727272;">Costo acumulado</div><div style="font:700 21px/1.1 var(--rl-font-display);color:#101828;margin-top:9px;">${fmtCLP(acumulado)}</div><div style="font-size:11px;color:#919599;margin-top:6px;">Total del periodo</div></div>
    <div style="flex:1;background:#fff;border:1px solid #E4E7EC;border-radius:10px;padding:15px 16px;"><div style="font-size:11px;font-weight:600;color:#727272;">Variación vs mes ant.</div><div style="font:700 21px/1.1 var(--rl-font-display);color:${varPct == null ? "#919599" : varPct > 0 ? "#B54708" : "#027A48"};margin-top:9px;">${varPct == null ? "—" : (varPct > 0 ? "+" : "") + varPct.toFixed(2).replace(".", ",") + "%"}</div><div style="font-size:11px;color:#919599;margin-top:6px;">Consumo mensual</div></div>
  </div>
  <div style="margin-top:16px;background:#fff;border:1px solid #E4E7EC;border-radius:10px;padding:16px 20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div style="font:600 15px/1.3 var(--rl-font-display);color:#101828;">Consumo mensual por medidor <span style="font-weight:500;color:#919599;">(${unit})</span></div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:11.5px;font-weight:600;color:#475467;">${legend}</div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;margin-top:10px;overflow:visible;">${gridSvg}${xSvg}${chartLines}</svg>
  </div>
  <div style="margin-top:16px;">
    <div style="font:600 15px/1.3 var(--rl-font-display);color:#101828;margin-bottom:9px;">Detalle por medidor</div>
    <table style="font-size:10.5px;"><thead>
      <tr><th rowspan="2" style="text-align:left;vertical-align:bottom;padding:8px 10px;font-size:11px;font-weight:700;color:#344054;border-bottom:2px solid #0069A6;">Medidor</th>${rep.map(mk => th(monthLabelShort(mk))).join("")}</tr>
      <tr>${rep.map(() => subTh()).join("")}</tr>
    </thead><tbody>${detBody}${detTot}</tbody></table>
    <div style="font-size:10px;color:#919599;margin-top:8px;">Lectura y consumo en ${unit} · Costos en pesos chilenos (CLP).</div>
  </div>
  <div style="margin-top:16px;">
    <div style="font:600 15px/1.3 var(--rl-font-display);color:#101828;margin-bottom:9px;">Estado de pagos</div>
    <table style="font-size:10.5px;"><thead><tr><th style="text-align:left;padding:8px 10px;font-size:11px;font-weight:700;color:#344054;border-bottom:1px solid #E4E7EC;">Medidor</th>${payHead}</tr></thead><tbody>${payBody}</tbody></table>
  </div>
  <div style="border-top:1px solid #E4E7EC;padding-top:8px;margin-top:14px;display:flex;justify-content:space-between;font-size:10px;color:#919599;"><span>Documento generado automáticamente por Recylink Labs · Módulo de Medidores</span><span>Generado el ${fechaLarga}</span></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
<script>
  var _btn = document.getElementById('dlbtn');
  function _ready(){ return window.html2canvas && window.jspdf && window.jspdf.jsPDF; }
  (function wait(){ if(_ready()){ _btn.disabled=false; _btn.textContent='Descargar PDF'; } else setTimeout(wait,150); })();
  function dlPDF(){
    if(!_ready()){ alert('Aún cargando la librería, reintenta en un segundo.'); return; }
    var el=document.querySelector('.page');
    _btn.disabled=true; _btn.textContent='Generando…';
    html2canvas(el,{scale:2,backgroundColor:'#ffffff'}).then(function(canvas){
      var pdf=new window.jspdf.jsPDF('p','mm','a4');
      var pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
      var iw=pw, ih=canvas.height*pw/canvas.width, x=0, y=0;
      if(ih>ph){ ih=ph; iw=canvas.width*ph/canvas.height; x=(pw-iw)/2; }
      pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',x,y,iw,ih);
      pdf.save('Estado-de-medidores.pdf');
      _btn.disabled=false; _btn.textContent='Descargar PDF';
    }).catch(function(e){ alert('Error generando PDF: '+e); _btn.disabled=false; _btn.textContent='Descargar PDF'; });
  }
</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Habilita las ventanas emergentes para descargar el reporte."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ============================================================
// Vista principal
// ============================================================
const MedidoresView = () => {
  const { state, dispatch } = useApp();
  const M = state.medidores;
  const sucNames = activeSucNames(state);
  const [manage, setManage] = React.useState(false);

  const suc = M.selSucursal;
  const type = M.selType;
  const ready = suc && type;
  const meters = ready ? metersFor(M, suc, type) : [];
  const monthsView = periodToMonthKeys(M.period);

  return (
    <div>
      <SectionHead
        eyebrow="Medidores"
        title="Lecturas de medidores"
        sub="Registra lecturas físicas por medidor, calcula consumo y costo, y compáralos con el consumo global registrado."
        right={
          <div className="prt-row" style={{ gap: 8 }}>
            {ready && meters.length > 0 && <Btn icon="file_download" onClick={() => medExportExcel(M, state.records, dispatch)}>Excel</Btn>}
            <Btn icon="smartphone" onClick={() => dispatch({ type: "NAVIGATE", view: "medidores-movil" })}>Registro móvil</Btn>
            {ready && <Btn kind="primary" icon="tune" onClick={() => setManage(true)}>Gestionar medidores</Btn>}
          </div>
        }
      />

      {/* Tabs en su propia fila (no comparten fila con los filtros) */}
      <div className="rc-med-tabsrow">
        <MedTabs value={M.tab} onChange={t => dispatch({ type: "MED/SET_TAB", tab: t })} />
      </div>

      {/* Filtros */}
      <MedToolbar />

      {sucNames.length === 0 ? (
        <EmptyState
          icon="apartment"
          title="No hay sucursales activas"
          body="Configura al menos una sucursal en Configuración para registrar medidores."
          actions={<Btn kind="primary" icon="settings" onClick={() => dispatch({ type: "NAVIGATE", view: "config" })}>Ir a Configuración</Btn>}
        />
      ) : !ready ? (
        <EmptyState icon="speed" title="Selecciona sucursal y tipo" body="Elige una sucursal y un tipo de consumo en la barra superior para ver y registrar sus medidores." />
      ) : M.loading ? (
        <div className="rc-med-loading"><span className="prt-spinner" /><span>Cargando medidores…</span></div>
      ) : meters.length === 0 ? (
        <EmptyState
          icon="speed"
          title="Sin medidores configurados"
          body={"Aún no hay medidores activos para " + suc + " · " + (MED_TYPES[type] ? MED_TYPES[type].label : type) + "."}
          actions={<Btn kind="primary" icon="add" onClick={() => setManage(true)}>Crear medidor</Btn>}
        />
      ) : (
        <div style={{ marginTop: 16 }}>
          {M.tab === "resumen" && <ResumenTab suc={suc} type={type} meters={meters} monthsView={monthsView} />}
          {M.tab === "matriz"  && <MatrizTab  suc={suc} type={type} meters={meters} monthsView={monthsView} />}
          {M.tab === "mensual" && <MensualTab suc={suc} type={type} meters={meters} />}
          {M.tab === "pagos"   && <PagosTab   meters={meters} monthsView={monthsView} />}

          {(M.tab === "matriz" || M.tab === "pagos") && (
            <div className="prt-hint" style={{ fontSize: 12, marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
              <Icon name="info" size={14} />
              Período: {periodLabel(M.period)}. El consumo del primer mes de cada medidor no se calcula (solo lectura inicial).
            </div>
          )}
        </div>
      )}

      {manage && <MedManageModal suc={suc} type={type} onClose={() => setManage(false)} />}
    </div>
  );
};

// ============================================================
// Vista móvil — registro rápido de lecturas
// ============================================================
const MedidoresMobileView = () => {
  const { state, dispatch } = useApp();
  const M = state.medidores;
  const sucNames = activeSucNames(state);
  const [suc, setSuc] = React.useState(M.selSucursal || "");
  const [type, setType] = React.useState(M.selType || "");
  const [month, setMonth] = React.useState(M.mensualMonth || CURRENT_MONTH_KEY);
  const ready = suc && type;
  const meters = ready ? metersFor(M, suc, type) : [];

  return (
    <div className="rc-med-mobile">
      <div className="rc-med-mobile-head">
        <Btn size="sm" kind="ghost" icon="arrow_back" onClick={() => dispatch({ type: "NAVIGATE", view: "medidores" })}>Volver</Btn>
        <span className="prt-eyebrow">Registro móvil</span>
      </div>
      <h1 className="prt-h1" style={{ margin: "4px 0 14px" }}>Cargar lecturas</h1>

      <Field label="Sucursal"><Select value={suc} onChange={setSuc} options={sucNames.map(n => ({ value: n, label: n }))} placeholder="Sucursal" /></Field>
      <Field label="Tipo de consumo"><Select value={type} onChange={setType} options={MED_TYPE_OPTS} placeholder="Tipo" /></Field>
      <Field label="Mes"><Select value={month} onChange={setMonth} options={monthSelectOpts()} /></Field>

      {!ready ? (
        <EmptyState icon="speed" title="Elige sucursal, tipo y mes" body="Selecciona arriba para ver los medidores a registrar." />
      ) : M.loading ? (
        <div className="rc-med-loading"><span className="prt-spinner" /><span>Cargando medidores…</span></div>
      ) : meters.length === 0 ? (
        <EmptyState icon="speed" title="Sin medidores" body="No hay medidores activos para esta selección. Créalos desde la vista de escritorio." />
      ) : (
        <div className="rc-med-mobile-list">
          {meters.map(m => {
            const cons = consumoFor(M.readings, m.id, month);
            const u = medUnit(type);
            const first = meterReadingFor(M.readings, m.id, month) != null && isFirstReading(M.readings, m.id, month);
            return (
              <div key={m.id} className="rc-med-mobile-item">
                <div className="rc-med-mobile-item-head">
                  <strong>{m.nombre}</strong>
                  {m.numero && <span className="rc-med-num">N° {m.numero}</span>}
                </div>
                <div className="rc-med-mobile-item-body">
                  <Field label="Lectura" style={{ flex: 1, marginBottom: 0 }}>
                    <LecturaCell meterId={m.id} month={month} />
                  </Field>
                  <div className="rc-med-mobile-cons">
                    {first ? <span className="rc-med-hint">inicial</span>
                      : cons == null ? <span className="rc-med-hint">—</span>
                      : <span>{fmtNum(cons)} {u}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="prt-hint" style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="check" size={14} /> Las lecturas se guardan automáticamente.
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MedidoresView, MedidoresMobileView });
