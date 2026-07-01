// Landing — control panel with recent records + sucursales status + register CTA.

// Build "Hace X" relative timestamp from an ISO date (YYYY-MM-DD).
// No clock granularity → "Hoy" / "Ayer" / "Hace N d".
function landingRelativeDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const recDate = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffMs = today - recDate;
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return "Hace " + days + " d";
}

const Landing = () => {
  const { state, dispatch } = useApp();
  const go = (view, extra) => dispatch({ type: "NAVIGATE", view, ...extra });

  // Records this month, active only
  const recordsThisMonth = state.records.filter(r =>
    r.estado !== "eliminada" && r.date.startsWith(CURRENT_MONTH_KEY)
  );
  const recentRecords = [...recordsThisMonth].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Sucursales status — load count vs configured subcat count for the current month
  const sucursales = state.configSucursales.filter(s => s.activa);
  const sucStatuses = sucursales.map(suc => {
    let configured = 0;
    let loaded = 0;
    ["electricidad", "combustible", "agua", "refrigerantes"].forEach(t => {
      const cfg = suc.items?.[t];
      if (!cfg || !cfg.activo) return;
      cfg.subcats.forEach(sc => {
        configured++;
        const hit = state.records.some(r =>
          r.estado !== "eliminada"
          && r.sucursal === suc.nombre
          && r.type === t
          && r.date.startsWith(CURRENT_MONTH_KEY)
          && (t === "electricidad" ||
              (t === "agua"
                ? (function () { const opt = aguaSubcatFromConfig(sc); return opt && r.subcat === opt.id; })()
                : r.subcat === sc.tipo))
        );
        if (hit) loaded++;
      });
    });
    let badge;
    if (configured === 0) badge = { label: "Sin config", dot: "var(--rl-gray-400)" };
    else if (loaded === 0) badge = { label: "Sin carga", dot: "var(--rl-error-500)" };
    else if (loaded === configured) badge = { label: "Al día", dot: "var(--rl-success-500)" };
    else badge = { label: loaded + "/" + configured, dot: "var(--rl-warning-500)" };
    return { suc, badge, configured, loaded };
  });
  const alDia = sucStatuses.filter(s => s.configured > 0 && s.loaded === s.configured).length;
  const totalSuc = sucStatuses.length;
  const pendientes = totalSuc - alDia;

  // Eyebrow text
  const monthLbl = monthLabelShort(CURRENT_MONTH_KEY).replace(/\b(\w)/, c => c.toUpperCase());
  const eyebrow = (COMPANY ? COMPANY + " · " : "") + "Período " + monthLbl;

  return (
    <div>
      <SectionHead eyebrow={eyebrow} title="¡Hola! Esto es lo que pasa hoy" />

      <div className="rc-home-grid">
        {/* LEFT — recent records */}
        <Card flush>
          <div className="rc-home-card-head">
            <div>
              <div className="rc-home-kpi">{recordsThisMonth.length}</div>
              <div className="prt-hint" style={{ marginTop: 2 }}>registros este mes</div>
            </div>
            <button className="rc-home-link" onClick={() => go("dashboard")}>
              Ver dashboard <Icon name="arrow_forward" size={14} />
            </button>
          </div>
          <div className="rc-home-list">
            {recentRecords.length === 0 ? (
              <div className="rc-home-empty">
                <Icon name="inbox" size={28} style={{ color: "var(--rl-gray-300)" }} />
                <div className="prt-hint" style={{ marginTop: 6 }}>Aún no hay registros este mes.</div>
              </div>
            ) : recentRecords.map(r => {
              const t = TYPES[r.type];
              return (
                <div key={r.id} className="rc-home-item">
                  <span className="rc-home-item-ico" style={{ background: t?.bg, color: t?.color }}>
                    <Icon name={t?.icon || "inbox"} size={16} />
                  </span>
                  <div className="rc-home-item-body">
                    <div className="rc-home-item-title">
                      {r.sucursal} · <span style={{ color: "var(--rl-gray-600)" }}>{t?.label || r.type}</span>
                    </div>
                    <div className="rc-home-item-sub">
                      {(r.provider || "—")} · {fmtNum(r.cantidad)} {r.unit}
                    </div>
                  </div>
                  <div className="rc-home-item-time">{landingRelativeDate(r.date)}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT — sucursales status */}
        <Card flush>
          <div className="rc-home-card-head">
            <div>
              <div className="rc-home-kpi">{alDia}/{totalSuc}</div>
              <div className="prt-hint" style={{ marginTop: 2 }}>
                {pendientes === 0 ? "todas al día" : pendientes + " sucursal" + (pendientes !== 1 ? "es" : "") + " con pendientes"}
              </div>
            </div>
            <button className="rc-home-link" onClick={() => go("matrix")}>
              Ver matriz <Icon name="arrow_forward" size={14} />
            </button>
          </div>
          <div className="rc-home-list">
            {sucStatuses.length === 0 ? (
              <div className="rc-home-empty">
                <Icon name="apartment" size={28} style={{ color: "var(--rl-gray-300)" }} />
                <div className="prt-hint" style={{ marginTop: 6, marginBottom: 8 }}>Aún no hay sucursales configuradas.</div>
                <Btn size="sm" kind="primary" icon="add" onClick={() => dispatch({ type: "CONFIG/ADD_SUC" })}>Agregar sucursal</Btn>
              </div>
            ) : sucStatuses.map(({ suc, badge }) => (
              <button key={suc.id} className="rc-home-suc" onClick={() => go("matrix")}>
                <span className="rc-home-suc-dot" style={{ background: badge.dot }}></span>
                <span className="rc-home-suc-name">{suc.nombre}</span>
                <Chip size="sm">{badge.label}</Chip>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* CTA full width */}
      <div className="rc-home-cta">
        <div>
          <div className="rc-home-cta-title">¿Listo para registrar un consumo?</div>
          <div className="rc-home-cta-sub">Elige el modo según el insumo que vas a cargar.</div>
        </div>
        <div className="prt-row" style={{ gap: 10 }}>
          <Btn icon="edit" onClick={() => go("register")}>Registrar a mano</Btn>
          <Btn kind="primary" icon="cloud_upload" onClick={() => go("register")}>Subir documento</Btn>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Landing });
