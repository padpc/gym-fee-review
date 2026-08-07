import type { ErrorMap, G1FieldId } from '../domain/validation';

const errorOrder: G1FieldId[] = [
  'current-monthly-fee',
  'visit-0',
  'visit-1',
  'visit-2',
  'drop-in-fee',
];

export function ErrorSummary({ errors }: { errors: ErrorMap }) {
  const entries = errorOrder.flatMap((fieldId) => {
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
