import { IconSearch } from "./icons.jsx";

// Text input with a leading search affordance. `onChange` receives the raw
// string value so callers keep their existing setters.
export default function SearchInput({ value, onChange, placeholder = "Search…", className = "", ...rest }) {
  return (
    <div className={`relative ${className}`}>
      <span className="field-icon">
        <IconSearch size={16} />
      </span>
      <input
        type="search"
        className="input pl-9"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}
