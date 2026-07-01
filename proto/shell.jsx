// Shell — top-level layout: collapsible sidebar + main content + toast

// =========================================================
// Hash router — keeps URL in sync with state.view
// =========================================================
const VIEW_HASH = {
  landing:         "/",
  dashboard:       "/dashboard",
  register:        "/registrar",
  manual:          "/registrar/manual",
  upload:          "/registrar/subir",
  "foto-hub":      "/registrar/foto",
  "foto-complete": "/registrar/foto/completar",
  config:          "/configuracion",
  "config-edit":   "/configuracion/editar",
  matrix:          "/matriz",
  medidores:       "/medidores",
  "medidores-movil": "/medidores/movil",
  impacto:         "/impacto",
  factores:        "/impacto/factores",
  metas:           "/impacto/metas",
  onboarding:      "/onboarding",
};
const HASH_VIEW = Object.fromEntries(Object.entries(VIEW_HASH).map(([v, h]) => [h, v]));

function hashToView() {
  const h = window.location.hash.replace(/^#/, "") || "/";
  return HASH_VIEW[h] || "landing";
}

const RouterSync = () => {
  const { state, dispatch } = useApp();
  const didInit = React.useRef(false);

  // En el primer render: adoptar la view del hash actual (URL → state).
  // Si no, el primer commit empuja la view inicial al hash y pisa la URL.
  if (!didInit.current) {
    didInit.current = true;
    const fromHash = hashToView();
    if (fromHash !== state.view) {
      // Dispatch síncrono dentro del primer render — React lo deduplica
      // antes de pintar; el siguiente render ya ve la view correcta.
      dispatch({ type: "NAVIGATE", view: fromHash });
    }
  }

  // state.view → hash (solo después del primer commit, para no pisar URL inicial)
  const ready = React.useRef(false);
  React.useEffect(() => {
    if (!ready.current) { ready.current = true; return; }
    const next = VIEW_HASH[state.view] || "/";
    const cur  = window.location.hash.replace(/^#/, "") || "/";
    if (cur !== next) window.location.hash = next;
  }, [state.view]);

  // hash → state.view (back/forward + direct URL changes)
  React.useEffect(() => {
    const onHashChange = () => {
      const v = hashToView();
      if (v !== window.__rcCurrentView) dispatch({ type: "NAVIGATE", view: v });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // track current view for hashchange guard
  React.useEffect(() => { window.__rcCurrentView = state.view; }, [state.view]);

  return null;
};

const SIDEBAR_LS_KEY = "rcSidebarCollapsed";

const readSidebarCollapsed = () => {
  try {
    const v = window.localStorage.getItem(SIDEBAR_LS_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch (e) {}
  // Default: collapsed on narrow viewports, expanded otherwise
  return typeof window !== "undefined" && window.innerWidth < 900;
};

const writeSidebarCollapsed = (v) => {
  try { window.localStorage.setItem(SIDEBAR_LS_KEY, v ? "1" : "0"); } catch (e) {}
};

const Shell = () => {
  const { state } = useApp();
  const [collapsed, setCollapsed] = React.useState(readSidebarCollapsed);

  // Persist
  React.useEffect(() => { writeSidebarCollapsed(collapsed); }, [collapsed]);

  // Scroll-to-top on view change
  React.useEffect(() => {
    const el = document.querySelector(".prt-host-content");
    if (el) el.scrollTop = 0;
  }, [state.view, state.manualStep, state.uploadStep]);

  return (
    <div className={"prt-app" + (collapsed ? " sidebar-collapsed" : " sidebar-expanded")}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="prt-host-content">
        <ViewSwitcher />
      </div>
      <ToastHost />
      <BuildBadge />
      <VersionWatcher />
    </div>
  );
};

// ----- Detección de nueva versión deployada -------------------------------
// Lee `version.json` al arrancar (la guarda en bootRef), y la re-consulta cada
// 60s + cuando la pestaña vuelve a estar visible. Si el valor remoto cambia,
// muestra un banner no intrusivo. Cerrar el banner sólo lo oculta hasta el
// siguiente chequeo — si sigue desactualizado, vuelve a aparecer.
const VERSION_CHECK_MS = 60_000;

const VersionWatcher = () => {
  const bootRef = React.useRef(null);
  const [latest, setLatest] = React.useState(null);
  const [show, setShow] = React.useState(false);

  const check = React.useCallback(async () => {
    try {
      const r = await fetch("./version.json?_=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const v = j && (j.version || j.sha || j.ts);
      if (!v) return;
      if (bootRef.current == null) {
        bootRef.current = v;
        setLatest(v);
        return;
      }
      setLatest(v);
      if (v !== bootRef.current) setShow(true);
    } catch (e) { /* offline / 404 — ignoramos */ }
  }, []);

  React.useEffect(() => {
    check();
    const id = setInterval(check, VERSION_CHECK_MS);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [check]);

  if (!show) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)",
        zIndex: 10000, maxWidth: "min(720px, calc(100vw - 24px))",
        background: "var(--rl-primary-900, #0B3D5C)", color: "#fff",
        padding: "12px 14px 12px 16px", borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,.28)",
        display: "flex", alignItems: "center", gap: 12,
        font: "500 13px/1.45 var(--rl-font-body)",
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 999,
        background: "rgba(255,255,255,0.16)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon name="refresh" size={16} />
      </span>
      <span style={{ flex: 1 }}>
        <strong style={{ fontWeight: 700 }}>Hay una nueva versión disponible.</strong>{" "}
        Es importante actualizar la página para evitar errores en el uso de la app.
      </span>
      <button
        onClick={() => { try { window.location.reload(true); } catch (e) { window.location.reload(); } }}
        style={{
          all: "unset", cursor: "pointer",
          background: "#fff", color: "var(--rl-primary-900, #0B3D5C)",
          padding: "8px 14px", borderRadius: 8,
          font: "700 12.5px/1 var(--rl-font-display)",
          whiteSpace: "nowrap",
        }}
      >Actualizar ahora</button>
      <button
        onClick={() => setShow(false)}
        aria-label="Cerrar"
        title="Cerrar (volverá a aparecer si sigue desactualizado)"
        style={{
          all: "unset", cursor: "pointer",
          width: 26, height: 26, borderRadius: 6,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          opacity: 0.7,
        }}
      ><Icon name="close" size={16} /></button>
    </div>
  );
};

// ----- Easter egg: build/version badge ------------------------------------
// Lee último commit de la rama main vía GitHub API. Muestra SHA corto +
// mensaje + tiempo relativo. Sirve para confirmar que GitHub Pages ya
// reconstruyó después de un push.
//
// Cómo abrirlo:
//   1) Atajo: Ctrl+Shift+B (toggle).
//   2) O click 5 veces en el logo "R" de la sidebar (<2s).
//   Cerrar: Esc o click fuera.
const BUILD_REPO = "domrecylink/registro-de-consumos-ando";

const BuildBadge = () => {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "B" || e.key === "b")) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onLogoBurst = () => setOpen(o => !o);
    window.addEventListener("keydown", onKey);
    window.addEventListener("rc:toggle-build", onLogoBurst);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("rc:toggle-build", onLogoBurst);
    };
  }, []);

  React.useEffect(() => {
    if (!open || data) return;
    fetch("https://api.github.com/repos/" + BUILD_REPO + "/commits/main")
      .then(r => r.json())
      .then(j => {
        if (j && j.sha) {
          setData({
            sha: j.sha.slice(0, 7),
            shaFull: j.sha,
            message: ((j.commit && j.commit.message) || "").split("\n")[0],
            date: j.commit && j.commit.author && j.commit.author.date,
            url: j.html_url,
          });
        } else {
          setErr((j && j.message) || "No se pudo cargar.");
        }
      })
      .catch(e => setErr(String(e && e.message || e)));
  }, [open]);

  if (!open) return null;

  const ago = (iso) => {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms)) return "—";
    const m = Math.round(ms / 60000);
    if (m < 1)  return "ahora";
    if (m < 60) return "hace " + m + " min";
    const h = Math.floor(m / 60);
    if (h < 24) return "hace " + h + " h";
    return "hace " + Math.floor(h / 24) + " d";
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.15)",
        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--rl-gray-900, #111)", color: "#eee",
          borderRadius: 10, padding: "14px 18px", minWidth: 260, maxWidth: 380,
          font: "500 12.5px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          boxShadow: "0 12px 32px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ opacity: .6, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>build · main</span>
          <button
            onClick={() => setOpen(false)}
            style={{ all: "unset", cursor: "pointer", opacity: .6, fontSize: 14 }}
            aria-label="Cerrar"
          >×</button>
        </div>
        {err && <div style={{ color: "#f88" }}>Error: {err}</div>}
        {!err && !data && <div style={{ opacity: .6 }}>Cargando…</div>}
        {data && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
              <a href={data.url} target="_blank" rel="noopener" style={{ color: "#9cf", textDecoration: "none" }}>{data.sha}</a>
              <span
                onClick={() => { try { navigator.clipboard.writeText(data.shaFull); } catch (e) {} }}
                style={{ marginLeft: 8, opacity: .5, cursor: "copy", fontSize: 11 }}
                title="Copiar SHA completo"
              >copy</span>
            </div>
            <div style={{ marginTop: 6, opacity: .85, fontFamily: "var(--rl-font-body)" }}>{data.message}</div>
            <div style={{ marginTop: 6, opacity: .55, fontSize: 11 }}>{ago(data.date)} · {data.date && data.date.slice(0, 16).replace("T", " ")}</div>
          </>
        )}
      </div>
    </div>
  );
};

// Views that depend on synced records and should show the loader while the
// first fetch is in flight. Onboarding/config/register don't need records.
const DATA_DRIVEN_VIEWS = new Set(["landing", "dashboard", "matrix", "impacto", "factores", "metas", "medidores"]);

const ViewSwitcher = () => {
  const { state } = useApp();
  if (state.recordsLoading && state.records.length === 0 && DATA_DRIVEN_VIEWS.has(state.view)) {
    return <LoadingScreen label="Cargando" />;
  }
  switch (state.view) {
    case "manual":      return <ManualView />;
    case "upload":      return <UploadView />;
    case "dashboard":   return <DashboardView />;
    case "onboarding":  return <OnboardingView />;
    case "config":      return <ConfigView />;
    case "config-edit": return <ConfigEditView />;
    case "matrix":      return <UploadMatrixView />;
    case "medidores":      return <MedidoresView />;
    case "medidores-movil":return <MedidoresMobileView />;
    case "impacto":     return <ImpactoView />;
    case "factores":    return <FactoresView />;
    case "metas":       return <MetasView />;
    case "register":     return <RegisterHubView />;
    case "foto-hub":     return <FotoHubView />;
    case "foto-complete":return <FotoCompleteView />;
    case "landing":
    default:             return <Landing />;
  }
};

const SIDEBAR_ITEMS = [
  { view: "landing",    label: "Inicio",        icon: "home",          extra: {} },
  { view: "dashboard",  label: "Dashboard",     icon: "dashboard",     extra: {} },
  { view: "impacto",    label: "Impacto",       icon: "eco",           extra: {} },
  { view: "register",   label: "Registrar",     icon: "edit",          extra: {} },
  { view: "medidores",  label: "Medidores",     icon: "speed",         extra: {} },
  { view: "config",     label: "Configuración", icon: "settings",      extra: {} },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { state, dispatch } = useApp();
  const go = (view, extra) => dispatch({ type: "NAVIGATE", view, ...extra });

  return (
    <aside className={"rc-sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="rc-sidebar-head">
        {!collapsed && (
          <div className="rc-sidebar-brand">
            <span
              className="rc-sidebar-logo"
              onClick={() => {
                window.__rcLogoClicks = window.__rcLogoClicks || [];
                const now = Date.now();
                window.__rcLogoClicks = window.__rcLogoClicks.filter(t => now - t < 2000);
                window.__rcLogoClicks.push(now);
                if (window.__rcLogoClicks.length >= 5) {
                  window.__rcLogoClicks = [];
                  window.dispatchEvent(new CustomEvent("rc:toggle-build"));
                }
              }}
              style={{ cursor: "pointer" }}
            >R</span>
            <span className="rc-sidebar-brand-text">Recylink</span>
          </div>
        )}
        <button
          className="rc-sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Icon name={collapsed ? "arrow_forward" : "arrow_back"} size={16} />
        </button>
      </div>

      <nav className="rc-sidebar-nav">
        {SIDEBAR_ITEMS.map(it => {
          const isActive = state.view === it.view
            || (it.view === "config" && state.view === "config-edit")
            || (it.view === "dashboard" && state.view === "matrix")
            || (it.view === "impacto" && (state.view === "factores" || state.view === "metas"))
            || (it.view === "medidores" && state.view === "medidores-movil")
            || (it.view === "register" && (state.view === "manual" || state.view === "upload" || state.view === "foto-hub" || state.view === "foto-complete"));
          return (
            <button
              key={it.view}
              className={"rc-sidebar-item" + (isActive ? " active" : "")}
              onClick={() => go(it.view, it.extra)}
              data-tooltip={it.label}
            >
              <span className="rc-sidebar-item-ico"><Icon name={it.icon} size={18} /></span>
              <span className="rc-sidebar-item-label">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

// =========================================================
// Register hub — entry point for manual / upload flows
// =========================================================
const RegisterHubView = () => {
  const { dispatch } = useApp();
  return (
    <div>
      <SectionHead
        eyebrow="Registrar consumo"
        title="¿Cómo quieres registrar?"
        sub="Ingresa un consumo con el formulario, o sube un documento de tu proveedor y extraemos los datos por ti."
      />
      <div className="rc-register-hub">
        <button
          className="rc-register-card primary"
          onClick={() => dispatch({ type: "NAVIGATE", view: "manual", manualStep: "form" })}
        >
          <span className="rc-register-card-ico"><Icon name="edit" size={28} /></span>
          <span className="rc-register-card-title">Registrar a mano</span>
          <span className="rc-register-card-desc">Un consumo a la vez con un formulario corto. ~1 min.</span>
        </button>
        <button
          className="rc-register-card alt"
          onClick={() => dispatch({ type: "NAVIGATE", view: "upload", uploadStep: 1 })}
        >
          <span className="rc-register-card-ico alt"><Icon name="cloud_upload" size={28} /></span>
          <span className="rc-register-card-title">Subir documento</span>
          <span className="rc-register-card-desc">Sube PDFs o Excel de tus proveedores. Rápido y automático.</span>
          <span className="rc-register-card-chips">
            <Chip size="sm">Enel</Chip>
            <Chip size="sm">Aguas Andinas</Chip>
            <Chip size="sm">Iconstruye</Chip>
          </span>
        </button>
        <button
          className="rc-register-card alt"
          onClick={() => dispatch({ type: "NAVIGATE", view: "foto-hub" })}
        >
          <span className="rc-register-card-ico alt"><Icon name="photo_camera" size={28} /></span>
          <span className="rc-register-card-title">Tomar foto</span>
          <span className="rc-register-card-desc">Captura medidor o documento. Datos se completan luego desde la cola o el Sheet.</span>
          <span className="rc-register-card-chips">
            <Chip size="sm">Móvil</Chip>
            <Chip size="sm">Drive</Chip>
            <Chip size="sm">Diferido</Chip>
          </span>
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { Shell, ViewSwitcher, Sidebar, RegisterHubView, RouterSync });
