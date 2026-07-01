// Matriz de estado de carga — sucursales × tipos de consumo.
// Each cell shows whether the (sucursal × tipo × subcat) for the selected month
// has a record loaded. Three states: Cargado / Pendiente / N/A.
// Tipo columns are expandable to show per-subcategoría detail.

const MATRIX_TYPES = [
  { id: "electricidad",  label: "Electricidad",  icon: "bolt",              color: "var(--rl-primary-900)", bg: "var(--rl-primary-50)" },
  { id: "combustible",   label: "Combustible",   icon: "local_gas_station", color: "var(--rl-fuel)",        bg: "var(--rl-fuel-bg)" },
  { id: "agua",          label: "Agua",          icon: "water_drop",        color: "var(--rl-success-700)", bg: "var(--rl-success-50)" },
  { id: "refrigerantes", label: "Refrigerantes", icon: "snowflake",         color: "#0891B2",               bg: "#ECFEFF" },
];

// Match a record's subcat to a configured subcat depending on the consumption type.
// - electricidad records don't carry subcat → any record in that sucursal+month counts for all
//   configured electricidad subcats (we can't disambiguate which provider/sistema).
// - combustible / refrigerantes: record.subcat === cfgSub.tipo
// - agua: use aguaSubcatFromConfig() to derive the id.
function matrixMatches(rec, cfgSub, type) {
  if (type === "electricidad") return true;
  if (type === "combustible")  return rec.subcat === cfgSub.tipo;
  if (type === "refrigerantes") return rec.subcat === cfgSub.tipo;
  if (type === "agua") {
    const opt = aguaSubcatFromConfig(cfgSub);
    return opt ? rec.subcat === opt.id : false;
  }
  return false;
}

// today >= first day of (monthKey + 1) — "el período ya cerró"
function matrixIsOverdue(monthKey) {
  if (!monthKey) return false;
  const [y, m] = monthKey.split("-").map(Number);
  // new Date(y, m, 1) is the first day of the NEXT calendar month (Date months are 0-indexed,
  // and the monthKey month is 1-indexed → m+1-1 = m).
  const cutoff = new Date(y, m, 1);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return today >= cutoff;
}

// Compute the status of a single (sucursal × tipo × cfgSub × month) cell.
// Returns: "cargado" | "pendiente" | "pendiente-soft" | "na".
function matrixCellStatus({ records, sucursal, type, cfgSub, monthKey, overdue }) {
  const hit = records.some(r =>
    r.estado !== "eliminada"
    && r.sucursal === sucursal
    && r.type === type
    && r.date.startsWith(monthKey)
    && matrixMatches(r, cfgSub, type)
  );
  if (hit) return "cargado";
  return overdue ? "pendiente" : "pendiente-soft";
}

// Aggregate per-tipo (collapsed cell) status from N subcat statuses.
function matrixAggregateStatus(subStatuses) {
  if (subStatuses.length === 0) return "na";
  if (subStatuses.every(s => s === "cargado")) return "cargado";
  if (subStatuses.some(s => s === "pendiente")) return "pendiente";
  if (subStatuses.some(s => s === "pendiente-soft")) return "pendiente-soft";
  return "na";
}

// ============================================================
// Components
// ============================================================
const MatrixCellIcon = ({ status }) => {
  if (status === "cargado")        return <Icon name="check" size={18} style={{ color: "var(--rl-success-600)" }} />;
  if (status === "pendiente")      return <Icon name="close" size={18} style={{ color: "var(--rl-error-500)" }} />;
  if (status === "pendiente-soft") return <Icon name="close" size={16} style={{ color: "var(--rl-gray-300)" }} />;
  return <span style={{ color: "var(--rl-gray-300)", font: "600 16px/1 var(--rl-font-display)" }}>—</span>;
};

const UploadMatrixView = () => {
  const { state, dispatch } = useApp();
  const monthKey = state.matrixMonth || CURRENT_MONTH_KEY;
  const overdue = matrixIsOverdue(monthKey);
  const sucursales = state.configSucursales.filter(s => s.activa);

  // Track which tipo columns are expanded
  const [expanded, setExpanded] = React.useState({}); // { electricidad: true, ... }
  const toggle = (typeId) => setExpanded(e => ({ ...e, [typeId]: !e[typeId] }));

  // Build matrix data once per render
  const matrix = sucursales.map(suc => {
    const perType = {};
    let configuredSubcats = 0;
    let loadedSubcats = 0;
    MATRIX_TYPES.forEach(t => {
      const tipoCfg = suc.items?.[t.id];
      if (!tipoCfg || !tipoCfg.activo || tipoCfg.subcats.length === 0) {
        perType[t.id] = { active: false, subcats: [] };
        return;
      }
      const subStatuses = tipoCfg.subcats.map(cfgSub => {
        const status = matrixCellStatus({
          records: state.records,
          sucursal: suc.nombre,
          type: t.id,
          cfgSub,
          monthKey,
          overdue,
        });
        return { cfgSub, status };
      });
      configuredSubcats += subStatuses.length;
      loadedSubcats += subStatuses.filter(s => s.status === "cargado").length;
      perType[t.id] = { active: true, subcats: subStatuses };
    });
    return { suc, perType, configuredSubcats, loadedSubcats };
  });

  // Available months: last 12 + the current period window
  const monthOptions = months.slice().reverse();

  return (
    <div>
      <SectionHead
        eyebrow="Dashboard / Estado de carga"
        title="Matriz de carga por sucursal"
        sub="Estado de los registros por sucursal y tipo de consumo en el periodo seleccionado."
        right={
          <Btn icon="arrow_back" onClick={() => dispatch({ type: "NAVIGATE", view: "dashboard" })}>
            Volver al dashboard
          </Btn>
        }
      />

      <div className="prt-row" style={{ gap: 14, marginBottom: 18, alignItems: "center" }}>
        <Field label="Periodo" style={{ width: 240, marginBottom: 0 }}>
          <Select
            value={monthKey}
            onChange={v => dispatch({ type: "MATRIX/SET_MONTH", month: v })}
            options={monthOptions.map(mk => ({ value: mk, label: monthLabelShort(mk) }))}
          />
        </Field>
        {!overdue && (
          <div className="prt-hint" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={14} />
            Este periodo aún no cierra — los pendientes se marcan en rojo desde el día 1 del mes siguiente.
          </div>
        )}
      </div>

      {sucursales.length === 0 ? (
        <EmptyState
          icon="apartment"
          title="No hay sucursales activas"
          body="Agrega al menos una sucursal para ver su estado de carga."
          actions={
            <Btn kind="primary" icon="add" onClick={() => dispatch({ type: "CONFIG/ADD_SUC" })}>Agregar sucursal</Btn>
          }
        />
      ) : (
        <Card flush>
          <div style={{ overflowX: "auto" }}>
            <table className="prt-table prt-matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Sucursal</th>
                  {MATRIX_TYPES.map(t => {
                    const isExp = !!expanded[t.id];
                    // count subcats across all sucursales for this type — used for colspan when expanded
                    const colspan = isExp
                      ? Math.max(1, matrix.reduce((mx, row) => Math.max(mx, row.perType[t.id]?.subcats.length || 0), 0))
                      : 1;
                    return (
                      <th
                        key={t.id}
                        colSpan={colspan}
                        onClick={() => toggle(t.id)}
                        className="prt-matrix-type-th"
                        style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                        title={isExp ? "Colapsar columna" : "Expandir subcategorías"}
                      >
                        <span className="prt-row" style={{ gap: 6, justifyContent: "center" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 22, height: 22, borderRadius: 6,
                            background: t.bg, color: t.color,
                          }}><Icon name={t.icon} size={14} /></span>
                          {t.label}
                          <Icon name={isExp ? "expand_less" : "expand_more"} size={16} />
                        </span>
                      </th>
                    );
                  })}
                  <th style={{ minWidth: 110, textAlign: "right" }}>Estado</th>
                </tr>
                {MATRIX_TYPES.some(t => expanded[t.id]) && (
                  <tr className="prt-matrix-subhead">
                    <th></th>
                    {MATRIX_TYPES.map(t => {
                      const isExp = !!expanded[t.id];
                      if (!isExp) return <th key={t.id}></th>;
                      const maxSubs = Math.max(1, matrix.reduce((mx, row) => Math.max(mx, row.perType[t.id]?.subcats.length || 0), 0));
                      // Show labels from the first sucursal that has subcats configured for this tipo
                      const labels = [];
                      for (let i = 0; i < maxSubs; i++) {
                        const exampleRow = matrix.find(row => row.perType[t.id]?.subcats[i]);
                        const sub = exampleRow?.perType[t.id]?.subcats[i]?.cfgSub;
                        labels.push(sub ? matrixSubcatLabel(t.id, sub) : "");
                      }
                      return labels.map((lbl, i) => (
                        <th key={t.id + "-" + i} className="prt-matrix-subhead-cell">{lbl}</th>
                      ));
                    })}
                    <th></th>
                  </tr>
                )}
              </thead>
              <tbody>
                {matrix.map(({ suc, perType, configuredSubcats, loadedSubcats }) => {
                  const badge = configuredSubcats === 0
                    ? { kind: "neutral", label: "Sin config" }
                    : loadedSubcats === 0
                      ? { kind: "neutral", label: "Sin carga" }
                      : loadedSubcats === configuredSubcats
                        ? { kind: "success", label: "Al día" }
                        : { kind: "info", label: `${loadedSubcats}/${configuredSubcats}` };
                  return (
                    <tr key={suc.id}>
                      <td><strong>{suc.nombre}</strong></td>
                      {MATRIX_TYPES.map(t => {
                        const isExp = !!expanded[t.id];
                        const cell = perType[t.id];
                        if (!isExp) {
                          const subStatuses = (cell.subcats || []).map(s => s.status);
                          const agg = cell.active ? matrixAggregateStatus(subStatuses) : "na";
                          return (
                            <td key={t.id} style={{ textAlign: "center" }}>
                              <MatrixCellIcon status={agg} />
                            </td>
                          );
                        }
                        // Expanded — render one cell per maxSubs across the matrix for alignment
                        const maxSubs = Math.max(1, matrix.reduce((mx, row) => Math.max(mx, row.perType[t.id]?.subcats.length || 0), 0));
                        const cells = [];
                        for (let i = 0; i < maxSubs; i++) {
                          const sub = cell.subcats[i];
                          cells.push(
                            <td key={t.id + "-" + i} style={{ textAlign: "center" }}>
                              {sub ? <MatrixCellIcon status={sub.status} /> : <MatrixCellIcon status="na" />}
                            </td>
                          );
                        }
                        return cells;
                      })}
                      <td style={{ textAlign: "right" }}>
                        <Chip kind={badge.kind} size="sm">{badge.label}</Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="prt-row" style={{ gap: 18, marginTop: 14, flexWrap: "wrap" }}>
        <span className="prt-row" style={{ gap: 6 }}>
          <MatrixCellIcon status="cargado" /><span className="prt-hint" style={{ fontSize: 12 }}>Cargado</span>
        </span>
        <span className="prt-row" style={{ gap: 6 }}>
          <MatrixCellIcon status="pendiente" /><span className="prt-hint" style={{ fontSize: 12 }}>Pendiente (mes cerrado)</span>
        </span>
        <span className="prt-row" style={{ gap: 6 }}>
          <MatrixCellIcon status="pendiente-soft" /><span className="prt-hint" style={{ fontSize: 12 }}>Pendiente (en curso)</span>
        </span>
        <span className="prt-row" style={{ gap: 6 }}>
          <MatrixCellIcon status="na" /><span className="prt-hint" style={{ fontSize: 12 }}>No aplica</span>
        </span>
      </div>
    </div>
  );
};

// Helper: derive a label for a configured subcat in a given consumption type.
function matrixSubcatLabel(type, cfgSub) {
  if (!cfgSub) return "";
  if (type === "electricidad") {
    return cfgSub.sistemaElectrico
      ? (typeof sistemaLabel === "function" ? sistemaLabel(cfgSub.sistemaElectrico) : cfgSub.sistemaElectrico)
      : (cfgSub.proveedor === "__otro" ? (cfgSub.proveedorCustom || "—") : cfgSub.proveedor || "—");
  }
  if (type === "combustible") {
    return typeof tipoComLabel === "function" ? tipoComLabel(cfgSub.tipo, cfgSub.tipoCustom) : cfgSub.tipo || "—";
  }
  if (type === "agua") {
    return typeof tipoAguaLabel === "function" ? tipoAguaLabel(cfgSub.tipo, cfgSub.tipoCustom) : cfgSub.tipo || "—";
  }
  if (type === "refrigerantes") {
    return cfgSub.tipo === "__otro" ? (cfgSub.tipoCustom || "Otro") : (typeof tipoRefriLabel === "function" ? tipoRefriLabel(cfgSub.tipo) : cfgSub.tipo || "—");
  }
  return "—";
}

Object.assign(window, { UploadMatrixView, MATRIX_TYPES, matrixIsOverdue, matrixCellStatus });
