import { Link } from "react-router-dom";
import { IconArrowLeft } from "./icons.jsx";

// Single source of truth for page titles, descriptions, back links and the
// primary action row - keeps every screen aligned on the same rhythm.
export default function PageHeader({ eyebrow, title, description, actions, back, meta, className = "" }) {
  return (
    <header className={className}>
      {back && (
        <Link to={back.to} className="back-link mb-4">
          <IconArrowLeft size={15} />
          {back.label || "Back"}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-sub">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}
