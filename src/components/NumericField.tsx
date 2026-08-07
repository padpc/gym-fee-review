interface NumericFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  maxLength: number;
  error?: string;
  hint?: string;
}

export function NumericField({ id, label, value, onChange, unit, maxLength, error, hint }: NumericFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', `${id}-unit`, error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
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
          inputMode="numeric"
          maxLength={maxLength}
          autoComplete="off"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          aria-required="true"
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
