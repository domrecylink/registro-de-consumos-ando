// Manual flow — multi-entry: shared (fecha + sucursal) + N entries.

// ---- Validation -----
function validateManual(d, state) {
  const errors = { entries: {} };
  if (!d.date) errors.date = "Indica la fecha.";
  if (!d.sucursal) errors.sucursal = "Elige una sucursal.";
  (d.entries || []).forEach((e) => {
    const ee = {};
    if (!e.type) ee.type = "Indica el tipo.";
    if (e.type && getSubcatsFor(state, e.type, d.sucursal).length > 0 && !e.subcat) ee.subcat = "Requiere subcategoría.";
    if (!e.cantidad) ee.cantidad = "Ingresa la cantidad.";
    else if (isNaN(parseFloat(e.cantidad)) || parseFloat(e.cantidad) <= 0) ee.cantidad = "Debe ser > 0.";
    if (e.costo && (isNaN(parseFloat(e.costo)) || parseFloat(e.costo) < 0)) ee.costo = "Debe ser ≥ 0.";
    if (Object.keys(ee).length) errors.entries[e.id] = ee;
  });
  // Compact: drop empty entries map
  const hasShared = errors.date || errors.sucursal;
  const hasEntry = Object.keys(errors.entries).length > 0;
  if (!hasShared && !hasEntry) return {};
  return errors;
}

// Detect atypical: ±40% vs average of same sucursal/type/subcat
function detectAnomaly(records, sucursal, entry) {
  if (!sucursal || !entry.type || !entry.cantidad) return null;
  const same = records.filter(r =>
    r.estado !== "eliminada"
    && r.sucursal === sucursal
    && r.type === entry.type
    && (entry.subcat ? r.subcat === entry.subcat : true)
  );
  if (same.length < 3) return null;
  const avg = same.reduce((a, r) => a + r.cantidad, 0) / same.length;
  const cur = parseFloat(entry.cantidad);
  const pct = ((cur - avg) / avg) * 100;
  if (Math.abs(pct) >= 40) {
    return { pct: Math.round(pct), avg: Math.round(avg), direction: pct > 0 ? "up" : "down" };
  }
  return null;
}

// =========================================================
// FacturaUpload — optional file picker
// =========================================================
const FacturaUpload = ({ filename, onPick }) => {
  const inputRef = React.useRef(null);
  return (
    <Field label="Factura o boleta (opcional)" helper="PDF o imagen — se adjunta a este consumo.">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; onPick(f || null); e.target.value = ""; }}
      />
      {filename ? (
        <div className="prt-row" style={{
          gap: 10, padding: "10px 14px",
          background: "var(--rl-gray-50)",
          border: "1.5px solid var(--rl-gray-200)",
          borderRadius: 8,
        }}>
          <Icon name="picture_as_pdf" size={18} style={{ color: "var(--rl-primary-900)" }} />
          <span style={{ flex: 1, font: "500 13px/1 var(--rl-font-body)", color: "var(--rl-gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{filename}</span>
          <Btn size="sm" kind="ghost" onClick={() => inputRef.current?.click()}>Cambiar</Btn>
          <Btn size="sm" kind="ghost" onClick={() => onPick(null)} icon="close" title="Quitar archivo"></Btn>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 16px",
            background: "#FFF",
            border: "1.5px dashed var(--rl-gray-300)",
            borderRadius: 8,
            color: "var(--rl-gray-600)",
            font: "500 13px/1 var(--rl-font-body)",
            transition: "border-color .12s, background .12s, color .12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--rl-primary-300)"; e.currentTarget.style.color = "var(--rl-primary-900)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rl-gray-300)"; e.currentTarget.style.color = "var(--rl-gray-600)"; }}
        >
          <Icon name="cloud_upload" size={18} />
          <span>Adjuntar factura o boleta</span>
        </button>
      )}
    </Field>
  );
};

// =========================================================
// EntryCard — one consumption in the batch
// =========================================================
const EntryCard = ({ entry, index, total, sucursal, errors, onRemove }) => {
  const { state, dispatch } = useApp();
  const setField = (field, value) => dispatch({ type: "MANUAL/SET_ENTRY_FIELD", entryId: entry.id, field, value });

  const subcatOptions = entry.type ? getSubcatsFor(state, entry.type, sucursal) : [];
  const typeRequiresSubcat = entry.type && subcatOptions.length > 0;
  const providerOptions = getProviderOptionsFor(state, sucursal, entry.type);
  const t = entry.type ? TYPES[entry.type] : null;
  // Unidad efectiva: combustible usa la unidad configurada de la subcategoría.
  const entryUnit = entry.type ? getEntryUnit(state, sucursal, entry.type, entry.subcat) : "";
  const unitPending = entry.type === "combustible" && typeRequiresSubcat && !entry.subcat;
  const anomaly = detectAnomaly(state.records, sucursal, entry);
  const ee = errors || {};

  const onPickFactura = (file) => {
    try {
      if (!window.__rcManualFacturas) window.__rcManualFacturas = {};
      if (file) window.__rcManualFacturas[entry.id] = { file, name: file.name };
      else delete window.__rcManualFacturas[entry.id];
    } catch (e) {}
    setField("factura", file ? file.name : "");
  };

  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="prt-spread" style={{ marginBottom: 14, alignItems: "center" }}>
        <div className="prt-row" style={{ gap: 10 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7,
            background: "var(--rl-primary-50)", color: "var(--rl-primary-900)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            font: "700 13px/1 var(--rl-font-display)",
          }}>{index + 1}</span>
          <div className="prt-h4">Consumo {index + 1}</div>
          {t && <Chip size="sm"><TypeIndicator type={entry.type} /> {t.label}</Chip>}
        </div>
        {total > 1 && (
          <Btn size="sm" kind="ghost" icon="delete" onClick={onRemove} title="Quitar este consumo">Quitar</Btn>
        )}
      </div>

      <div className="prt-stack-md">
        {/* Tipo + Subcat */}
        <div style={{ display: "grid", gridTemplateColumns: typeRequiresSubcat ? "1fr 1fr" : "1fr", gap: 16 }}>
          <Field label="Tipo de consumo" required error={ee.type}>
            <Select
              value={entry.type}
              onChange={v => setField("type", v)}
              options={Object.values(TYPES).map(tt => ({ value: tt.id, label: `${tt.label} (${tt.unit})` }))}
              placeholder="Elige un tipo…"
              error={!!ee.type}
            />
          </Field>
          {typeRequiresSubcat && (
            <Field label="Subcategoría" required error={ee.subcat}>
              <Select
                value={entry.subcat}
                onChange={v => setField("subcat", v)}
                options={subcatOptions.map(s => ({ value: s.id, label: s.unidad ? `${s.label} · ${s.unidad}` : s.label }))}
                placeholder="Elige una subcategoría…"
                error={!!ee.subcat}
              />
            </Field>
          )}
        </div>

        {/* Cantidad + Costo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field
            label="Cantidad consumida" required
            error={ee.cantidad}
            helper={
              !entry.type ? "Elige primero el tipo."
              : (entry.type === "combustible" && !sucursal) ? "Elige primero la sucursal."
              : unitPending ? "Elige la subcategoría para fijar la unidad."
              : `Unidad: ${entryUnit}`
            }
          >
            <Input
              value={entry.cantidad}
              onChange={v => setField("cantidad", v)}
              placeholder="0"
              suffix={unitPending ? "" : entryUnit}
              error={!!ee.cantidad}
            />
          </Field>
          <Field label="Costo total (opcional)" error={ee.costo}>
            <Input
              value={entry.costo}
              onChange={v => setField("costo", v)}
              placeholder="0"
              suffix="CLP"
              error={!!ee.costo}
            />
          </Field>
        </div>

        {/* Proveedor + Notas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Proveedor (opcional)">
            <Select
              value={entry.provider}
              onChange={v => setField("provider", v)}
              options={entry.type ? providerOptions : []}
              placeholder="Elige un proveedor…"
            />
          </Field>
          <Field label="Notas (opcional)" helper={`${(entry.notes || "").length}/120`}>
            <Input
              value={entry.notes}
              onChange={v => setField("notes", v.slice(0, 120))}
              placeholder="Ej. Lectura tomada el día 28"
            />
          </Field>
        </div>

        {/* Factura */}
        <FacturaUpload filename={entry.factura || ""} onPick={onPickFactura} />

        {/* Anomaly */}
        {anomaly && (
          <div style={{
            padding: 12, borderRadius: 10,
            background: "var(--rl-warning-50)",
            border: "1px solid var(--rl-warning-200)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <Icon name="warning" size={18} style={{ color: "var(--rl-warning-700)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ font: "600 12px/16px var(--rl-font-display)", color: "var(--rl-warning-700)" }}>
                Consumo {anomaly.direction === "up" ? "más alto" : "más bajo"} de lo habitual
              </div>
              <div className="prt-hint" style={{ fontSize: 12, marginTop: 2, color: "var(--rl-warning-800)" }}>
                {anomaly.pct > 0 ? "+" : ""}{anomaly.pct}% vs. promedio {fmtNum(anomaly.avg)} {entryUnit} en {sucursal}.
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// =========================================================
// FORM
// =========================================================
const ManualForm = () => {
  const { state, dispatch } = useApp();
  const d = state.manualDraft;
  const errs = state.manualErrors || {};
  const sharedSucursales = activeSucNames(state);

  const setShared = (field, value) => dispatch({ type: "MANUAL/SET_SHARED_FIELD", field, value });

  const onContinue = () => {
    const e = validateManual(d, state);
    dispatch({ type: "MANUAL/SET_ERRORS", errors: e });
    if (Object.keys(e).length === 0) dispatch({ type: "MANUAL/GO_PREVIEW" });
  };

  return (
    <div>
      <SectionHead
        eyebrow="Registrar consumo · paso 1 de 2"
        title="Ingresa los datos del consumo"
        sub="La fecha y sucursal aplican a todos los consumos del lote. Puedes agregar varios."
        right={<Btn kind="ghost" icon="arrow_back" onClick={() => dispatch({ type: "NAVIGATE", view: "register" })}>Volver</Btn>}
      />

      <div style={{ marginBottom: 22 }}>
        <Steps items={["Datos", "Revisar", "Listo"]} current={0} />
      </div>

      {/* Shared fields */}
      <Card style={{ marginBottom: 18 }}>
        <div className="prt-eyebrow" style={{ marginBottom: 12 }}>Datos compartidos del lote</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Fecha del consumo" required error={errs.date}>
            <Input type="date" value={d.date} onChange={v => setShared("date", v)} />
          </Field>
          <Field label="Sucursal" required error={errs.sucursal}>
            <Select
              value={d.sucursal}
              onChange={v => setShared("sucursal", v)}
              options={sharedSucursales}
              placeholder="Elige una sucursal…"
              error={!!errs.sucursal}
            />
          </Field>
        </div>
      </Card>

      {/* Entries — solo después de elegir fecha + sucursal */}
      {d.date && d.sucursal ? (
        <>
          {d.entries.map((entry, i) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={i}
              total={d.entries.length}
              sucursal={d.sucursal}
              errors={errs.entries?.[entry.id]}
              onRemove={() => dispatch({ type: "MANUAL/REMOVE_ENTRY", entryId: entry.id })}
            />
          ))}

          <button
            onClick={() => dispatch({ type: "MANUAL/ADD_ENTRY" })}
            className="rc-manual-add-entry"
          >
            <Icon name="add" size={18} />
            <span>Agregar otro consumo</span>
          </button>

          <div className="prt-spread" style={{ marginTop: 22 }}>
            <Btn kind="ghost" onClick={() => { dispatch({ type: "MANUAL/RESET" }); dispatch({ type: "NAVIGATE", view: "landing" }); }}>
              Cancelar
            </Btn>
            <div className="prt-row">
              <Btn onClick={() => dispatch({ type: "MANUAL/RESET" })}>Limpiar todo</Btn>
              <Btn kind="primary" iconRight="arrow_forward" onClick={onContinue}>
                Revisar {d.entries.length} consumo{d.entries.length !== 1 ? "s" : ""}
              </Btn>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <div className="prt-row" style={{ gap: 10, alignItems: "center" }}>
            <Icon name="info" size={18} style={{ color: "var(--rl-gray-500)" }} />
            <span className="prt-muted">Completa fecha y sucursal para empezar a registrar consumos.</span>
          </div>
        </Card>
      )}
    </div>
  );
};

// =========================================================
// PREVIEW (paso 2)
// =========================================================
const ManualPreview = () => {
  const { state, dispatch } = useApp();
  const d = state.manualDraft;
  const totalCost = d.entries.reduce((a, e) => a + (parseFloat(e.costo) || 0), 0);

  return (
    <div>
      <SectionHead
        eyebrow="Registrar consumo · paso 2 de 2"
        title={`Revisa ${d.entries.length} consumo${d.entries.length !== 1 ? "s" : ""}`}
        sub="Si todo está correcto, guarda. También puedes volver a editar."
        right={<Btn kind="ghost" icon="arrow_back" onClick={() => dispatch({ type: "MANUAL/GO_FORM" })}>Editar datos</Btn>}
      />
      <div style={{ marginBottom: 22 }}>
        <Steps items={["Datos", "Revisar", "Listo"]} current={1} />
      </div>

      {/* Shared header */}
      <Card style={{ marginBottom: 14 }}>
        <div className="prt-eyebrow" style={{ marginBottom: 10 }}>Datos del lote</div>
        <div className="prt-row" style={{ gap: 28, flexWrap: "wrap" }}>
          <div>
            <div className="prt-hint">Fecha</div>
            <div style={{ font: "600 15px/1 var(--rl-font-display)", marginTop: 2 }}>{fmtDate(d.date)}</div>
          </div>
          <div>
            <div className="prt-hint">Sucursal</div>
            <div style={{ font: "600 15px/1 var(--rl-font-display)", marginTop: 2 }}>{d.sucursal}</div>
          </div>
          <div>
            <div className="prt-hint">Consumos</div>
            <div style={{ font: "600 15px/1 var(--rl-font-display)", marginTop: 2 }}>{d.entries.length}</div>
          </div>
          {totalCost > 0 && (
            <div>
              <div className="prt-hint">Costo total</div>
              <div style={{ font: "700 15px/1 var(--rl-font-display)", marginTop: 2 }}>{fmtCLP(totalCost)}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Per-entry summary */}
      <div className="prt-stack-md">
        {d.entries.map((e, i) => {
          const t = TYPES[e.type];
          const sub = e.subcat ? subcatLabel(e.type, e.subcat) : null;
          const eUnit = getEntryUnit(state, d.sucursal, e.type, e.subcat);
          const anomaly = detectAnomaly(state.records, d.sucursal, e);
          return (
            <Card key={e.id}>
              <div className="prt-row" style={{ gap: 14, alignItems: "center", marginBottom: 12 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: "var(--rl-primary-50)", color: "var(--rl-primary-900)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  font: "700 13px/1 var(--rl-font-display)",
                }}>{i + 1}</span>
                <div className="prt-row" style={{ gap: 8 }}>
                  <TypeIndicator type={e.type} /> <strong>{t?.label}</strong>
                  {sub && <Chip size="sm">{sub}</Chip>}
                </div>
                <div style={{ marginLeft: "auto", font: "700 18px/1 var(--rl-font-display)" }}>
                  {fmtNum(parseFloat(e.cantidad))} <span style={{ font: "600 13px/1 var(--rl-font-display)", color: "var(--rl-gray-500)" }}>{eUnit}</span>
                </div>
              </div>
              <div className="prt-row" style={{ gap: 28, flexWrap: "wrap" }}>
                <div><span className="prt-hint">Proveedor: </span><span>{e.provider || "—"}</span></div>
                <div><span className="prt-hint">Costo: </span><span>{e.costo ? fmtCLP(parseFloat(e.costo)) : "—"}</span></div>
                {e.factura && (
                  <div>
                    <span className="prt-hint">Factura: </span>
                    <span className="prt-row" style={{ gap: 4, display: "inline-flex" }}>
                      <Icon name="picture_as_pdf" size={14} style={{ color: "var(--rl-primary-900)" }} />
                      <span>{e.factura}</span>
                    </span>
                  </div>
                )}
                {e.notes && <div><span className="prt-hint">Notas: </span><span>{e.notes}</span></div>}
              </div>
              {anomaly && (
                <div style={{ marginTop: 10, color: "var(--rl-warning-700)", font: "500 12px/16px var(--rl-font-body)" }}>
                  ⚠ Valor atípico: {anomaly.pct > 0 ? "+" : ""}{anomaly.pct}% vs. promedio {fmtNum(anomaly.avg)} {eUnit}.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="prt-spread" style={{ marginTop: 22 }}>
        <Btn icon="arrow_back" onClick={() => dispatch({ type: "MANUAL/GO_FORM" })}>Volver a editar</Btn>
        <Btn kind="primary" icon="check" onClick={() => dispatch({ type: "MANUAL/CONFIRM" })}>
          Confirmar y guardar {d.entries.length} consumo{d.entries.length !== 1 ? "s" : ""}
        </Btn>
      </div>
    </div>
  );
};

// =========================================================
// SUCCESS (paso 3)
// =========================================================
const ManualSuccess = () => {
  const { state, dispatch } = useApp();
  // After CONFIRM, the last batch is at the head of records. We don't know exact size — fallback to 1.
  // To know exact, we'd need to read manualDraft.entries.length before reset — but reset already ran.
  // The records currently in state may include the new batch — count those with origen==="manual" and the latest date in head until origen changes? Simpler: just say "registros guardados".
  return (
    <div>
      <SectionHead
        eyebrow="Registrar consumo"
        title="Lote guardado"
        right={<Btn kind="ghost" icon="dashboard" onClick={() => dispatch({ type: "NAVIGATE", view: "dashboard" })}>Ver en dashboard</Btn>}
      />
      <div style={{ marginBottom: 22 }}>
        <Steps items={["Datos", "Revisar", "Listo"]} current={2} />
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "8px 0" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: "var(--rl-success-50)", color: "var(--rl-success-700)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="check_circle" size={32} fill />
          </div>
          <div className="prt-grow">
            <div className="prt-h2">Listo, registramos tus consumos</div>
            <div className="prt-muted" style={{ marginTop: 4 }}>
              Los registros se agregaron a la tabla y se reflejan en el dashboard.
            </div>
          </div>
          <Chip kind="success" icon="check">Lote guardado</Chip>
        </div>
      </Card>

      <div className="prt-row" style={{ marginTop: 22, gap: 12 }}>
        <Btn kind="primary" icon="add" onClick={() => { dispatch({ type: "MANUAL/RESET" }); dispatch({ type: "NAVIGATE", view: "manual", manualStep: "form" }); }}>
          Registrar otro lote
        </Btn>
        <Btn icon="cloud_upload" onClick={() => dispatch({ type: "NAVIGATE", view: "upload", uploadStep: 1 })}>
          Subir un documento
        </Btn>
        <Btn icon="dashboard" onClick={() => dispatch({ type: "NAVIGATE", view: "dashboard" })}>
          Ir al dashboard
        </Btn>
      </div>
    </div>
  );
};

// =========================================================
// Switcher
// =========================================================
const ManualView = () => {
  const { state } = useApp();
  if (state.manualStep === "preview") return <ManualPreview />;
  if (state.manualStep === "success") return <ManualSuccess />;
  return <ManualForm />;
};

Object.assign(window, { ManualView, ManualForm, ManualPreview, ManualSuccess, EntryCard, FacturaUpload });
