// State + mock data for the Registro de Consumos prototype.
// Pure in-memory — reload resets everything.

// ----- Static catalog -----
const COMPANY = "";
const SUCURSALES = [];

const TYPES = {
  electricidad: { id: "electricidad", label: "Electricidad", unit: "kWh", icon: "bolt",          color: "var(--rl-primary-900)", bg: "var(--rl-primary-50)" },
  combustible:  { id: "combustible",  label: "Combustible",  unit: "L",   icon: "local_gas_station", color: "var(--rl-fuel)",       bg: "var(--rl-fuel-bg)" },
  agua:         { id: "agua",         label: "Agua",         unit: "m³",  icon: "water_drop",     color: "var(--rl-success-700)", bg: "var(--rl-success-50)" },
};

const INITIAL_SUBCATS = {
  electricidad: [],
  combustible: [
    { id: "diesel",      label: "Petróleo Diésel", source: "predef" },
    { id: "kerosene",    label: "Kerosene",        source: "predef" },
    { id: "glp",         label: "GLP",             source: "predef" },
    { id: "gas-natural", label: "Gas Natural",     source: "predef" },
  ],
  agua: [
    { id: "potable", label: "Agua Potable", source: "predef" },
    { id: "gris",    label: "Agua Gris",    source: "predef" },
    { id: "riego",   label: "Riego",        source: "custom" },
  ],
};

const PROVIDERS = {
  electricidad: ["CGE", "Enel", "Chilquinta", "Grupo Saesa", "Edelmag"],
  combustible:  ["Copec", "Shell", "Petrobras", "Esmax", "Enex", "YPF", "Iconstruye Petróleo", "Lipigas", "Abastible", "Gasco", "Metrogas", "Gasvalpo"],
  agua:         ["Aguas Andinas", "SMAPA", "Esval", "Essbio", "Aguas del Altiplano", "Aguas Antofagasta", "Aguas del Valle", "Aguas Araucanía", "Suralis", "Aguas Magallanes"],
};

// Fuel subcategory catalog — default + available units per combustible tipo
const FUEL_SUBCATS_CATALOG = {
  "diesel":         { label: "Petróleo Diésel", defaultUnit: "L",  units: ["L", "gal"] },
  "kerosene":       { label: "Kerosene",        defaultUnit: "L",  units: ["L", "gal"] },
  "gasolina":       { label: "Gasolina",        defaultUnit: "L",  units: ["L", "gal"] },
  "fuel-oil":       { label: "Fuel Oil",        defaultUnit: "L",  units: ["L", "gal"] },
  "glp":            { label: "GLP",             defaultUnit: "kg", units: ["kg", "L", "m³"] },
  "lena":           { label: "Leña",            defaultUnit: "kg", units: ["kg", "t"] },
  "pellets":        { label: "Pellets",         defaultUnit: "kg", units: ["kg", "t"] },
  "astillas":       { label: "Astillas",        defaultUnit: "kg", units: ["kg", "t"] },
  "carbon-vegetal": { label: "Carbón vegetal",   defaultUnit: "kg", units: ["kg", "t"] },
  "briquetas":      { label: "Briquetas",       defaultUnit: "kg", units: ["kg", "t"] },
  "gas-natural":    { label: "Gas Natural",     defaultUnit: "m³", units: ["m³", "kWh"] },
};

// ===== Emisiones GEI (Huella Chile) =====
const SCOPES = {
  1: { id: 1, label: "Alcance 1", desc: "Emisiones directas", color: "var(--rl-fuel)",        bg: "var(--rl-fuel-bg)" },
  2: { id: 2, label: "Alcance 2", desc: "Energía indirecta",  color: "var(--rl-primary-900)", bg: "var(--rl-primary-50)" },
  3: { id: 3, label: "Alcance 3", desc: "Otras indirectas",   color: "var(--rl-success-700)", bg: "var(--rl-success-50)" },
};

// Factores de emisión base de empresa (valores referenciales Huella Chile / IPCC).
// La key de combustible coincide con r.subcat; electricidad/agua usan su propio type.
const EMISSION_FACTOR_CATALOG = {
  electricidad: { label: "Electricidad — SEN",  value: 0.4156, unit: "kgCO₂e/kWh", scope: 2, type: "electricidad", fuente: "Coordinador Eléctrico Nacional 2023" },
  diesel:       { label: "Petróleo Diésel",     value: 2.696,  unit: "kgCO₂e/L",   scope: 1, type: "combustible",  fuente: "IPCC 2006 · Huella Chile" },
  kerosene:     { label: "Kerosene",            value: 2.538,  unit: "kgCO₂e/L",   scope: 1, type: "combustible",  fuente: "IPCC 2006 · Huella Chile" },
  gasolina:     { label: "Gasolina",            value: 2.271,  unit: "kgCO₂e/L",   scope: 1, type: "combustible",  fuente: "IPCC 2006 · Huella Chile" },
  "fuel-oil":   { label: "Fuel Oil",            value: 3.066,  unit: "kgCO₂e/L",   scope: 1, type: "combustible",  fuente: "IPCC 2006 · Huella Chile" },
  glp:          { label: "GLP",                 value: 2.954,  unit: "kgCO₂e/kg",  scope: 1, type: "combustible",  fuente: "IPCC 2006 · Huella Chile" },
  lena:         { label: "Leña",                value: 0.024,  unit: "kgCO₂e/kg",  scope: 1, type: "combustible",  fuente: "IPCC 2006 (no biogénico)" },
  pellets:      { label: "Pellets",             value: 0.045,  unit: "kgCO₂e/kg",  scope: 1, type: "combustible",  fuente: "IPCC 2006 (no biogénico)" },
  "gas-natural":{ label: "Gas Natural",         value: 2.022,  unit: "kgCO₂e/m³",  scope: 1, type: "combustible",  fuente: "IPCC 2006 · Huella Chile" },
  agua:         { label: "Agua potable",        value: 0.348,  unit: "kgCO₂e/m³",  scope: 3, type: "agua",         fuente: "Huella Chile · cadena de suministro" },
};

// Catálogo de refrigerantes con su GWP (potencial de calentamiento global, AR5 100 años)
const REFRIGERANTES_CATALOG = [
  { id: "r22",   label: "R-22",   gwp: 1810 },
  { id: "r410a", label: "R-410A", gwp: 2088 },
  { id: "r134a", label: "R-134a", gwp: 1430 },
  { id: "r404a", label: "R-404A", gwp: 3922 },
  { id: "r507",  label: "R-507",  gwp: 3985 },
  { id: "r32",   label: "R-32",   gwp: 675  },
];

let __rfIdC = 0;
const nextRefrigId = () => "rf" + (++__rfIdC);

// Semilla de emisiones — app data-driven: solo factores base de empresa + meta por
// defecto. Overrides y refrigerantes por sucursal se crean en runtime (keyed por suc id).
function seedEmissions() {
  const factoresEmpresa = {};
  Object.entries(EMISSION_FACTOR_CATALOG).forEach(([k, v]) => { factoresEmpresa[k] = { ...v }; });
  return {
    factoresEmpresa,
    factoresSucursal: {},      // { [sucId]: { [key]: { value, pendingReview } } }
    refrigerantesSucursal: {}, // { [sucId]: [ { uid, tipo, cargaKg, mes } ] }
    metas: {
      empresa: { absoluta: "", relativa: 30, anioBase: 2023 },
      sucursales: {},          // { [sucId]: { absoluta, relativa, anioBase } }
    },
  };
}

// ----- Sucursales config seed -----
// ID único global. Antes era un contador que arrancaba en 0 por carga de
// página → todos generaban "suc1" y se pisaban al guardar (upsert por ID).
// timestamp base36 + 4 chars aleatorios: sin colisión entre usuarios/recargas.
let __sucIdC = 0;
const nextSucId = () =>
  "suc_" + Date.now().toString(36) + "_" + (++__sucIdC) +
  Math.random().toString(36).slice(2, 6);
let __itemIdC = 0;
const nextItemId = () => "itm" + (++__itemIdC);
let __meterIdC = 0;
const nextMeterId = () => "med" + (++__meterIdC);
let __readingIdC = 0;
const nextReadingId = () => "lec" + (++__readingIdC);

// ----- Medidores seed -----
function seedMedidores() {
  return {
    selSucursal: "",            // nombre de sucursal activa seleccionada
    selType: "",                // electricidad | combustible | agua
    tab: "resumen",             // resumen | matriz | mensual | pagos
    period: "3m",               // 12m | 6m | 3m | 1m | custom:YYYY-MM:YYYY-MM
    mensualMonth: CURRENT_MONTH_KEY,
    meters: [],                 // { id, sucursal, type, nombre, numero, activo }
    readings: [],               // { id, meterId, month:"YYYY-MM", lectura:number }
    prices: [],                 // { sucursal, type, month:"YYYY-MM", precio:number }
    docs: {},                   // { [meterId+"__"+month]: { factura:{link,fileId,name}, pago:{...} } }
    loading: true,              // true hasta que el bootstrap termina de cargar del Sheet
  };
}

function seedConfigSucursales() {
  return [];
}

// ----- Month window — last 12 months anchored to today (inclusive)
const monthKey = (y, m) => `${y}-${String(m).padStart(2,"0")}`;
const months = [];
{
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 1-12
  for (let i = 11; i >= 0; i--) {
    let yy = y;
    let mm = m - i;
    while (mm <= 0) { mm += 12; yy -= 1; }
    months.push(monthKey(yy, mm));
  }
}
// Current and previous month keys (used by dashboard KPIs)
const CURRENT_MONTH_KEY = months[months.length - 1];
const PREV_MONTH_KEY    = months[months.length - 2] || CURRENT_MONTH_KEY;

let __idCounter = 1;
const nextId = () => "r" + (__idCounter++);
let __entryIdC = 0;
const nextEntryId = () => "ent" + (++__entryIdC);

// ----- Initial state -----
const initialState = {
  // routing
  view: "landing",            // landing | manual | upload | preview | dashboard | subcat | onboarding | config | config-edit | matrix | register | impacto | factores | metas | foto-hub | foto-complete | medidores | medidores-movil
  manualStep: "form",         // form | preview | success
  uploadStep: 1,              // 1 | 2 | 3 | 4 (preview)
  // fotos (módulo "Tomar foto")
  fotos: { rows: [], loading: false, error: null, invalidatedAt: 0, inflightJobs: [] },
  fotoCompleteRow: null,      // rowIndex de la fila siendo completada
  // Lista de emails a notificar cuando se sube una nueva foto pendiente.
  // Persiste en hoja Config (key "fotoNotifEmails") vía Apps Script.
  fotoNotifEmails: [],
  // domain — empty by default; populated from Google Sheets on login + refresh
  records: [],
  recordsLoading: false,
  recordsLastFetch: null,
  subcategories: INITIAL_SUBCATS,
  // config (sucursales setup, populated by onboarding or seeded)
  configSucursales: seedConfigSucursales(),
  configEditId: null,         // id of sucursal being edited
  configNewSuc: null,         // draft de sucursal nueva (aún no persistida)
  // emisiones GEI (Impacto Ambiental)
  emissions: seedEmissions(),
  emisScope: "all",           // dashboard impacto: all | 1 | 2 | 3
  emisSucursal: "all",        // factores/metas: which sucursal view ("all" = empresa)
  emisFilters: { sucursal: "all", period: "12m" }, // dashboard impacto: sucursal + período
  // matrix view (upload status grid)
  matrixMonth: CURRENT_MONTH_KEY,
  // medidores (lecturas físicas de medidores)
  medidores: seedMedidores(),
  // form drafts (manual)
  manualDraft: emptyDraft(),
  manualErrors: {},
  // upload state
  selectedProvider: null,
  uploadQueue: [],            // { id, name, size, type, status, progress, extractedCount, error }
  previewRows: [],            // rows after extraction or manual draft
  // dashboard
  dashFilters: { sucursal: "all", period: "12m", typeTab: "combustible", subcat: "all", estado: "activa" },
  recentlyEdited: null,       // id of just-saved row
  // ui
  toast: null,                // { id, kind, title, body, undoAction }
};

function emptyEntry() {
  return {
    id: nextEntryId(),
    type: "",
    subcat: "",
    provider: "",
    cantidad: "",
    costo: "",
    notes: "",
    factura: "",
    // Auto-fill de proveedor activo hasta que el usuario lo edite a mano.
    _providerAuto: true,
  };
}

function emptyDraft() {
  return {
    date: "",
    sucursal: "",
    entries: [emptyEntry()],
  };
}

// ----- Reducer -----
function reducer(state, action) {
  switch (action.type) {
    case "NAVIGATE":
      return {
        ...state,
        view: action.view,
        manualStep: action.manualStep || state.manualStep,
        uploadStep: action.uploadStep || state.uploadStep,
        fotoCompleteRow: ("fotoCompleteRow" in action) ? action.fotoCompleteRow : state.fotoCompleteRow,
      };

    // ----- Fotos (módulo Tomar foto)
    case "FOTO/LOAD_START":
      return { ...state, fotos: { ...state.fotos, loading: true, error: null } };
    case "FOTO/LOAD_OK":
      return { ...state, fotos: { ...state.fotos, loading: false, error: null, rows: action.rows || [] } };
    case "FOTO/LOAD_FAIL":
      return { ...state, fotos: { ...state.fotos, loading: false, error: action.error || "Error desconocido" } };
    case "FOTO/INVALIDATE":
      return { ...state, fotos: { ...state.fotos, invalidatedAt: state.fotos.invalidatedAt + 1 } };
    case "FOTO/JOB_START":
      return { ...state, fotos: { ...state.fotos, inflightJobs: [...(state.fotos.inflightJobs || []), action.job] } };
    case "FOTO/JOB_END":
      return { ...state, fotos: { ...state.fotos, inflightJobs: (state.fotos.inflightJobs || []).filter(j => j.id !== action.id) } };

    // ----- Notificaciones (emails para cola fotos)
    case "NOTIF/LOAD":
      return { ...state, fotoNotifEmails: Array.isArray(action.emails) ? action.emails : [] };
    case "NOTIF/SET":
      return { ...state, fotoNotifEmails: Array.isArray(action.emails) ? action.emails : [] };
    case "NOTIF/ADD": {
      const e = (action.email || "").trim();
      if (!e) return state;
      if ((state.fotoNotifEmails || []).indexOf(e) !== -1) return state;
      return { ...state, fotoNotifEmails: [...(state.fotoNotifEmails || []), e] };
    }
    case "NOTIF/REMOVE":
      return { ...state, fotoNotifEmails: (state.fotoNotifEmails || []).filter(e => e !== action.email) };

    // ----- Manual draft
    case "MANUAL/SET_SHARED_FIELD": {
      const draft = { ...state.manualDraft, [action.field]: action.value };
      // Al cambiar de sucursal: subcategorías y proveedores configurados cambian.
      // Reseteamos subcat + provider de cada consumo y reactivamos el auto-fill.
      if (action.field === "sucursal") {
        draft.entries = (draft.entries || []).map(e => ({
          ...e, subcat: "", provider: "", _providerAuto: true,
        }));
      }
      const errors = { ...state.manualErrors };
      delete errors[action.field];
      return { ...state, manualDraft: draft, manualErrors: errors };
    }
    case "MANUAL/SET_ENTRY_FIELD": {
      const entries = state.manualDraft.entries.map(e => {
        if (e.id !== action.entryId) return e;
        const next = { ...e, [action.field]: action.value };
        // Auto-fill de proveedor según config de sucursal.
        // Reglas:
        //   - type cambia → limpia subcat. Si el tipo NO tiene subcategorías,
        //     pre-selecciona proveedor. Si tiene, espera al subcat.
        //   - subcat cambia → pre-selecciona proveedor (si auto sigue activo).
        //   - El usuario edita proveedor a mano → marca _providerAuto=false y
        //     ya no se vuelve a sobrescribir mientras dure el draft.
        if (action.field === "type") {
          next.subcat = "";
          if (next._providerAuto !== false) {
            const subOpts = getSubcatsFor(state, next.type, state.manualDraft.sucursal);
            if (next.type && subOpts.length === 0) {
              const auto = getConfiguredProvider(state, state.manualDraft.sucursal, next.type, "");
              next.provider = auto || "";
            } else {
              // Tipo con subcat: espera elección de subcat.
              next.provider = "";
            }
          }
        } else if (action.field === "subcat") {
          if (next._providerAuto !== false) {
            const auto = getConfiguredProvider(state, state.manualDraft.sucursal, next.type, next.subcat);
            next.provider = auto || "";
          }
        } else if (action.field === "provider") {
          // Edición manual del proveedor — bloquea futuros auto-fills.
          next._providerAuto = false;
        }
        return next;
      });
      // Clear per-entry error for that field
      const entryErrors = { ...(state.manualErrors.entries || {}) };
      if (entryErrors[action.entryId]) {
        entryErrors[action.entryId] = { ...entryErrors[action.entryId] };
        delete entryErrors[action.entryId][action.field];
      }
      return {
        ...state,
        manualDraft: { ...state.manualDraft, entries },
        manualErrors: { ...state.manualErrors, entries: entryErrors },
      };
    }
    case "MANUAL/ADD_ENTRY":
      return { ...state, manualDraft: { ...state.manualDraft, entries: [...state.manualDraft.entries, emptyEntry()] } };
    case "MANUAL/REMOVE_ENTRY": {
      const entries = state.manualDraft.entries.filter(e => e.id !== action.entryId);
      const safe = entries.length ? entries : [emptyEntry()];
      const entryErrors = { ...(state.manualErrors.entries || {}) };
      delete entryErrors[action.entryId];
      try {
        if (window.__rcManualFacturas) delete window.__rcManualFacturas[action.entryId];
      } catch(e) {}
      return {
        ...state,
        manualDraft: { ...state.manualDraft, entries: safe },
        manualErrors: { ...state.manualErrors, entries: entryErrors },
      };
    }
    case "MANUAL/SET_ERRORS":
      return { ...state, manualErrors: action.errors };
    case "MANUAL/RESET":
      try { window.__rcManualFacturas = {}; } catch(e) {}
      return { ...state, manualDraft: emptyDraft(), manualErrors: {}, manualStep: "form" };
    case "MANUAL/GO_PREVIEW":
      return { ...state, manualStep: "preview" };
    case "MANUAL/GO_FORM":
      return { ...state, manualStep: "form" };
    case "MANUAL/CONFIRM": {
      const d = state.manualDraft;
      const facturas = (typeof window !== "undefined") ? (window.__rcManualFacturas || {}) : {};
      const newRecs = d.entries.map(e => ({
        id: nextId(),
        date: d.date,
        sucursal: d.sucursal,
        type: e.type,
        subcat: e.subcat || null,
        provider: e.provider || "—",
        cantidad: parseFloat(e.cantidad),
        unit: getEntryUnit(state, d.sucursal, e.type, e.subcat),
        costo: parseFloat(e.costo) || 0,
        origen: "manual",
        estado: "activa",
        factura: e.factura || null,
        _entryId: e.id,
      }));
      const facturasList = newRecs
        .map(r => facturas[r._entryId] ? { recordId: r.id, file: facturas[r._entryId].file, name: facturas[r._entryId].name } : null)
        .filter(Boolean);
      // strip _entryId before storing
      const cleanRecs = newRecs.map(({ _entryId, ...r }) => r);
      try { window.dispatchEvent(new CustomEvent("rc:confirm", { detail: { source: "manual", records: cleanRecs, facturas: facturasList } })); } catch(e) {}
      try { window.__rcManualFacturas = {}; } catch(e) {}
      return { ...state, records: [...cleanRecs, ...state.records], manualStep: "success", manualDraft: emptyDraft() };
    }

    // ----- Upload
    case "UPLOAD/SET_PROVIDER":
      return { ...state, selectedProvider: action.provider, uploadStep: 2 };
    case "UPLOAD/SET_STEP":
      return { ...state, uploadStep: action.step };
    case "UPLOAD/ENQUEUE":
      return { ...state, uploadQueue: [...state.uploadQueue, ...action.files] };
    case "UPLOAD/UPDATE_FILE": {
      return {
        ...state,
        uploadQueue: state.uploadQueue.map(f => f.id === action.id ? { ...f, ...action.patch } : f),
      };
    }
    case "UPLOAD/REMOVE_FILE":
      return { ...state, uploadQueue: state.uploadQueue.filter(f => f.id !== action.id) };
    case "UPLOAD/SET_PREVIEW_ROWS":
      return { ...state, previewRows: action.rows };
    case "UPLOAD/RESET":
      return { ...state, selectedProvider: null, uploadQueue: [], previewRows: [], uploadStep: 1 };

    // ----- Preview editable table
    case "PREVIEW/UPDATE_ROW":
      return { ...state, previewRows: state.previewRows.map(r => r.id === action.id ? { ...r, ...action.patch } : r) };
    case "PREVIEW/DUPLICATE_ROW": {
      const idx = state.previewRows.findIndex(r => r.id === action.id);
      if (idx < 0) return state;
      const copy = { ...state.previewRows[idx], id: nextId(), status: "ok", _justDuplicated: true };
      const next = [...state.previewRows];
      next.splice(idx + 1, 0, copy);
      return { ...state, previewRows: next };
    }
    case "PREVIEW/DELETE_ROW":
      return { ...state, previewRows: state.previewRows.filter(r => r.id !== action.id) };
    case "PREVIEW/CONFIRM_ALL": {
      // turn previewRows into records
      const newRecs = state.previewRows
        .filter(r => r.status !== "error")
        .map(r => ({
          id: nextId(),
          date: r.date,
          sucursal: r.sucursal,
          type: r.type,
          subcat: r.subcat || null,
          provider: r.provider,
          cantidad: parseFloat(r.cantidad),
          unit: TYPES[r.type].unit,
          costo: parseFloat(r.costo) || 0,
          origen: "documento",
          estado: "activa",
          // surface document filename for the detail-table "Documento" column
          factura: r.sourceFile || null,
          // metadata for Sheets/Drive sync layer
          sourceFile: r.sourceFile || null,
          numeroCliente: r.numeroCliente || "",
        }));
      try { window.dispatchEvent(new CustomEvent("rc:confirm", { detail: { source: "upload", provider: state.selectedProvider, records: newRecs, files: state.uploadQueue } })); } catch(e) {}
      return { ...state, records: [...newRecs, ...state.records], previewRows: [], uploadQueue: [], selectedProvider: null, uploadStep: 1 };
    }

    // ----- Dashboard
    case "DASH/SET_FILTER":
      return { ...state, dashFilters: { ...state.dashFilters, [action.key]: action.value, ...(action.key === "typeTab" ? { subcat: "all" } : {}) } };
    case "DASH/EDIT_RECORD": {
      const old = state.records.find(r => r.id === action.id);
      return {
        ...state,
        records: state.records.map(r => r.id === action.id ? { ...r, ...action.patch } : r),
        recentlyEdited: action.id,
        _undoSnapshot: { id: action.id, before: old },
      };
    }
    case "DASH/CLEAR_EDIT_HIGHLIGHT":
      return { ...state, recentlyEdited: null };
    case "DASH/DELETE_RECORD":
      return {
        ...state,
        records: state.records.map(r => r.id === action.id ? { ...r, estado: "eliminada" } : r),
      };
    case "DASH/RESTORE_RECORD":
      return {
        ...state,
        records: state.records.map(r => r.id === action.id ? { ...r, estado: "activa" } : r),
      };
    case "DASH/UNDO_EDIT": {
      const snap = state._undoSnapshot;
      if (!snap) return state;
      return {
        ...state,
        records: state.records.map(r => r.id === snap.id ? snap.before : r),
        recentlyEdited: snap.id,
        _undoSnapshot: null,
      };
    }

    // ----- Subcategories
    case "SUBCAT/ADD": {
      const sub = { id: action.id, label: action.label, source: "custom" };
      return {
        ...state,
        subcategories: {
          ...state.subcategories,
          [action.type]: [...state.subcategories[action.type], sub],
        },
      };
    }
    case "SUBCAT/REMOVE": {
      return {
        ...state,
        subcategories: {
          ...state.subcategories,
          [action.type]: state.subcategories[action.type].filter(s => s.id !== action.id),
        },
      };
    }

    // ----- Records (loaded from Google Sheets)
    case "RECORDS/REPLACE":
      return { ...state, records: action.records || [], recordsLastFetch: Date.now(), recordsLoading: false };
    case "RECORDS/LOADING":
      return { ...state, recordsLoading: !!action.loading };

    // ----- Config (sucursales)
    case "CONFIG/LOAD": {
      const _defaultItems = {
        electricidad:  { activo: false, subcats: [] },
        combustible:   { activo: false, subcats: [] },
        agua:          { activo: false, subcats: [] },
        refrigerantes: { activo: false, subcats: [] },
      };
      const _norm = (s) => ({
        ...s,
        items: s.items ? {
          electricidad:  { ..._defaultItems.electricidad,  ...s.items.electricidad  },
          combustible:   { ..._defaultItems.combustible,   ...s.items.combustible   },
          agua:          { ..._defaultItems.agua,           ...s.items.agua          },
          refrigerantes: { ..._defaultItems.refrigerantes, ...s.items.refrigerantes },
        } : _defaultItems,
      });
      // Keep any new sucursales added this session that aren't in the loaded data
      const _loadedIds = new Set(action.configSucursales.map(s => s.id));
      const _newEntries = state.configSucursales.filter(s => !_loadedIds.has(s.id));
      return {
        ...state,
        configSucursales: [...action.configSucursales.map(_norm), ..._newEntries],
      };
    }
    case "CONFIG/EDIT_SUC":
      return { ...state, view: "config-edit", configEditId: action.id };
    case "CONFIG/TOGGLE_ACTIVE":
      return {
        ...state,
        configSucursales: state.configSucursales.map(s =>
          s.id === action.id ? { ...s, activa: !s.activa } : s
        ),
      };
    case "CONFIG/DELETE_SUC":
      return {
        ...state,
        configSucursales: state.configSucursales.filter(s => s.id !== action.id),
      };
    case "CONFIG/SAVE_SUC": {
      // Upsert: si ya existe la actualiza; si es nueva (venía de configNewSuc)
      // la agrega. Recién aquí entra a configSucursales → recién aquí persiste.
      const _exists = state.configSucursales.some(s => s.id === action.suc.id);
      const _list = _exists
        ? state.configSucursales.map(s => s.id === action.suc.id ? action.suc : s)
        : [...state.configSucursales, action.suc];
      return {
        ...state,
        configSucursales: _list,
        configNewSuc: null,
        view: "config",
        configEditId: null,
      };
    }
    case "CONFIG/ADD_SUC": {
      // NO se agrega a configSucursales todavía (si no, el sync la guardaría
      // aunque el usuario cancele). Vive como draft hasta CONFIG/SAVE_SUC.
      const newSuc = {
        id: nextSucId(),
        nombre: "",
        direccion: "",
        activa: true,
        items: {
          electricidad: { activo: false, subcats: [] },
          combustible: { activo: false, subcats: [] },
          agua: { activo: false, subcats: [] },
          refrigerantes: { activo: false, subcats: [] },
        },
      };
      return {
        ...state,
        configNewSuc: newSuc,
        view: "config-edit",
        configEditId: newSuc.id,
      };
    }
    case "CONFIG/CANCEL_EDIT":
      // Descarta cualquier draft de sucursal nueva sin persistir.
      return { ...state, configNewSuc: null, view: "config", configEditId: null };
    case "CONFIG/RENAME_HISTORY":
      return {
        ...state,
        records: state.records.map(r =>
          r.sucursal === action.oldName ? { ...r, sucursal: action.newName } : r
        ),
      };
    case "CONFIG/CREATE_PROJECT": {
      // Aditivo: agrega/actualiza por ID sin borrar las sucursales existentes.
      // Antes reemplazaba la lista completa → al re-entrar y crear otra, se
      // perdían las anteriores.
      const newSucs = action.sucursales.map(s => ({
        id: s.id,
        nombre: s.nombre.trim(),
        direccion: s.direccion || "",
        activa: true,
        items: action.items[s.id] || {
          electricidad: { activo: false, subcats: [] },
          combustible: { activo: false, subcats: [] },
          agua: { activo: false, subcats: [] },
          refrigerantes: { activo: false, subcats: [] },
        },
      }));
      const _incomingIds = new Set(newSucs.map(s => s.id));
      const _kept = state.configSucursales.filter(s => !_incomingIds.has(s.id));
      return { ...state, configSucursales: [..._kept, ...newSucs] };
    }

    // ----- Emisiones GEI
    case "EMIS/SET_VIEW_SUC":
      return { ...state, emisSucursal: action.sucId };
    case "EMIS/SET_SCOPE":
      return { ...state, emisScope: action.scope };
    case "EMIS/SET_FILTER":
      return { ...state, emisFilters: { ...state.emisFilters, [action.key]: action.value } };
    case "EMIS/LOAD":
      return { ...state, emissions: mergeEmissions(action.emissions) };
    case "EMIS/SET_COMPANY_FACTOR": {
      const emp = { ...state.emissions.factoresEmpresa };
      emp[action.key] = { ...emp[action.key], value: action.value };
      return { ...state, emissions: { ...state.emissions, factoresEmpresa: emp } };
    }
    case "EMIS/OVERRIDE_SUC_FACTOR": {
      const fs = { ...state.emissions.factoresSucursal };
      const cur = { ...(fs[action.sucId] || {}) };
      cur[action.key] = { value: action.value, pendingReview: false };
      fs[action.sucId] = cur;
      return { ...state, emissions: { ...state.emissions, factoresSucursal: fs } };
    }
    case "EMIS/RESET_SUC_FACTOR": {
      const fs = { ...state.emissions.factoresSucursal };
      if (fs[action.sucId]) {
        const cur = { ...fs[action.sucId] };
        delete cur[action.key];
        fs[action.sucId] = cur;
      }
      return { ...state, emissions: { ...state.emissions, factoresSucursal: fs } };
    }
    case "EMIS/ACK_PENDING": {
      const fs = { ...state.emissions.factoresSucursal };
      if (fs[action.sucId] && fs[action.sucId][action.key]) {
        const cur = { ...fs[action.sucId] };
        cur[action.key] = { ...cur[action.key], pendingReview: false };
        fs[action.sucId] = cur;
      }
      return { ...state, emissions: { ...state.emissions, factoresSucursal: fs } };
    }
    case "EMIS/ADD_REFRIG": {
      const rs = { ...state.emissions.refrigerantesSucursal };
      const list = [...(rs[action.sucId] || [])];
      list.push({ uid: nextRefrigId(), tipo: action.tipo, cargaKg: action.cargaKg, mes: CURRENT_MONTH_KEY });
      rs[action.sucId] = list;
      return { ...state, emissions: { ...state.emissions, refrigerantesSucursal: rs } };
    }
    case "EMIS/UPDATE_REFRIG": {
      const rs = { ...state.emissions.refrigerantesSucursal };
      rs[action.sucId] = (rs[action.sucId] || []).map(r => r.uid === action.uid ? { ...r, ...action.patch } : r);
      return { ...state, emissions: { ...state.emissions, refrigerantesSucursal: rs } };
    }
    case "EMIS/REMOVE_REFRIG": {
      const rs = { ...state.emissions.refrigerantesSucursal };
      rs[action.sucId] = (rs[action.sucId] || []).filter(r => r.uid !== action.uid);
      return { ...state, emissions: { ...state.emissions, refrigerantesSucursal: rs } };
    }
    case "EMIS/SET_META_EMPRESA":
      return { ...state, emissions: { ...state.emissions, metas: { ...state.emissions.metas, empresa: { ...state.emissions.metas.empresa, ...action.patch } } } };
    case "EMIS/SET_META_SUC": {
      const sucs = { ...state.emissions.metas.sucursales };
      sucs[action.sucId] = { ...(sucs[action.sucId] || { absoluta: "", relativa: "", anioBase: state.emissions.metas.empresa.anioBase }), ...action.patch };
      return { ...state, emissions: { ...state.emissions, metas: { ...state.emissions.metas, sucursales: sucs } } };
    }
    case "EMIS/CLEAR_META_SUC": {
      const sucs = { ...state.emissions.metas.sucursales };
      delete sucs[action.sucId];
      return { ...state, emissions: { ...state.emissions, metas: { ...state.emissions.metas, sucursales: sucs } } };
    }

    // ----- Matrix view
    case "MATRIX/SET_MONTH":
      return { ...state, matrixMonth: action.month };

    // ----- Medidores
    case "MED/SET_SUCURSAL":
      return { ...state, medidores: { ...state.medidores, selSucursal: action.sucursal } };
    case "MED/SET_TYPE":
      return { ...state, medidores: { ...state.medidores, selType: action.tipo } };
    case "MED/SET_TAB":
      return { ...state, medidores: { ...state.medidores, tab: action.tab } };
    case "MED/SET_PERIOD":
      return { ...state, medidores: { ...state.medidores, period: action.period } };
    case "MED/SET_MENSUAL_MONTH":
      return { ...state, medidores: { ...state.medidores, mensualMonth: action.month } };
    case "MED/ADD_METER": {
      const meter = {
        id: nextMeterId(),
        sucursal: action.sucursal,
        type: action.tipo,
        nombre: (action.nombre || "").trim(),
        numero: (action.numero || "").trim(),
        activo: true,
      };
      return { ...state, medidores: { ...state.medidores, meters: [...state.medidores.meters, meter] } };
    }
    case "MED/EDIT_METER": {
      const meters = state.medidores.meters.map(m =>
        m.id === action.id ? { ...m, ...action.patch } : m
      );
      return { ...state, medidores: { ...state.medidores, meters } };
    }
    case "MED/TOGGLE_METER": {
      const meters = state.medidores.meters.map(m =>
        m.id === action.id ? { ...m, activo: !m.activo } : m
      );
      return { ...state, medidores: { ...state.medidores, meters } };
    }
    case "MED/SET_READING": {
      const { meterId, month } = action;
      const empty = action.lectura === "" || action.lectura == null || isNaN(action.lectura);
      let readings = state.medidores.readings.filter(r => !(r.meterId === meterId && r.month === month));
      if (!empty) {
        readings = [...readings, { id: nextReadingId(), meterId, month, lectura: Number(action.lectura) }];
      }
      return { ...state, medidores: { ...state.medidores, readings } };
    }
    case "MED/SET_PRICE": {
      const { sucursal, tipo, month } = action;
      const empty = action.precio === "" || action.precio == null || isNaN(action.precio);
      let prices = state.medidores.prices.filter(p => !(p.sucursal === sucursal && p.type === tipo && p.month === month));
      if (!empty) {
        prices = [...prices, { sucursal, type: tipo, month, precio: Number(action.precio) }];
      }
      return { ...state, medidores: { ...state.medidores, prices } };
    }
    case "MED/SET_DOC": {
      const key = action.meterId + "__" + action.month;
      const cur = { ...(state.medidores.docs[key] || {}) };
      cur[action.kind] = action.doc;   // { link, fileId, name } o null para limpiar
      const docs = { ...state.medidores.docs, [key]: cur };
      return { ...state, medidores: { ...state.medidores, docs } };
    }
    case "MED/SET_LOADING":
      return { ...state, medidores: { ...state.medidores, loading: !!action.loading } };
    case "MED/LOAD": {
      // Adelanta los contadores para no recrear ids ya usados al guardar de nuevo.
      (action.meters || []).forEach(m => {
        const n = /^med(\d+)$/.exec(m && m.id || "");
        if (n) __meterIdC = Math.max(__meterIdC, parseInt(n[1], 10));
      });
      (action.readings || []).forEach(r => {
        const n = /^lec(\d+)$/.exec(r && r.id || "");
        if (n) __readingIdC = Math.max(__readingIdC, parseInt(n[1], 10));
      });
      return {
        ...state,
        medidores: {
          ...state.medidores,
          meters:   action.meters   || [],
          readings: action.readings || [],
          prices:   action.prices   || [],
          docs:     action.docs     || {},
          loading:  false,
        },
      };
    }

    // ----- Toast
    case "TOAST/SHOW":
      return { ...state, toast: { id: Date.now(), ...action.toast } };
    case "TOAST/HIDE":
      return { ...state, toast: null };

    default:
      return state;
  }
}

// ----- Context provider -----
const StateContext = React.createContext(null);

// Emisiones — persistencia en localStorage (fallback) + Sheets (canónico).
const EMISSIONS_LS_KEY = "rcEmissionsV1";

// Mergea un objeto emisiones parcial sobre la semilla — preserva metadata del
// catálogo (label/unit/scope/fuente) y solo aplica los valores guardados.
function mergeEmissions(src) {
  const base = seedEmissions();
  if (!src || typeof src !== "object") return base;
  if (src.factoresEmpresa) {
    Object.keys(base.factoresEmpresa).forEach(k => {
      const s = src.factoresEmpresa[k];
      if (s && typeof s.value === "number") base.factoresEmpresa[k].value = s.value;
    });
  }
  if (src.factoresSucursal && typeof src.factoresSucursal === "object") {
    base.factoresSucursal = src.factoresSucursal;
  }
  if (src.refrigerantesSucursal && typeof src.refrigerantesSucursal === "object") {
    base.refrigerantesSucursal = src.refrigerantesSucursal;
    let maxN = 0;
    Object.values(src.refrigerantesSucursal).forEach(arr => {
      (arr || []).forEach(r => {
        const m = /^rf(\d+)$/.exec((r && r.uid) || "");
        if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
      });
    });
    if (maxN > __rfIdC) __rfIdC = maxN;
  }
  if (src.metas && typeof src.metas === "object") {
    base.metas = {
      empresa:    { ...base.metas.empresa,    ...(src.metas.empresa    || {}) },
      sucursales: { ...base.metas.sucursales, ...(src.metas.sucursales || {}) },
    };
  }
  return base;
}

function loadEmissions() {
  try {
    const raw = window.localStorage.getItem(EMISSIONS_LS_KEY);
    if (!raw) return seedEmissions();
    return mergeEmissions(JSON.parse(raw));
  } catch (e) {
    return seedEmissions();
  }
}

function saveEmissions(emissions) {
  try { window.localStorage.setItem(EMISSIONS_LS_KEY, JSON.stringify(emissions)); } catch (e) {}
}

const StateProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(
    reducer,
    initialState,
    (s) => ({ ...s, emissions: loadEmissions() })
  );
  // Persistir emisiones al cambiar
  React.useEffect(() => {
    saveEmissions(state.emissions);
  }, [state.emissions]);
  // auto-hide toast after 4.5s
  React.useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: "TOAST/HIDE" }), 4500);
    return () => clearTimeout(t);
  }, [state.toast?.id]);
  // clear edit-highlight after 2.5s
  React.useEffect(() => {
    if (!state.recentlyEdited) return;
    const t = setTimeout(() => dispatch({ type: "DASH/CLEAR_EDIT_HIGHLIGHT" }), 2500);
    return () => clearTimeout(t);
  }, [state.recentlyEdited]);
  return <StateContext.Provider value={{ state, dispatch }}>{children}</StateContext.Provider>;
};

const useApp = () => React.useContext(StateContext);

// ----- Derived data helpers -----
function fmtCLP(n) {
  if (n == null || isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString("es-CL");
}
function fmtNum(n) {
  if (n == null || isNaN(n)) return "—";
  return Math.round(n).toLocaleString("es-CL");
}
function fmtTon(n, dec = 1) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(iso) {
  if (!iso) return "—";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
// Format an ISO-ish datetime ("2026-06-25T09:35:12.345Z" o "2026-06-25 09:35:12")
// to "DD/MM/YY HH:mm" en horario local. Devuelve "—" si no parsea.
function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    const str = String(s).trim();
    return str ? str : "—";
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function monthLabelShort(mk) {
  const [y, m] = mk.split("-");
  const names = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return names[parseInt(m, 10) - 1] + " " + y.slice(2);
}
// Enumerate month keys (YYYY-MM) between start and end inclusive, chronological.
// Tolerant of reversed args (swaps) and caps span to avoid runaway ranges.
function monthKeysInRange(start, end) {
  if (!start || !end) return [];
  if (start > end) { const t = start; start = end; end = t; }
  const [ys, ms] = start.split("-").map(n => parseInt(n, 10));
  const [ye, me] = end.split("-").map(n => parseInt(n, 10));
  const out = [];
  let y = ys, m = ms, guard = 0;
  while ((y < ye || (y === ye && m <= me)) && guard++ < 240) {
    out.push(monthKey(y, m));
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
// Parse a custom period string "custom:YYYY-MM:YYYY-MM" → { start, end } or null.
function parseCustomPeriod(period) {
  if (typeof period !== "string" || !period.startsWith("custom:")) return null;
  const [, start, end] = period.split(":");
  if (!start || !end) return null;
  return { start, end };
}
function periodToMonthKeys(period) {
  // return array of month keys (in chronological order) for the period
  const custom = parseCustomPeriod(period);
  if (custom) return monthKeysInRange(custom.start, custom.end);
  if (period === "12m") return months.slice();
  if (period === "6m")  return months.slice(-6);
  if (period === "3m")  return months.slice(-3);
  if (period === "1m")  return months.slice(-1);
  return months.slice();
}
function periodLabel(period) {
  const [yc, mc] = CURRENT_MONTH_KEY.split("-");
  const names = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const curLabel = names[parseInt(mc, 10) - 1] + " " + yc;
  const custom = parseCustomPeriod(period);
  if (custom) return monthLabelShort(custom.start) + " — " + monthLabelShort(custom.end);
  return {
    "12m": "Últimos 12 meses",
    "6m":  "Últimos 6 meses",
    "3m":  "Últimos 3 meses",
    "1m":  "Mes actual (" + curLabel + ")",
  }[period] || period;
}
// Names of active sucursales from current config — replaces the old static SUCURSALES list
function activeSucNames(state) {
  return (state?.configSucursales || []).filter(s => s.activa).map(s => s.nombre);
}

// Map an agua subcat (from configSucursales) to a stable record-level id + label.
// Predefined tipos use their value as id (e.g. "potable"); custom ones use "otro:<slug>".
function aguaSubcatFromConfig(sc) {
  if (!sc?.tipo) return null;
  if (sc.tipo === "__otro") {
    const name = (sc.tipoCustom || "").trim();
    if (!name) return null;
    return { id: "otro:" + name.toLowerCase().replace(/\s+/g, "-"), label: name, source: "config" };
  }
  const labels = { potable: "Potable", gris: "Gris", industrial: "Industrial" };
  return { id: sc.tipo, label: labels[sc.tipo] || sc.tipo, source: "config" };
}

// Map a combustible subcat (from configSucursales) to a record-level option.
// Predefined tipos use their value as id (e.g. "diesel"); custom → "otro:<slug>".
// Lleva la unidad de medida configurada en la sucursal.
function combustibleSubcatFromConfig(sc) {
  if (!sc?.tipo) return null;
  if (sc.tipo === "__otro") {
    const name = (sc.tipoCustom || "").trim();
    if (!name) return null;
    return { id: "otro:" + name.toLowerCase().replace(/\s+/g, "-"), label: name, unidad: sc.unidad || "", source: "config" };
  }
  const cat = FUEL_SUBCATS_CATALOG[sc.tipo];
  return { id: sc.tipo, label: cat ? cat.label : sc.tipo, unidad: sc.unidad || (cat ? cat.defaultUnit : ""), source: "config" };
}

// Subcategoría options for a given consumption type.
// Para "agua" y "combustible" derivan de los tipos configurados en configSucursales.
// Si se pasa `sucursalName`, acota a esa sucursal (registro individual); si no,
// agrega los de todas las sucursales activas (dashboard). Otros tipos → INITIAL_SUBCATS.
function getSubcatsFor(state, type, sucursalName) {
  if (type === "agua" || type === "combustible") {
    const fromCfg = type === "agua" ? aguaSubcatFromConfig : combustibleSubcatFromConfig;
    const seen = new Map();
    (state?.configSucursales || []).forEach(s => {
      if (!s.activa || !s.items?.[type]?.activo) return;
      if (sucursalName && s.nombre !== sucursalName) return;
      s.items[type].subcats.forEach(sc => {
        const opt = fromCfg(sc);
        if (opt && !seen.has(opt.id)) seen.set(opt.id, opt);
      });
    });
    return [...seen.values()];
  }
  return state?.subcategories?.[type] || INITIAL_SUBCATS[type] || [];
}

// Unidad de medida para un consumo. Combustible usa la unidad configurada en la
// subcategoría de la sucursal; el resto usa la unidad estándar del tipo.
function getEntryUnit(state, sucursalName, type, subcatId) {
  if (type === "combustible" && subcatId) {
    const opt = getSubcatsFor(state, "combustible", sucursalName).find(o => o.id === subcatId);
    if (opt && opt.unidad) return opt.unidad;
  }
  return TYPES[type] ? TYPES[type].unit : "";
}

// Resolve a configured provider name from a sucursal subcat. Returns the proveedorCustom
// when proveedor === "__otro", or the plain proveedor name. Empty string if not set.
function _resolveProviderName(sc) {
  if (!sc) return "";
  if (sc.proveedor === "__otro") return (sc.proveedorCustom || "").trim();
  return sc.proveedor || "";
}

// Lookup a default provider for (sucursal, type, subcatId) from configSucursales.
// - For agua/combustible: match the subcat whose tipo derives to subcatId.
// - For electricidad/refrigerantes: subcatId is ignored; use the first subcat with a provider.
// Returns "" if no configured provider found.
function getConfiguredProvider(state, sucursalName, type, subcatId) {
  if (!sucursalName || !type) return "";
  const suc = (state?.configSucursales || []).find(s => s.activa && s.nombre === sucursalName);
  if (!suc || !suc.items?.[type]?.activo) return "";
  const subcats = suc.items[type].subcats || [];
  if (type === "agua" && subcatId) {
    const match = subcats.find(sc => {
      const opt = aguaSubcatFromConfig(sc);
      return opt && opt.id === subcatId;
    });
    if (match) return _resolveProviderName(match);
  }
  if (type === "combustible" && subcatId) {
    const match = subcats.find(sc => sc.tipo === subcatId);
    if (match) return _resolveProviderName(match);
  }
  // Fallback: first subcat with a provider
  for (const sc of subcats) {
    const p = _resolveProviderName(sc);
    if (p) return p;
  }
  return "";
}

// Provider <Select> options for (sucursal, type): configured providers from the sucursal
// (resolved to their display names) merged with the static PROVIDERS catalog. Deduped.
function getProviderOptionsFor(state, sucursalName, type) {
  if (!type) return [];
  const out = [];
  const seen = new Set();
  const push = (name) => {
    const v = (name || "").trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };
  const suc = (state?.configSucursales || []).find(s => s.activa && s.nombre === sucursalName);
  if (suc && suc.items?.[type]?.activo) {
    suc.items[type].subcats.forEach(sc => push(_resolveProviderName(sc)));
  }
  (PROVIDERS[type] || []).forEach(push);
  return out;
}

// Normaliza un número de cliente para comparar. Quita puntos/espacios y el
// dígito verificador final ("12.345.678-9" → "12345678"), así matchea aunque
// la factura lo traiga y la config no (o viceversa).
function normNumCliente(s) {
  let t = String(s || "").trim().toLowerCase().replace(/[\s.]/g, "");
  t = t.replace(/-[0-9k]$/, "");        // dígito verificador estilo RUT
  return t.replace(/[^a-z0-9]/g, "");
}

// Busca en la config qué sucursal/subcat/proveedor corresponde a un número de
// cliente extraído de una factura. `type` (opcional) acota la búsqueda al tipo.
// Devuelve { sucursal, type, subcat, provider } o null si no hay match.
function resolveByNumCliente(state, numeroCliente, type) {
  const target = normNumCliente(numeroCliente);
  if (!target) return null;
  const types = type ? [type] : ["electricidad", "combustible", "agua", "refrigerantes"];
  for (const suc of (state?.configSucursales || [])) {
    if (!suc.activa) continue;
    for (const t of types) {
      const item = suc.items?.[t];
      if (!item || !item.activo) continue;
      for (const sc of (item.subcats || [])) {
        if (normNumCliente(sc.numCliente) !== target) continue;
        let subcat = null;
        if (t === "agua") { const opt = aguaSubcatFromConfig(sc); subcat = opt ? opt.id : null; }
        else if (t === "combustible" || t === "refrigerantes") subcat = sc.tipo || null;
        return { sucursal: suc.nombre, type: t, subcat, provider: _resolveProviderName(sc) };
      }
    }
  }
  return null;
}

function subcatLabel(type, id) {
  if (!id) return null;
  // Custom agua tipo: "otro:slug" — rebuild label from slug
  if (type === "agua" && id.startsWith("otro:")) {
    return id.slice(5).split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  if (type === "agua") {
    return ({ potable: "Potable", gris: "Gris", industrial: "Industrial" })[id] || id;
  }
  // Combustible: custom "otro:slug" o tipo del catálogo de combustibles
  if (type === "combustible") {
    if (id.startsWith("otro:")) {
      return id.slice(5).split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return FUEL_SUBCATS_CATALOG[id] ? FUEL_SUBCATS_CATALOG[id].label : id;
  }
  const list = INITIAL_SUBCATS[type] || [];
  const found = list.find(s => s.id === id);
  return found ? found.label : id;
}

Object.assign(window, {
  StateProvider, StateContext, useApp,
  COMPANY, SUCURSALES, TYPES, INITIAL_SUBCATS, PROVIDERS, FUEL_SUBCATS_CATALOG,
  SCOPES, EMISSION_FACTOR_CATALOG, REFRIGERANTES_CATALOG,
  months, nextId,
  CURRENT_MONTH_KEY, PREV_MONTH_KEY,
  fmtCLP, fmtNum, fmtTon, fmtDate, fmtDateTime, monthLabelShort,
  periodToMonthKeys, periodLabel, monthKeysInRange, parseCustomPeriod, subcatLabel, activeSucNames, getSubcatsFor,
  combustibleSubcatFromConfig, getEntryUnit,
  getConfiguredProvider, getProviderOptionsFor,
  normNumCliente, resolveByNumCliente,
});
