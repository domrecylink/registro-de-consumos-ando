// Shell — top-level layout: collapsible sidebar + main content + toast

// =========================================================
// Hash router — keeps URL in sync with state.view
// =========================================================
const VIEW_HASH = {
  landing:        "/",
  dashboard:      "/dashboard",
  register:       "/registrar",
  manual:         "/registrar/manual",
  upload:         "/registrar/subir",
  "foto-capture": "/registrar/foto",
  "foto-cola":    "/fotos",
  "foto-complete":"/fotos/completar",
  config:         "/configuracion",
  "config-edit":  "/configuracion/editar",
  matrix:         "/matriz",
  impacto:        "/impacto",
  factores:       "/impacto/factores",
  metas:          "/impacto/metas",
  onboarding:     "/onboarding",
};
const HASH_VIEW = Object.fromEntries(Object.entries(VIEW_HASH).map(([v, h]) => [h, v]));

function hashToView() {
  const h = window.location.hash.replace(/^#/, "") || "/";
  return HASH_VIEW[h] || "landing";
}

const RouterSync = () => {
  const { state, dispatch } = useApp();

  // state.view → hash
  React.useEffect(() => {
    const next = VIEW_HASH[state.view] || "/";
    const cur  = window.location.hash.replace(/^#/, "") || "/";
    if (cur !== next) window.location.hash = next;
  }, [state.view]);

  // hash → state.view (back/forward + direct URL)
  React.useEffect(() => {
    const initial = hashToView();
    if (initial !== state.view) dispatch({ type: "NAVIGATE", view: initial });

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
    </div>
  );
};

// Views that depend on synced records and should show the loader while the
// first fetch is in flight. Onboarding/config/register don't need records.
const DATA_DRIVEN_VIEWS = new Set(["landing", "dashboard", "matrix", "impacto", "factores", "metas"]);

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
    case "impacto":     return <ImpactoView />;
    case "factores":    return <FactoresView />;
    case "metas":       return <MetasView />;
    case "register":     return <RegisterHubView />;
    case "foto-capture": return <FotoCaptureView />;
    case "foto-cola":    return <FotoColaView />;
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
  { view: "foto-cola",  label: "Fotos",         icon: "photo_camera",  extra: {} },
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
            <span className="rc-sidebar-logo">R</span>
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
            || (it.view === "register" && (state.view === "manual" || state.view === "upload" || state.view === "foto-capture"))
            || (it.view === "foto-cola" && state.view === "foto-complete");
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

      <div className="rc-sidebar-foot">
        <button
          className="rc-sidebar-item rc-sidebar-reset"
          onClick={() => window.location.reload()}
          data-tooltip="Reiniciar prototipo"
        >
          <span className="rc-sidebar-item-ico"><Icon name="refresh" size={18} /></span>
          <span className="rc-sidebar-item-label">Reset</span>
        </button>
      </div>
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
          onClick={() => dispatch({ type: "NAVIGATE", view: "foto-capture" })}
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
