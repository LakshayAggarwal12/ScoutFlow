export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-ink dark:fill-slate-100" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#2f6fed" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="2.2" fill="#2f6fed" />
      <path d="M16 16 L22.5 9.5" stroke="#2f6fed" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
