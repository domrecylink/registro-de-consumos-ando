// Inline SVG icon set — Feather-style strokes, no external font dep.
// Each icon is a path or set of elements rendered inside a 24x24 viewBox.

const ICON_PATHS = {
  // Generic
  check:       <polyline points="20 6 9 17 4 12"/>,
  close:       <g><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></g>,
  add:         <g><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></g>,
  arrow_back:    <g><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></g>,
  arrow_forward: <g><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></g>,
  refresh:     <g><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></g>,
  open_in_new: <g><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></g>,

  // Status
  check_circle: <g><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></g>,
  warning:     <g><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></g>,
  error:       <g><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></g>,
  info:        <g><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></g>,

  // Trends
  trending_up:   <g><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></g>,
  trending_down: <g><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></g>,
  trending_flat: <g><line x1="2" y1="12" x2="20" y2="12"/><polyline points="16 8 20 12 16 16"/></g>,

  // Files / docs
  picture_as_pdf: <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></g>,
  description:    <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></g>,
  table_view:     <g><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></g>,
  image:          <g><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></g>,
  photo_camera:   <g><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></g>,
  list:           <g><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></g>,
  hourglass_top:  <g><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></g>,
  receipt_long:   <g><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></g>,

  // Actions
  edit:          <g><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></g>,
  delete:        <g><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></g>,
  content_copy:  <g><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></g>,
  cloud_upload:  <g><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></g>,
  file_download: <g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></g>,
  filter_alt:    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
  filter_alt_off:<g><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/><line x1="3" y1="3" x2="21" y2="21"/></g>,

  // Navigation / categorical
  home:          <g><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g>,
  dashboard:     <g><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></g>,
  inbox:         <g><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></g>,
  apartment:     <g><path d="M3 21h18M5 21V7l7-4 7 4v14"/><line x1="9" y1="9"  x2="9" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="9" y1="17" x2="9" y2="17.01"/><line x1="15" y1="9"  x2="15" y2="9.01"/><line x1="15" y1="13" x2="15" y2="13.01"/><line x1="15" y1="17" x2="15" y2="17.01"/></g>,
  payments:      <g><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></g>,

  // Type-specific
  bolt:               <g><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></g>,
  water_drop:         <g><path d="M12 2.69 5.64 9.06a9 9 0 1 0 12.72 0L12 2.69z"/></g>,
  local_gas_station:  <g><path d="M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v18z"/><line x1="3" y1="10" x2="15" y2="10"/><path d="M15 8h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V8.5L19 6"/><rect x="6" y="13" width="6" height="5" rx="0.5"/></g>,
  snowflake:          <g><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/><polyline points="8 4 12 8 16 4"/><polyline points="8 20 12 16 16 20"/><polyline points="4 8 8 12 4 16"/><polyline points="20 8 16 12 20 16"/></g>,

  // Config / settings
  tune:          <g><line x1="4" y1="6" x2="11" y2="6"/><line x1="15" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="15" y2="18"/><line x1="19" y1="18" x2="20" y2="18"/><circle cx="13" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></g>,
  settings:      <g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>,
  checklist:     <g><polyline points="3 7 5 9 9 5"/><polyline points="3 14 5 16 9 12"/><line x1="13" y1="7" x2="21" y2="7"/><line x1="13" y1="14" x2="21" y2="14"/><line x1="13" y1="21" x2="21" y2="21"/><polyline points="3 21 5 23 9 19"/></g>,
  toggle_off:    <g><rect x="1" y="6" width="22" height="12" rx="6" ry="6"/><circle cx="7" cy="12" r="3"/></g>,
  cloud:         <g><path d="M17.5 19a4.5 4.5 0 1 0-1.5-8.75A6 6 0 1 0 6 14h11.5z"/></g>,
  expand_more:   <polyline points="6 9 12 15 18 9"/>,
  expand_less:   <polyline points="18 15 12 9 6 15"/>,

  // Impacto ambiental
  eco:           <g><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></g>,
  target:        <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></g>,
  percent:       <g><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></g>,
  factory:       <g><path d="M2 20h20V8l-6 4V8l-6 4V4H6v16"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="10" y1="20" x2="10" y2="16"/><line x1="14" y1="20" x2="14" y2="16"/><line x1="18" y1="20" x2="18" y2="16"/></g>,
  undo:          <g><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></g>,
  link:          <g><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g>,
};

const Icon = ({ name, size = 18, fill, color, style, strokeWidth = 2 }) => {
  const path = ICON_PATHS[name];
  if (!path) {
    // Fallback square so missing icons are visible
    return <span style={{ display: "inline-block", width: size, height: size, border: "1px dashed #ccc", ...style }} title={"missing icon: " + name}></span>;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, color, ...style }}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
};

Object.assign(window, { Icon, ICON_PATHS });
