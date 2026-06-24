// foto.jsx — Módulo "Tomar foto" para Ando. Una sola vista (FotoHubView) con
// pestañas Nueva / Cola. Completar datos abre una vista aparte (FotoCompleteView).
// Mobile-first: foto al principio del form, solo foto obligatoria, resto opcional.

// ----- Captura (sub-componente de FotoHubView) ---------------------------
const FotoCaptureForm = ({ onUploaded }) => {
  const { state } = useApp();

  const sucursales = (state.configSucursales || []).filter(s => s.activa);
  const sucOptions = sucursales.map(s => ({ value: s.nombre, label: s.nombre }));
  const tipoOptions = [
    { value: "electricidad", label: "Electricidad" },
    { value: "combustible",  label: "Combustible" },
    { value: "agua",         label: "Agua" },
    { value: "refrigerantes",label: "Refrigerantes" },
  ];

  const today = new Date();
  const isoMonth = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0");

  const [tipo, setTipo]         = React.useState("");
  const [sucursal, setSucursal] = React.useState("");
  const [periodo, setPeriodo]   = React.useState(isoMonth);
  const [file, setFile]         = React.useState(null);
  const [previewUrl, setPrev]   = React.useState("");
  const [uploading, setUp]      = React.useState(false);
  const [error, setError]       = React.useState("");
  const fileInputRef = React.useRef(null);

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setPrev(URL.createObjectURL(f));
    setError("");
  };

  const reset = () => {
    setTipo(""); setSucursal(""); setFile(null); setPrev("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = !!file && !uploading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setUp(true);
    setError("");
    try {
      const res = await rcUploadFoto({ file, tipo, sucursal, periodo });
      reset();
      if (onUploaded) onUploaded(res);
    } catch (e) {
      setError(String(e && e.message || e));
    } finally {
      setUp(false);
    }
  };

  return (
    <Card>
      <div className="prt-col" style={{ gap: 16 }}>
        {/* FOTO PRIMERO — único campo obligatorio */}
        <Field label="Foto" required helper="Móvil: abre la cámara. Desktop: selector.">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="prt-input"
            style={{ width: "100%" }}
          />
        </Field>
        {previewUrl && (
          <div className="rc-foto-preview">
            <img src={previewUrl} alt="Vista previa" />
          </div>
        )}

        {/* Resto opcional — orden: tipo, sucursal, período */}
        <Field label="Tipo de consumo" helper="Opcional · podrás definirlo al completar datos">
          <Select value={tipo} onChange={setTipo} options={tipoOptions} placeholder="Elige tipo" />
        </Field>
        <Field label="Sucursal" helper={sucOptions.length === 0 ? "Configura sucursales para asignar." : "Opcional"}>
          <Select value={sucursal} onChange={setSucursal} options={sucOptions} placeholder="Elige sucursal" />
        </Field>
        <Field label="Período (mes)" helper="Opcional">
          <Input type="month" value={periodo} onChange={setPeriodo} />
        </Field>

        {error && (
          <div className="prt-help error">
            <Icon name="error" size={14} />
            <span>{error}</span>
          </div>
        )}
        <div className="rc-foto-actions">
          <Btn kind="primary" icon={uploading ? "hourglass_top" : "cloud_upload"} onClick={onSubmit} disabled={!canSubmit}>
            {uploading ? "Subiendo…" : "Subir foto"}
          </Btn>
        </div>
      </div>
    </Card>
  );
};

// ----- Cola (sub-componente de FotoHubView) ------------------------------
const FotoColaSection = () => {
  const { state, dispatch } = useApp();
  const go = (view, extra) => dispatch({ type: "NAVIGATE", view, ...extra });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: "FOTO/LOAD_START" });
      try {
        const rows = await rcReadFotos();
        if (!cancelled) dispatch({ type: "FOTO/LOAD_OK", rows });
      } catch (e) {
        if (!cancelled) dispatch({ type: "FOTO/LOAD_FAIL", error: String(e && e.message || e) });
      }
    })();
    return () => { cancelled = true; };
  }, [state.fotos.invalidatedAt]);

  const rows = state.fotos.rows || [];
  const pendientes = rows.filter(r => (r.status || "").toLowerCase() !== "procesado");
  const procesados = rows.filter(r => (r.status || "").toLowerCase() === "procesado");

  const tipoLabel = { electricidad: "Electricidad", combustible: "Combustible", agua: "Agua", refrigerantes: "Refrigerantes" };

  const renderRow = (r) => (
    <div key={r.rowIndex} className="rc-foto-row">
      <span className="rc-foto-row-ico" style={{ background: "var(--rl-gray-100)", color: "var(--rl-gray-700)" }}>
        <Icon name={TYPES[r.tipo]?.icon || "photo_camera"} size={16} />
      </span>
      <div className="rc-foto-row-body">
        <div className="rc-foto-row-title">
          {r.sucursal || "—"} {r.tipo && <span style={{ color: "var(--rl-gray-600)" }}> · {tipoLabel[r.tipo] || r.tipo}</span>}
        </div>
        <div className="rc-foto-row-sub">
          {r.periodo || "—"} · {r.fechaSubida ? fmtDate(String(r.fechaSubida).slice(0, 10)) : "—"}
          {r.link && (<> · <a href={r.link} target="_blank" rel="noopener" className="prt-link">Foto</a></>)}
        </div>
      </div>
      <div className="rc-foto-row-actions">
        <Chip size="sm" kind={r.status === "procesado" ? "success" : "warning"}>
          {r.status === "procesado" ? "Procesado" : "Pendiente"}
        </Chip>
        {r.status !== "procesado" && (
          <Btn size="sm" icon="edit" onClick={() => go("foto-complete", { fotoCompleteRow: r.rowIndex })}>
            Completar
          </Btn>
        )}
      </div>
    </div>
  );

  if (state.fotos.loading && rows.length === 0) {
    return <Card><div className="prt-muted">Cargando cola…</div></Card>;
  }
  if (state.fotos.error) {
    return <Card><div className="prt-help error"><Icon name="error" size={14} /><span>{state.fotos.error}</span></div></Card>;
  }

  return (
    <>
      <Card flush>
        <div className="rc-home-card-head">
          <div>
            <div className="rc-home-kpi">{pendientes.length}</div>
            <div className="prt-hint" style={{ marginTop: 2 }}>pendientes</div>
          </div>
        </div>
        <div className="rc-home-list">
          {pendientes.length === 0
            ? <div className="rc-home-empty"><Icon name="check_circle" size={28} style={{ color: "var(--rl-success-500)" }} /><div className="prt-hint" style={{ marginTop: 6 }}>Sin fotos pendientes.</div></div>
            : pendientes.map(renderRow)}
        </div>
      </Card>
      <div style={{ height: 14 }} />
      <Card flush>
        <div className="rc-home-card-head">
          <div>
            <div className="rc-home-kpi">{procesados.length}</div>
            <div className="prt-hint" style={{ marginTop: 2 }}>procesadas</div>
          </div>
        </div>
        <div className="rc-home-list">
          {procesados.length === 0
            ? <div className="rc-home-empty"><Icon name="inbox" size={28} style={{ color: "var(--rl-gray-300)" }} /><div className="prt-hint" style={{ marginTop: 6 }}>Aún no hay fotos procesadas.</div></div>
            : procesados.slice(0, 20).map(renderRow)}
        </div>
      </Card>
    </>
  );
};

// ----- Hub (Nueva | Cola) ------------------------------------------------
const FotoHubView = () => {
  const { dispatch } = useApp();
  const [tab, setTab] = React.useState("nueva"); // nueva | cola
  const [lastUploaded, setLastUp] = React.useState(null);

  const onUploaded = (res) => {
    setLastUp(res);
    dispatch({ type: "FOTO/INVALIDATE" });
    setTab("cola");
  };

  const pendCount = useApp().state.fotos.rows.filter(r => (r.status || "").toLowerCase() !== "procesado").length;

  return (
    <div>
      <SectionHead
        eyebrow="Tomar foto"
        title="Foto + datos diferidos"
        sub="Captura una foto del medidor o documento. Los datos se pueden completar después, aquí mismo o directo en el Sheet."
      />
      <div className="rc-foto-tabs">
        <button
          className={"rc-foto-tab" + (tab === "nueva" ? " active" : "")}
          onClick={() => setTab("nueva")}
        >
          <Icon name="photo_camera" size={16} />
          <span>Nueva</span>
        </button>
        <button
          className={"rc-foto-tab" + (tab === "cola" ? " active" : "")}
          onClick={() => setTab("cola")}
        >
          <Icon name="list" size={16} />
          <span>Cola{pendCount > 0 ? " · " + pendCount : ""}</span>
        </button>
      </div>

      {lastUploaded && tab === "cola" && (
        <div className="rc-foto-toast">
          <Icon name="check" size={16} />
          <span>Foto subida. Pendiente de completar datos.</span>
        </div>
      )}

      {tab === "nueva"
        ? <FotoCaptureForm onUploaded={onUploaded} />
        : <FotoColaSection />}
    </div>
  );
};

// ----- Completar datos de una foto pendiente -----------------------------
const FotoCompleteView = () => {
  const { state, dispatch } = useApp();
  const go = (view) => dispatch({ type: "NAVIGATE", view });

  const rowIndex = state.fotoCompleteRow;
  const row = (state.fotos.rows || []).find(r => r.rowIndex === rowIndex);

  const [consumo, setConsumo]   = React.useState("");
  const [unidad, setUnidad]     = React.useState("");
  const [costo, setCosto]       = React.useState("");
  const [proveedor, setProv]    = React.useState("");
  const [subcat, setSubcat]     = React.useState("");
  const [notas, setNotas]       = React.useState("");
  const [tipo, setTipo]         = React.useState("");
  const [sucursal, setSucursal] = React.useState("");
  const [periodo, setPeriodo]   = React.useState("");
  const [saving, setSaving]     = React.useState(false);
  const [error, setError]       = React.useState("");

  React.useEffect(() => {
    if (!row) return;
    setConsumo(row.consumo || "");
    setUnidad(row.unidad || (TYPES[row.tipo]?.unit || ""));
    setCosto(row.costo || "");
    setProv(row.proveedor || "");
    setSubcat(row.subcat || "");
    setNotas(row.notas || "");
    setTipo(row.tipo || "");
    setSucursal(row.sucursal || "");
    setPeriodo(row.periodo || "");
  }, [row?.rowIndex]);

  if (!row) {
    return (
      <div>
        <SectionHead eyebrow="Completar" title="Foto no encontrada" />
        <Btn onClick={() => go("foto-hub")}>Volver a la cola</Btn>
      </div>
    );
  }

  const sucursales = (state.configSucursales || []).filter(s => s.activa);
  const sucOptions = sucursales.map(s => ({ value: s.nombre, label: s.nombre }));
  const tipoOptions = [
    { value: "electricidad", label: "Electricidad" },
    { value: "combustible",  label: "Combustible" },
    { value: "agua",         label: "Agua" },
    { value: "refrigerantes",label: "Refrigerantes" },
  ];
  const subcatOptions = tipo
    ? getSubcatsFor(state, tipo, sucursal).map(s => ({ value: s.id, label: s.label }))
    : [];
  const providerOptions = (tipo && sucursal) ? getProviderOptionsFor(state, sucursal, tipo) : [];

  const onSave = async () => {
    setSaving(true); setError("");
    try {
      // Usamos los valores efectivos del form (pueden haber sido editados aquí).
      const effectiveRow = { ...row, tipo, sucursal, periodo };
      await rcCompleteFoto({
        fileId: row.fileId,
        rowIndex: row.rowIndex,
        patch: { consumo, unidad, costo, proveedor, subcat, notas },
        fotoRow: effectiveRow,
      });
      dispatch({ type: "FOTO/INVALIDATE" });
      dispatch({ type: "TOAST/SHOW", toast: { kind: "success", title: "Foto procesada", body: "Datos guardados y archivo movido a Procesados." } });
      go("foto-hub");
    } catch (e) {
      setError(String(e && e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHead
        eyebrow="Completar foto"
        title={(sucursal || row.sucursal || "Foto pendiente") + (tipo ? " · " + (TYPES[tipo]?.label || tipo) : "")}
        sub={"Período " + (periodo || "—") + ". Al guardar se mueve el archivo a Procesados y se copia el registro al dashboard."}
      />
      <div className="rc-foto-complete">
        <div className="rc-foto-complete-img">
          {row.fileId ? (
            <a href={row.link} target="_blank" rel="noopener">
              <img
                src={"https://drive.google.com/thumbnail?id=" + row.fileId + "&sz=w800"}
                alt="Foto"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </a>
          ) : (
            <div className="prt-muted">Sin URL de Drive disponible.</div>
          )}
          {row.link && <a className="prt-link" href={row.link} target="_blank" rel="noopener" style={{ marginTop: 8, display: "inline-block" }}>Abrir en Drive →</a>}
        </div>
        <Card style={{ flex: 1, minWidth: 0 }}>
          <div className="prt-col" style={{ gap: 14 }}>
            <Field label="Tipo de consumo">
              <Select value={tipo} onChange={(v) => { setTipo(v); setSubcat(""); }} options={tipoOptions} placeholder="Elige tipo" />
            </Field>
            <Field label="Sucursal">
              <Select value={sucursal} onChange={setSucursal} options={sucOptions} placeholder="Elige sucursal" />
            </Field>
            <Field label="Período (mes)">
              <Input type="month" value={periodo} onChange={setPeriodo} />
            </Field>
            {subcatOptions.length > 0 && (
              <Field label="Subcategoría">
                <Select value={subcat} onChange={setSubcat} options={subcatOptions} placeholder="—" />
              </Field>
            )}
            <Field label="Consumo" required>
              <Input value={consumo} onChange={setConsumo} suffix={unidad} type="number" />
            </Field>
            {tipo === "combustible" && (
              <Field label="Unidad">
                <Select value={unidad} onChange={setUnidad} options={["L", "kg", "m³", "gal", "t", "kWh"]} placeholder="Unidad" />
              </Field>
            )}
            <Field label="Costo (CLP)">
              <Input value={costo} onChange={setCosto} type="number" />
            </Field>
            <Field label="Proveedor">
              {providerOptions.length > 0
                ? <Select value={proveedor} onChange={setProv} options={providerOptions} placeholder="Elige proveedor" />
                : <Input value={proveedor} onChange={setProv} placeholder="—" />}
            </Field>
            <Field label="Notas">
              <Input value={notas} onChange={setNotas} placeholder="Opcional" />
            </Field>
            {error && <div className="prt-help error"><Icon name="error" size={14} /><span>{error}</span></div>}
            <div className="prt-row" style={{ gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <Btn kind="primary" icon={saving ? "hourglass_top" : "check"} onClick={onSave} disabled={saving || !consumo}>
                {saving ? "Guardando…" : "Guardar y procesar"}
              </Btn>
              <Btn onClick={() => go("foto-hub")}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { FotoHubView, FotoCompleteView });
