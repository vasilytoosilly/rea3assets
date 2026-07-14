"use client";

// ---------------------------------------------------------------------------
// Textarea — Multi-line text input with label and validation
// ---------------------------------------------------------------------------

interface TextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  className?: string;
  helpText?: string;
  required?: boolean;
  error?: string;
  monospace?: boolean;
}

export function Textarea({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  className = "",
  helpText,
  required,
  error,
  monospace,
}: TextareaProps) {
  return (
    <div className={className}>
      {label && (
        <label className="label mb-1.5 block">
          {label}
          {required && <span className="ml-1 text-[var(--accent)]">*</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={rows}
        className={`block w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-150 focus:outline-none focus:ring-1 resize-y ${
          monospace ? "font-mono text-xs" : ""
        } ${
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
