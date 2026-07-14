"use client";

// ---------------------------------------------------------------------------
// Input — Text input with label, error, and help text
// ---------------------------------------------------------------------------

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  className?: string;
  helpText?: string;
  required?: boolean;
  error?: string;
  id?: string;
  autoFocus?: boolean;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  helpText,
  required,
  error,
  id,
  autoFocus,
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label mb-1.5 block">
          {label}
          {required && <span className="ml-1 text-[var(--accent)]">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        autoFocus={autoFocus}
        className={`block w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-150 focus:outline-none focus:ring-1 ${
          error
            ? "border-[var(--status-deprecated)] focus:border-[var(--status-deprecated)] focus:ring-[var(--status-deprecated)]"
            : "border-[var(--border-default)] focus:border-[var(--accent)] focus:ring-[var(--accent)]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-[var(--status-deprecated)]">{error}</p>}
      {helpText && !error && <p className="mt-1 text-xs text-[var(--text-muted)]">{helpText}</p>}
    </div>
  );
}
