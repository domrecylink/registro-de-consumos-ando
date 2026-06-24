// foto.jsx — Flujo "Tomar foto" para Ando: captura imagen, sube a Drive
// (carpeta FOTOS_POR_COMPLETAR), agrega fila pendiente en hoja "Fotos", y
// permite completar datos desde la app o desde el Sheet. Al completar se
// mueve el archivo a FOTOS_PROCESADOS y se marca status=procesado.

// ----- Captura -----------------------------------------------------------
const FotoCaptureView = () => {
  const { state, dispatch } = useApp();
  const go = (view) => dispatch({ type: "NAVIGATE", view });

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

  const [tipo, setTipo] = React.useState("");
  const [sucursal, setSucursal] = React.useState("");
  const [periodo, setPeriodo] = React.useState(isoMonth);
  const [file, setFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setError("");
  };

  const reset = () => {
    setTipo(""); setSucursal(""); setFile(null); setPreviewUrl("");
    setError(""); setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = tipo && sucursal && periodo && file && !uploading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setUploading(true);
    setError("");
    try {
      const res = await rcUploadFoto({ file, tipo, sucursal, periodo });
      setSuccess(res);
      dispatch({ type: "FOTO/INVALIDATE" });
    } catch (e) {
      setError(String(e && e.message || e));
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div>
        <SectionHead eyebrow="Tomar foto" title="Foto subida ✅" />
        <Card>
          <div className="prt-col" style={{ gap: 14 }}>
            <div className="prt-muted">
              Archivo guardado en Drive y registrado en la cola como <b>pendiente</b>.
              Completa los datos desde la cola o directamente en el Sheet.
            </div>
            {success.link && (
              <a className="prt-link" href={success.link} target="_blank" rel="noopener">
                Ver archivo en Drive →
              </a>
            )}
            <div className="prt-row" style={{ gap: 10, marginTop: 8 }}>
              <Btn kind="primary" icon="photo_camera" onClick={reset}>Tomar otra</Btn>
              <Btn icon="list" onClick={() => go("foto-cola")}>Ver cola</Btn>
              <Btn onClick={() => go("landing")}>Volver al inicio</Btn>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHead
        eyebrow="Tomar foto"
        title="Nueva captura"
        sub="Saca una foto del medidor o documento. Subiremos el archivo a Drive y dejaremos los datos pendientes de completar."
      />
      <Card>
        <div className="prt-col" style={{ gap: 16 }}>
          <Field label="Tipo de consumo" required>
            <Select value={tipo} onChange={setTipo} options={tipoOptions} placeholder="Elige tipo" />
          </Field>
          <Field label="Sucursal" required helper={sucOptions.length === 0 ? "Configura una sucursal antes de continuar." : undefined}>
            <Select value={sucursal} onChange={setSucursal} options={sucOptions} placeholder="Elige sucursal" />
          </Field>
          <Field label="Período (mes)" required>
            <Input type="month" value={periodo} onChange={setPeriodo} />
          </Field>
          <Field label="Foto" required helper="Móvil: abre la cámara. Desktop: selector de archivos.">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFileChange}
              className="prt-input"
            />
          </Field>
          {previewUrl && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--rl-gray-200)", maxWidth: 380 }}>
              <img src={previewUrl} alt="Vista previa" style={{ display: "block", width: "100%", height: "auto" }} />
            </div>
          )}
          {error && (
            <div className="prt-help error">
              <Icon name="error" size={14} />
              <span>{error}</span>
            </div>
          )}
          <div className="prt-row" style={{ gap: 10 }}>
            <Btn kind="primary" icon={uploading ? "hourglass_top" : "cloud_upload"} onClick={onSubmit} disabled={!canSubmit}>
              {uploading ? "Subiendo…" : "Subir foto"}
            </Btn>
            <Btn onClick={() => go("foto-cola")} icon="list">Ver cola</Btn>
            <Btn onClick={() => go("register")}>Cancelar</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ----- Cola (lista de pendientes + procesados) ---------------------------
const FotoColaView = () => {
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
    <div key={r.rowIndex} className="rc-home-item" style={{ gap: 12 }}>
      <span className="rc-home-item-ico" style={{ background: "var(--rl-gray-100)", color: "var(--rl-gray-700)" }}>
        <Icon name={TYPES[r.tipo]?.icon || "photo_camera"} size={16} />
      </span>
      <div className="rc-home-item-body" style={{ minWidth: 0 }}>
        <div className="rc-home-item-title">
          {r.sucursal || "—"} · <span style={{ color: "var(--rl-gray-600)" }}>{tipoLabel[r.tipo] || r.tipo || "—"}</span>
        </div>
        <div className="rc-home-item-sub">
          {r.periodo || "—"} · {r.fechaSubida ? fmtDate(String(r.fechaSubida).slice(0, 10)) : "—"}
          {r.link && (
            <> · <a href={r.link} target="_blank" rel="noopener" className="prt-link">Foto</a></>
          )}
        </div>
      </div>
      <div className="prt-row" style={{ gap: 6 }}>
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

  return (
    <div>
      <SectionHead
        eyebrow="Tomar foto"
        title={"Cola — " + pendientes.length + " pendiente" + (pendientes.length === 1 ? "" : "s")}
        sub="Fotos subidas que aún no tienen datos de consumo. Al completar, el archivo se mueve a la subcarpeta Procesados."
        right={<Btn kind="primary" icon="photo_camera" onClick={() => go("foto-capture")}>Nueva foto</Btn>}
      />
      {state.fotos.loading && rows.length === 0 ? (
        <Card><div className="prt-muted">Cargando cola…</div></Card>
      ) : state.fotos.error ? (
        <Card><div className="prt-help error"><Icon name="error" size={14} /><span>{state.fotos.error}</span></div></Card>
      ) : (
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
      )}
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
  }, [row?.rowIndex]);

  if (!row) {
    return (
      <div>
        <SectionHead eyebrow="Completar" title="Foto no encontrada" />
        <Btn onClick={() => go("foto-cola")}>Volver a la cola</Btn>
      </div>
    );
  }

  const subcatOptions = getSubcatsFor(state, row.tipo, row.sucursal)
    .map(s => ({ value: s.id, label: s.label }));
  const providerOptions = getProviderOptionsFor(state, row.sucursal, row.tipo);

  const onSave = async () => {
    setSaving(true); setError("");
    try {
      await rcCompleteFoto({
        fileId: row.fileId,
        rowIndex: row.rowIndex,
        patch: { consumo, unidad, costo, proveedor, subcat, notas },
      });
      dispatch({ type: "FOTO/INVALIDATE" });
      dispatch({ type: "TOAST/SHOW", toast: { kind: "success", title: "Foto procesada", body: "Datos guardados y archivo movido a Procesados." } });
      go("foto-cola");
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
        title={(row.sucursal || "—") + " · " + (TYPES[row.tipo]?.label || row.tipo)}
        sub={"Período " + (row.periodo || "—") + ". Al guardar se mueve el archivo a Procesados."}
      />
      <div className="prt-row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 320px", maxWidth: 380 }}>
          {row.fileId ? (
            <a href={row.link} target="_blank" rel="noopener" style={{ display: "block", borderRadius: 12, overflow: "hidden", border: "1px solid var(--rl-gray-200)" }}>
              <img
                src={"https://drive.google.com/thumbnail?id=" + row.fileId + "&sz=w800"}
                alt="Foto"
                style={{ display: "block", width: "100%", height: "auto", background: "var(--rl-gray-100)" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </a>
          ) : (
            <div className="prt-muted">Sin URL de Drive disponible.</div>
          )}
          {row.link && <a className="prt-link" href={row.link} target="_blank" rel="noopener" style={{ marginTop: 8, display: "inline-block" }}>Abrir en Drive →</a>}
        </div>
        <Card style={{ flex: 1, minWidth: 320 }}>
          <div className="prt-col" style={{ gap: 14 }}>
            {subcatOptions.length > 0 && (
              <Field label="Subcategoría">
                <Select value={subcat} onChange={setSubcat} options={subcatOptions} placeholder="—" />
              </Field>
            )}
            <Field label="Consumo" required>
              <Input value={consumo} onChange={setConsumo} suffix={unidad} type="number" />
            </Field>
            {row.tipo === "combustible" && (
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
            <div className="prt-row" style={{ gap: 10, marginTop: 4 }}>
              <Btn kind="primary" icon={saving ? "hourglass_top" : "check"} onClick={onSave} disabled={saving || !consumo}>
                {saving ? "Guardando…" : "Guardar y procesar"}
              </Btn>
              <Btn onClick={() => go("foto-cola")}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { FotoCaptureView, FotoColaView, FotoCompleteView });
