import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import { calculateG1Result, type G1Result } from '../../domain/comparison';
import { getCompletedMonths } from '../../domain/completed-months';
import {
  type ErrorMap,
  type G1FieldId,
  normalizeDigits,
  validateCurrentInputs,
  validateG1Inputs,
} from '../../domain/validation';
import { formatYen } from '../../shared/format';
import { ResultSummary } from './ResultSummary';

type Step = 'current' | 'candidate' | 'result';

interface CalculatorProps {
  now?: Date;
}

const firstErrorOrder: G1FieldId[] = [
  'current-monthly-fee',
  'visit-0',
  'visit-1',
  'visit-2',
  'drop-in-fee',
];

function focusFirstError(errors: ErrorMap) {
  const firstError = firstErrorOrder.find((fieldId) => errors[fieldId]);
  if (firstError) requestAnimationFrame(() => document.getElementById(firstError)?.focus());
}

export function Calculator({ now }: CalculatorProps) {
  const [referenceDate] = useState(() => now ?? new Date());
  const months = getCompletedMonths(referenceDate);
  const [step, setStep] = useState<Step>('current');
  const [currentMonthlyFee, setCurrentMonthlyFee] = useState('');
  const [visits, setVisits] = useState<[string, string, string]>(['', '', '']);
  const [dropInFee, setDropInFee] = useState('');
  const [errors, setErrors] = useState<ErrorMap>({});
  const [result, setResult] = useState<G1Result | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const validatedMonthlyFeeYen = Number(normalizeDigits(currentMonthlyFee));
  const validatedVisitsTotal = visits.reduce(
    (sum, value) => sum + Number(normalizeDigits(value)),
    0,
  );

  useEffect(() => {
    if (step === 'result') resultHeadingRef.current?.focus();
  }, [step]);

  function clearError(fieldId: G1FieldId) {
    setErrors((currentErrors) => {
      if (!currentErrors[fieldId]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldId];
      return nextErrors;
    });
  }

  function updateVisit(index: number, value: string) {
    setVisits((currentVisits) => {
      const nextVisits = [...currentVisits] as [string, string, string];
      nextVisits[index] = value;
      return nextVisits;
    });
    clearError(`visit-${index}` as G1FieldId);
  }

  function submitCurrent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCurrentInputs({ currentMonthlyFee, visits });
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }
    setErrors({});
    setStep('candidate');
    requestAnimationFrame(() => document.getElementById('drop-in-fee')?.focus());
  }

  function submitCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateG1Inputs({ currentMonthlyFee, visits, dropInFee });
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }
    setErrors({});
    setResult(calculateG1Result(validation.value));
    setStep('result');
  }

  function editCurrent() {
    setResult(null);
    setErrors({});
    setStep('current');
    requestAnimationFrame(() => document.getElementById('current-monthly-fee')?.focus());
  }

  function editCandidate() {
    setResult(null);
    setErrors({});
    setStep('candidate');
    requestAnimationFrame(() => document.getElementById('drop-in-fee')?.focus());
  }

  return (
    <section className="calculator" id="calculator" aria-labelledby="calculator-heading">
      <div className="calculator__intro">
        <p className="eyebrow">登録不要・入力はこの画面だけ</p>
        <h2 id="calculator-heading">自分の料金で確かめる</h2>
        <p>料金明細と、直近3か月の来館回数を用意してください。</p>
        <p className="calculator__scope-note">料金以外の健康効果、設備、混雑、距離、通いやすさは判定しません。</p>
      </div>

      {step === 'current' ? (
        <form className="form-card" noValidate onSubmit={submitCurrent}>
          <div className="step-label" aria-label="2段階中の1段階目">
            <span>1</span>
            <p>現在プラン</p>
          </div>
          <div className="form-card__heading">
            <h3>現在の料金と利用回数</h3>
            <p>現在月は除き、完了した3か月を入力します。</p>
          </div>
          <ErrorSummary errors={errors} />
          <NumericField
            id="current-monthly-fee"
            label="月会費"
            value={currentMonthlyFee}
            onChange={(value) => {
              setCurrentMonthlyFee(value);
              clearError('current-monthly-fee');
            }}
            unit="円"
            maxLength={6}
            error={errors['current-monthly-fee']}
            hint="税込で実際に支払っている金額"
          />
          <fieldset className="visits-fieldset">
            <legend>直近3か月の来館回数</legend>
            <p className="field__hint">公式アプリ、カレンダー、手帳などで確認してください。</p>
            <div className="visits-grid">
              {months.map((month, index) => (
                <NumericField
                  key={month.key}
                  id={`visit-${index}`}
                  label={`${month.label}（${month.relativeLabel}）の来館回数`}
                  value={visits[index]}
                  onChange={(value) => updateVisit(index, value)}
                  unit="回"
                  maxLength={3}
                  error={errors[`visit-${index}` as G1FieldId]}
                />
              ))}
            </div>
          </fieldset>
          <button className="button button--primary button--full" type="submit">
            都度払いと比べる
          </button>
        </form>
      ) : null}

      {step === 'candidate' ? (
        <form className="form-card" noValidate onSubmit={submitCandidate}>
          <div className="step-label" aria-label="2段階中の2段階目">
            <span>2</span>
            <p>都度払い候補</p>
          </div>
          <div className="form-card__heading">
            <h3>比べる1回料金</h3>
            <p>ビジター利用、回数券1回分など、自分で確認した税込料金を入力します。</p>
          </div>
          <div className="current-summary">
            <div>
              <span>現在の月会費</span>
              <strong>{formatYen(validatedMonthlyFeeYen)}</strong>
            </div>
            <div>
              <span>3か月の合計回数</span>
              <strong>{validatedVisitsTotal}回</strong>
            </div>
            <button className="text-button" type="button" onClick={editCurrent}>
              現在の料金・回数を修正
            </button>
          </div>
          <ErrorSummary errors={errors} />
          <NumericField
            id="drop-in-fee"
            label="1回料金"
            value={dropInFee}
            onChange={(value) => {
              setDropInFee(value);
              clearError('drop-in-fee');
            }}
            unit="円"
            maxLength={6}
            error={errors['drop-in-fee']}
            hint="1回利用するたびに支払う金額"
          />
          <div className="form-actions">
            <button className="button button--secondary" type="button" onClick={editCurrent}>
              戻る
            </button>
            <button className="button button--primary" type="submit">
              比較結果を見る
            </button>
          </div>
        </form>
      ) : null}

      {step === 'result' && result ? (
        <>
          <p className="sr-only" aria-live="polite">
            比較結果を表示しました。
          </p>
          <ResultSummary
            result={result}
            headingRef={resultHeadingRef}
            onEditCandidate={editCandidate}
            onEditCurrent={editCurrent}
          />
        </>
      ) : null}
    </section>
  );
}
