// Upload flow — proveedor → dropzone real → cola → preview

const PROVIDER_TEMPLATES = [
  { id: "enel",            name: "Enel",                 type: "electricidad", initials: "E",  examples: "PDF mensual" },
  { id: "cge",             name: "CGE",                  type: "electricidad", initials: "C",  examples: "PDF mensual" },
  { id: "aguas-andinas",   name: "Aguas Andinas",        type: "agua",         initials: "AA", examples: "PDF mensual · Excel detalle" },
  { id: "aguas-del-valle", name: "Aguas del Valle",      type: "agua",         initials: "AV", examples: "PDF mensual" },
  { id: "esval",           name: "Esval",                type: "agua",         initials: "E",  examples: "PDF mensual" },
  { id: "iconstruye-pet",  name: "Iconstruye Petróleo",  type: "combustible",  initials: "IP", examples: "PDF multi-sucursal" },
  { id: "copec",           name: "Copec",                type: "combustible",  initials: "C",  examples: "PDF · Excel" },
  { id: "shell",           name: "Shell",                type: "combustible",  initials: "S",  examples: "PDF mensual" },
  { id: "generic",         name: "Otro proveedor",       type: "any",          initials: "?",  examples: "Lo intentamos extraer; algunos campos pueden quedar vacíos" },
];

// =========================================================
// Step 1 — Provider selection
// =========================================================
const UploadStep1 = () => {
  const { state, dispatch } = useApp();
  const [hover, setHover] = React.useState(null);

  return (
    <div>
      <SectionHead
        eyebrow="Subir documento · paso 1 de 3"
        title="¿De qué proveedor es el documento?"
        sub="Tener la plantilla del proveedor nos ayuda a extraer mejor los datos. Si no aparece, elige 'Otro proveedor'."
        right={<Btn kind="ghost" icon="arrow_back" onClick={() => dispatch({ type: "NAVIGATE", view: "landing" })}>Volver</Btn>}
      />
      <div style={{ marginBottom: 22 }}>
        <Steps items={["Proveedor", "Subir", "Revisar"]} current={0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {PROVIDER_TEMPLATES.map(p => {
          const t = p.type === "any" ? null : TYPES[p.type];
          return (
            <button
              key={p.id}
              className={"prt-provider" + (state.selectedProvider?.id === p.id ? " selected" : "")}
              onClick={() => dispatch({ type: "UPLOAD/SET_PROVIDER", provider: p })}
              onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}
            >
              <div className="prt-spread">
                <div className="logo">{p.initials}</div>
                {t && <TypeIndicator type={p.type} />}
                {!t && <Chip size="sm">Genérico</Chip>}
              </div>
              <div className="prt-h4" style={{ marginTop: 4 }}>{p.name}</div>
              <div className="prt-hint" style={{ fontSize: 12 }}>{p.examples}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================
// Step 2 — Dropzone (real drag & drop) + queue
// =========================================================
const UploadStep2 = () => {
  const { state, dispatch } = useApp();
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    addFiles(files);
  };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const onFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = "";
  };

  function addFiles(files) {
    if (!files.length) return;
    const provider = state.selectedProvider;
    const newOnes = files.map((f) => ({
      id: nextId(),
      name: f.name,
      size: f.size,
      kind: detectKind(f),
      status: "uploading",
      progress: 0,
      file: f,            // keep the File ref so we can upload it to Drive later
      rows: [],           // extracted rows
    }));
    dispatch({ type: "UPLOAD/ENQUEUE", files: newOnes });

    // Run REAL extraction per file
    newOnes.forEach((q) => realProcessFile(q, provider, dispatch));
  }

  function detectKind(f) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
    if (name.endsWith(".csv")) return "csv";
    if (name.endsWith(".jpg") || name.endsWith(".png") || name.endsWith(".jpeg")) return "image";
    return "other";
  }

  const goNext = () => {
    // Flatten REAL extracted rows from all ready files into preview rows.
    // Match el número de cliente extraído contra la config para autocompletar
    // sucursal / subcategoría / proveedor.
    const rows = [];
    state.uploadQueue.forEach((f) => {
      if (f.status !== "ready" || !f.rows || !f.rows.length) return;
      f.rows.forEach((r) => {
        const row = { id: nextId(), ...r };
        if (!row.sucursal && row.numeroCliente) {
          const match = resolveByNumCliente(state, row.numeroCliente, row.type);
          if (match) {
            row.sucursal = match.sucursal;
            if (match.subcat && !row.subcat) row.subcat = match.subcat;
            if (match.provider) row.provider = match.provider;
            // Si quedó completo tras el match, súbelo a "ok".
            if (row.date && row.cantidad) row.status = "ok";
          }
        }
        rows.push(row);
      });
    });
    dispatch({ type: "UPLOAD/SET_PREVIEW_ROWS", rows });
    dispatch({ type: "UPLOAD/SET_STEP", step: 3 });
  };

  const readyCount = state.uploadQueue.filter(f => f.status === "ready").length;
  const errCount = state.uploadQueue.filter(f => f.status === "error").length;
  const processingCount = state.uploadQueue.filter(f => f.status === "uploading" || f.status === "parsing").length;

  return (
    <div>
      <SectionHead
        eyebrow="Subir documento · paso 2 de 3"
        title={`Sube tus archivos · ${state.selectedProvider?.name || ""}`}
        sub="Arrastra los PDFs / Excel acá. Procesamos cada archivo en paralelo."
        right={<Btn kind="ghost" icon="arrow_back" onClick={() => dispatch({ type: "UPLOAD/SET_STEP", step: 1 })}>Cambiar proveedor</Btn>}
      />
      <div style={{ marginBottom: 22 }}>
        <Steps items={["Proveedor", "Subir", "Revisar"]} current={1} />
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
        className="prt-vh"
        onChange={onFileInput}
      />

      {state.uploadQueue.length === 0 && (
        <div
          className={"prt-dropzone" + (dragging ? " active" : "")}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <Icon name="cloud_upload" size={48} />
          <div>
            <div className="prt-h3">{dragging ? "Suelta para subir" : "Arrastra tus archivos aquí"}</div>
            <div className="prt-muted" style={{ marginTop: 4 }}>
              o <span style={{ color: "var(--rl-primary-900)", fontWeight: 600, textDecoration: "underline" }}>elige desde tu equipo</span>
            </div>
          </div>
          <div className="prt-hint">PDF · Excel · CSV · hasta 25 MB por archivo</div>
        </div>
      )}

      {state.uploadQueue.length > 0 && (
        <div className="prt-stack-md">
          {/* mini dropzone (queue mode) */}
          <div
            className={"prt-dropzone" + (dragging ? " active" : "")}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            style={{ cursor: "pointer", padding: "24px 20px" }}
          >
            <Icon name="cloud_upload" size={28} />
            <div className="prt-h4">{dragging ? "Suelta para agregar" : "Suelta o haz clic para agregar más archivos"}</div>
          </div>

          {/* Queue */}
          <Card flush>
            <div className="prt-card-head">
              <div>
                <div className="prt-h3">Cola de procesamiento</div>
                <div className="prt-hint" style={{ marginTop: 2 }}>
                  {state.uploadQueue.length} archivos · {readyCount} listos
                  {processingCount > 0 && ` · ${processingCount} procesando`}
                  {errCount > 0 && ` · ${errCount} con error`}
                </div>
              </div>
              <div className="prt-row" style={{ gap: 8 }}>
                <Btn size="sm" onClick={() => dispatch({ type: "UPLOAD/RESET" })}>Limpiar todo</Btn>
                <Btn
                  size="sm"
                  kind="primary"
                  iconRight="arrow_forward"
                  disabled={readyCount === 0}
                  onClick={goNext}
                >
                  Revisar {readyCount > 0 ? `${readyCount} archivo${readyCount > 1 ? "s" : ""}` : ""}
                </Btn>
              </div>
            </div>
            <div className="prt-stack-sm" style={{ padding: 16, gap: 10 }}>
              {state.uploadQueue.map(f => <QueueRow key={f.id} file={f} />)}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

// Queue row
const QueueRow = ({ file }) => {
  const { dispatch } = useApp();
  const isProcessing = file.status === "uploading" || file.status === "parsing";

  const icon = file.kind === "pdf" ? "picture_as_pdf"
              : file.kind === "xlsx" || file.kind === "csv" ? "table_view"
              : file.kind === "image" ? "image"
              : "description";

  const sizeStr = file.size ? (file.size > 1024*1024 ? (file.size/1024/1024).toFixed(1) + " MB" : Math.round(file.size/1024) + " KB") : "—";

  return (
    <div className="prt-queue-row">
      <div className="file-ico"><Icon name={icon} /></div>
      <div className="prt-grow">
        <div className="filename">{file.name}</div>
        <div className="meta">{sizeStr}{file.extractedCount ? ` · ${file.extractedCount} registros detectados` : ""}</div>
      </div>
      {isProcessing && (
        <>
          <div className="progress"><span style={{ width: file.progress + "%" }}></span></div>
          <div className="prt-row" style={{ gap: 6 }}>
            <span className="prt-spinner"></span>
            <span className="prt-hint" style={{ minWidth: 90 }}>
              {file.status === "uploading" ? "Subiendo… " + file.progress + "%" : "Extrayendo datos…"}
            </span>
          </div>
        </>
      )}
      {file.status === "ready" && (
        <Chip kind="success" icon="check">Listo</Chip>
      )}
      {file.status === "warn" && (
        <Chip kind="warning" icon="warning">Revisar</Chip>
      )}
      {file.status === "error" && (
        <Chip kind="error" icon="error">{file.error || "Error al extraer"}</Chip>
      )}
      <button
        onClick={() => dispatch({ type: "UPLOAD/REMOVE_FILE", id: file.id })}
        style={{ all: "unset", cursor: "pointer", color: "var(--rl-gray-400)", padding: 6 }}
        title="Quitar archivo"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
};

// Real file processing — reads the actual PDF/Excel and calls window.rcExtract
async function realProcessFile(queueItem, provider, dispatch) {
  const id = queueItem.id;
  // Simulated upload progress so the UI feels alive
  let prog = 0;
  const interval = setInterval(() => {
    prog += 10 + Math.random() * 14;
    if (prog >= 100) { clearInterval(interval); prog = 100; }
    dispatch({ type: "UPLOAD/UPDATE_FILE", id, patch: { progress: Math.round(prog) } });
  }, 90);

  try {
    if (!window.rcExtract) throw new Error("Extractor no disponible");
    // Wait briefly so the progress animation can play (UX nicety)
    await new Promise((res) => setTimeout(res, 800));
    dispatch({ type: "UPLOAD/UPDATE_FILE", id, patch: { progress: 100, status: "parsing" } });

    const rows = await window.rcExtract(queueItem.file, provider);

    clearInterval(interval);
    if (!rows || rows.length === 0) {
      dispatch({
        type: "UPLOAD/UPDATE_FILE",
        id,
        patch: { status: "error", error: "Sin datos extraíbles" },
      });
      return;
    }
    const anyWarn = rows.some((r) => r.status === "warn");
    dispatch({
      type: "UPLOAD/UPDATE_FILE",
      id,
      patch: {
        status: anyWarn ? "warn" : "ready",
        extractedCount: rows.length,
        rows,
      },
    });
    // Treat "warn" as still ready-to-review (the design uses both)
    if (anyWarn) {
      dispatch({ type: "UPLOAD/UPDATE_FILE", id, patch: { status: "ready" } });
    }
  } catch (e) {
    clearInterval(interval);
    console.error("[rc-extract] failed for", queueItem.name, e);
    dispatch({
      type: "UPLOAD/UPDATE_FILE",
      id,
      patch: { status: "error", error: e.message || "Error al extraer" },
    });
  }
}

// =========================================================
// Switcher
// =========================================================
const UploadView = () => {
  const { state } = useApp();
  if (state.uploadStep === 3) return <PreviewEditableView />;
  if (state.uploadStep === 2) return <UploadStep2 />;
  return <UploadStep1 />;
};

Object.assign(window, { UploadView, UploadStep1, UploadStep2, realProcessFile });
