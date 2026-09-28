// `onDark` forces the light variant of the mark for the always-dark surfaces
// (landing page and auth screens) regardless of the active theme.
export default function Logo({ size = 28, onDark = false, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect
        width="32"
        height="32"
        rx="8.5"
        className={onDark ? "fill-white" : "fill-ink dark:fill-slate-100"}
      />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#2f6fed" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="2.2" fill="#2f6fed" />
      <path d="M16 16 L22.5 9.5" stroke="#2f6fed" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

