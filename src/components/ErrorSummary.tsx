import type { ErrorMap } from '../domain/validation';

interface ErrorSummaryProps {
  errors: ErrorMap;
  order: string[];
}

export function ErrorSummary({ errors, order }: ErrorSummaryProps) {
  const orderedIds = [...order, ...Object.keys(errors).filter((fieldId) => !order.includes(fieldId))];
  const entries = orderedIds.flatMap((fieldId) => {
    const message = errors[fieldId];
    return message ? [{ fieldId, message }] : [];
  });
  if (entries.length === 0) return null;

  return (
    <div className="error-summary" role="alert">
      <h3>{entries.length}件の入力を確認してください</h3>
      <ul>
        {entries.map(({ fieldId, message }) => (
          <li key={fieldId}>
            <a href={`#${fieldId}`}>{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
