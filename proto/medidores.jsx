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
                  <Select size="sm" value={custom.start} style={{ minWidth: 108 }} options={monthSelectOpts()} onChange={v => setCustom("start", v)} />
                  <span className="rc-med-tb-label">—</span>
                  <Select size="sm" value={custom.end} style={{ minWidth: 108 }} options={monthSelectOpts()} onChange={v => setCustom("end", v)} />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Derecha: tabs */}
      <MedTabs value={M.tab} onChange={t => dispatch({ type: "MED/SET_TAB", tab: t })} />
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

      {/* Toolbar unificado: filtros (izq) + tabs (der) */}
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
      ) : meters.length === 0 ? (
        <EmptyState
          icon="speed"
          title="Sin medidores configurados"
          body={"Aún no hay medidores activos para " + suc + " · " + (MED_TYPES[type] ? MED_TYPES[type].label : type) + "."}
          actions={<Btn kind="primary" icon="add" onClick={() => setManage(true)}>Crear medidor</Btn>}
        />
      ) : (
        <div style={{ marginTop: 16 }}>
          {M.tab === "matriz"  && <MatrizTab  suc={suc} type={type} meters={meters} monthsView={monthsView} />}
          {M.tab === "mensual" && <MensualTab suc={suc} type={type} meters={meters} />}
          {M.tab === "pagos"   && <PagosTab   meters={meters} monthsView={monthsView} />}

          {M.tab !== "mensual" && (
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
