interface NumericFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  maxLength: number;
  error?: string;
  hint?: string;
  required?: boolean;
  inputMode?: 'numeric' | 'decimal';
}

export function NumericField({
  id,
  label,
  value,
  onChange,
  unit,
  maxLength,
  error,
  hint,
  required = true,
  inputMode = 'numeric',
}: NumericFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', `${id}-unit`, error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        <span className={`field__status ${required ? 'field__status--required' : ''}`} aria-hidden="true">
          {required ? '必須' : '任意'}
        </span>
      </label>
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      <div className="field__control">
        <input
          id={id}
          name={id}
          type="text"
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete="off"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          onChange={(event) => onChange(event.target.value)}
        />
        <span id={`${id}-unit`}>{unit}</span>
      </div>
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
