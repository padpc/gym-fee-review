import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import {
  buildAssessmentResult,
  priceBenchmarkOptions,
  purposeOptions,
  purposeProgressOptions,
  replaceabilityOptions,
  visitBandOptions,
  type AssessmentResult,
  type PriceBenchmarkKind,
  type PurposeId,
  type PurposeProgress,
  type Replaceability,
  type VisitBandId,
  type VisitMode,
} from '../../domain/assessment';
import {
  createEmptyRawAssessmentInput,
  validateAssessmentInput,
  type ErrorMap,
  type RawAssessmentInput,
} from '../../domain/validation';
import { ResultSummary } from './ResultSummary';

const errorOrder = [
  'monthly-fee',
  'monthly-fixed-fee',
  'annual-fee',
  'benchmark-kind',
  'monthly-limit',
  'per-visit-limit',
  'alternative-monthly',
  'visit-mode',
  'exact-visits',
  'visit-band',
  'purpose',
  'purpose-progress',
  'replaceability',
];

const rawKeyToFieldId: Partial<Record<keyof RawAssessmentInput, string>> = {
  monthlyFee: 'monthly-fee',
  monthlyFixedFee: 'monthly-fixed-fee',
  annualFee: 'annual-fee',
  benchmarkKind: 'benchmark-kind',
  monthlyLimit: 'monthly-limit',
  perVisitLimit: 'per-visit-limit',
  alternativeMonthly: 'alternative-monthly',
  visitMode: 'visit-mode',
  exactVisits: 'exact-visits',
  visitBand: 'visit-band',
  purpose: 'purpose',
  purposeProgress: 'purpose-progress',
  replaceability: 'replaceability',
};

function focusFirstError(errors: ErrorMap) {
  const firstError = errorOrder.find((fieldId) => errors[fieldId]) ?? Object.keys(errors)[0];
  if (firstError) requestAnimationFrame(() => document.getElementById(firstError)?.focus());
}

interface ChoiceOptionProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  onChange: () => void;
}

function ChoiceOption({ id, name, value, checked, label, description, onChange }: ChoiceOptionProps) {
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <label className={`choice-card ${checked ? 'choice-card--selected' : ''}`} htmlFor={id}>
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onChange={onChange}
      />
      <span>
        <strong id={labelId}>{label}</strong>
        {description ? <small id={descriptionId}>{description}</small> : null}
      </span>
    </label>
  );
}

interface VisitFieldsProps {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  onModeChange: (mode: VisitMode) => void;
  onBandChange: (band: VisitBandId) => void;
  onExactChange: (value: string) => void;
  clearError: (fieldId: string) => void;
}

function VisitFields({ raw, errors, onModeChange, onBandChange, onExactChange, clearError }: VisitFieldsProps) {
  return (
    <fieldset
      className={`option-section ${errors['visit-mode'] ? 'option-section--error' : ''}`}
      aria-describedby={errors['visit-mode'] ? 'visit-mode-error' : undefined}
    >
      <legend>先月の回数は分かりますか</legend>
      <p className="field__hint">1回上限との比較にだけ使います。3か月分は不要です。</p>
      <div className="choice-grid choice-grid--three">
        <ChoiceOption
          id="visit-mode"
          name="visit-mode"
          value="exact"
          checked={raw.visitMode === 'exact'}
          label="回数が分かる"
          description="先月の実数を入力"
          onChange={() => onModeChange('exact')}
        />
        <ChoiceOption
          id="visit-mode-range"
          name="visit-mode"
          value="range"
          checked={raw.visitMode === 'range'}
          label="だいたい分かる"
          description="頻度の範囲を選択"
          onChange={() => onModeChange('range')}
        />
        <ChoiceOption
          id="visit-mode-unknown"
          name="visit-mode"
          value="unknown"
          checked={raw.visitMode === 'unknown'}
          label="分からない"
          description="必要回数と回数例を表示"
          onChange={() => onModeChange('unknown')}
        />
      </div>
      {errors['visit-mode'] ? <p className="field__error" id="visit-mode-error">{errors['visit-mode']}</p> : null}

      {raw.visitMode === 'exact' ? (
        <div className="nested-input">
          <NumericField
            id="exact-visits"
            label="先月の来館回数"
            value={raw.exactVisits}
            onChange={(value) => {
              onExactChange(value);
              clearError('exact-visits');
            }}
            unit="回"
            maxLength={3}
            error={errors['exact-visits']}
            hint="0回もそのまま入力できます"
          />
        </div>
      ) : null}

      {raw.visitMode === 'range' ? (
        <fieldset
          className={`nested-fieldset ${errors['visit-band'] ? 'option-section--error' : ''}`}
          aria-describedby={errors['visit-band'] ? 'visit-band-error' : undefined}
        >
          <legend>だいたいの頻度</legend>
          <div className="choice-grid choice-grid--bands">
            {visitBandOptions.map((band, index) => (
              <ChoiceOption
                key={band.id}
                id={index === 0 ? 'visit-band' : `visit-band-${band.id}`}
                name="visit-band"
                value={band.id}
                checked={raw.visitBand === band.id}
                label={band.label}
                onChange={() => onBandChange(band.id)}
              />
            ))}
          </div>
          {errors['visit-band'] ? <p className="field__error" id="visit-band-error">{errors['visit-band']}</p> : null}
        </fieldset>
      ) : null}

      {raw.visitMode === 'unknown' ? (
        <p className="inline-note">回数入力は不要です。上限を満たす料金上の回数と、回数別の目安を示します。</p>
      ) : null}
    </fieldset>
  );
}

export function Calculator() {
  const [raw, setRaw] = useState<RawAssessmentInput>(() => createEmptyRawAssessmentInput());
  const [errors, setErrors] = useState<ErrorMap>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const inputHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function clearErrors(fieldIds: string[]) {
    setErrors((current) => {
      if (!fieldIds.some((fieldId) => current[fieldId])) return current;
      const next = { ...current };
      for (const fieldId of fieldIds) delete next[fieldId];
      return next;
    });
  }

  function clearError(fieldId: string) {
    clearErrors([fieldId]);
  }

  function updateRaw<K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) {
    setRaw((current) => ({ ...current, [key]: value }));
    const fieldId = rawKeyToFieldId[key];
    if (fieldId) clearError(fieldId);
  }

  function changeBenchmark(kind: PriceBenchmarkKind) {
    updateRaw('benchmarkKind', kind);
    clearErrors([
      'benchmark-kind',
      'monthly-limit',
      'per-visit-limit',
      'alternative-monthly',
      'visit-mode',
      'exact-visits',
      'visit-band',
    ]);
  }

  function changeVisitMode(mode: VisitMode) {
    updateRaw('visitMode', mode);
    clearErrors(['visit-mode', 'exact-visits', 'visit-band']);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateAssessmentInput(raw);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }
    setErrors({});
    setResult(buildAssessmentResult(validation.value));
  }

  function editInputs() {
    setResult(null);
    setErrors({});
    requestAnimationFrame(() => inputHeadingRef.current?.focus());
  }

  if (result) {
    return <ResultSummary result={result} headingRef={resultHeadingRef} onEdit={editInputs} />;
  }

  const optionalFeesOpen = Boolean(
    raw.monthlyFixedFee || raw.annualFee || errors['monthly-fixed-fee'] || errors['annual-fee'],
  );

  return (
    <section className="calculator" id="calculator" aria-labelledby="calculator-heading">
      <div className="calculator__intro">
          <p className="eyebrow">約3分・登録不要・保存なし</p>
        <h2 id="calculator-heading" ref={inputHeadingRef} tabIndex={-1}>料金と利用価値を入力</h2>
        <p>本人の料金基準と、入会目的を実現できているかを別々に確認します。</p>
      </div>

      <form className="assessment-form" noValidate onSubmit={submit}>
        <ErrorSummary errors={errors} order={errorOrder} />

        <section className="form-section" aria-labelledby="fee-heading">
          <div className="form-section__heading">
            <span className="step-number" aria-hidden="true">1</span>
            <div>
              <p className="eyebrow">料金</p>
              <h3 id="fee-heading">今の会費を入力</h3>
            </div>
          </div>
          <NumericField
            id="monthly-fee"
            label="月会費"
            value={raw.monthlyFee}
            onChange={(value) => updateRaw('monthlyFee', value)}
            unit="円"
            maxLength={6}
            error={errors['monthly-fee']}
            hint="税込の通常月額。分かる範囲で最新の金額を入力"
          />

          <details className="optional-fees" open={optionalFeesOpen}>
            <summary>必須の追加費用がある場合</summary>
            <p>入力した費用だけを月額相当へ含めます。</p>
            <div className="field-grid">
              <NumericField
                id="monthly-fixed-fee"
                label="毎月必須の固定費"
                value={raw.monthlyFixedFee}
                onChange={(value) => updateRaw('monthlyFixedFee', value)}
                unit="円"
                maxLength={5}
                required={false}
                error={errors['monthly-fixed-fee']}
                hint="必須オプション等。なければ空欄"
              />
              <NumericField
                id="annual-fee"
                label="年会費等"
                value={raw.annualFee}
                onChange={(value) => updateRaw('annualFee', value)}
                unit="円／年"
                maxLength={6}
                required={false}
                error={errors['annual-fee']}
                hint="年会費等。なければ空欄"
              />
            </div>
          </details>
        </section>

        <section className="form-section" aria-labelledby="benchmark-heading">
          <div className="form-section__heading form-section__heading--plain">
            <div>
              <p className="eyebrow">本人が決める基準</p>
              <h3 id="benchmark-heading">何と比べて料金を判断しますか</h3>
            </div>
          </div>
          <fieldset
            className={`option-section ${errors['benchmark-kind'] ? 'option-section--error' : ''}`}
            aria-describedby={errors['benchmark-kind'] ? 'benchmark-kind-error' : undefined}
          >
            <legend className="visually-hidden">料金の判断基準</legend>
            <p className="field__hint">全国共通の「お得価格」は置きません。自分に合う基準を一つ選びます。</p>
            <div className="choice-grid">
              {priceBenchmarkOptions.map((option, index) => (
                <ChoiceOption
                  key={option.id}
                  id={index === 0 ? 'benchmark-kind' : `benchmark-kind-${option.id}`}
                  name="benchmark-kind"
                  value={option.id}
                  checked={raw.benchmarkKind === option.id}
                  label={option.label}
                  description={option.description}
                  onChange={() => changeBenchmark(option.id)}
                />
              ))}
            </div>
            {errors['benchmark-kind'] ? <p className="field__error" id="benchmark-kind-error">{errors['benchmark-kind']}</p> : null}
          </fieldset>

          {raw.benchmarkKind === 'monthly-limit' ? (
            <div className="nested-input">
              <NumericField
                id="monthly-limit"
                label="納得できる月額上限"
                value={raw.monthlyLimit}
                onChange={(value) => updateRaw('monthlyLimit', value)}
                unit="円／月"
                maxLength={6}
                error={errors['monthly-limit']}
                hint="家計や優先順位から、自分で決めた上限"
              />
            </div>
          ) : null}

          {raw.benchmarkKind === 'per-visit-limit' ? (
            <>
              <div className="nested-input">
                <NumericField
                  id="per-visit-limit"
                  label="納得できる1回あたり上限"
                  value={raw.perVisitLimit}
                  onChange={(value) => updateRaw('perVisitLimit', value)}
                  unit="円／回"
                  maxLength={6}
                  error={errors['per-visit-limit']}
                  hint="1回の利用に払ってよいと自分で思う上限"
                />
              </div>
              <VisitFields
                raw={raw}
                errors={errors}
                onModeChange={changeVisitMode}
                onBandChange={(band) => updateRaw('visitBand', band)}
                onExactChange={(value) => updateRaw('exactVisits', value)}
                clearError={clearError}
              />
            </>
          ) : null}

          {raw.benchmarkKind === 'alternative-monthly' ? (
            <div className="nested-input">
              <NumericField
                id="alternative-monthly"
                label="実在する代替案の月額相当"
                value={raw.alternativeMonthly}
                onChange={(value) => updateRaw('alternativeMonthly', value)}
                unit="円／月"
                maxLength={6}
                error={errors['alternative-monthly']}
                hint="確認できた必須費用を含む候補1件。サービス内容の同等性は判定しません"
              />
            </div>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="value-heading">
          <div className="form-section__heading">
            <span className="step-number" aria-hidden="true">2</span>
            <div>
              <p className="eyebrow">利用価値</p>
              <h3 id="value-heading">通う目的を実現できていますか</h3>
            </div>
          </div>

          <fieldset
            className={`option-section ${errors.purpose ? 'option-section--error' : ''}`}
            aria-describedby={errors.purpose ? 'purpose-error' : undefined}
          >
            <legend>主な入会目的</legend>
            <p className="field__hint">最も大きい目的を一つ選びます。目的の種類に優劣は付けません。</p>
            <div className="choice-grid choice-grid--purpose">
              {purposeOptions.map((option, index) => (
                <ChoiceOption
                  key={option.id}
                  id={index === 0 ? 'purpose' : `purpose-${option.id}`}
                  name="purpose"
                  value={option.id}
                  checked={raw.purpose === option.id}
                  label={option.label}
                  onChange={() => updateRaw('purpose', option.id as PurposeId)}
                />
              ))}
            </div>
            {errors.purpose ? <p className="field__error" id="purpose-error">{errors.purpose}</p> : null}
          </fieldset>

          <fieldset
            className={`option-section ${errors['purpose-progress'] ? 'option-section--error' : ''}`}
            aria-describedby={errors['purpose-progress'] ? 'purpose-progress-error' : undefined}
          >
            <legend>先月、その目的を実現できましたか</legend>
            <div className="choice-grid choice-grid--four">
              {purposeProgressOptions.map((option, index) => (
                <ChoiceOption
                  key={option.id}
                  id={index === 0 ? 'purpose-progress' : `purpose-progress-${option.id}`}
                  name="purpose-progress"
                  value={option.id}
                  checked={raw.purposeProgress === option.id}
                  label={option.label}
                  onChange={() => updateRaw('purposeProgress', option.id as PurposeProgress)}
                />
              ))}
            </div>
            {errors['purpose-progress'] ? <p className="field__error" id="purpose-progress-error">{errors['purpose-progress']}</p> : null}
          </fieldset>

          <fieldset
            className={`option-section ${errors.replaceability ? 'option-section--error' : ''}`}
            aria-describedby={errors.replaceability ? 'replaceability-error' : undefined}
          >
            <legend>同じ目的を、今のジム以外で代替できますか</legend>
            <div className="choice-grid choice-grid--four">
              {replaceabilityOptions.map((option, index) => (
                <ChoiceOption
                  key={option.id}
                  id={index === 0 ? 'replaceability' : `replaceability-${option.id}`}
                  name="replaceability"
                  value={option.id}
                  checked={raw.replaceability === option.id}
                  label={option.label}
                  onChange={() => updateRaw('replaceability', option.id as Replaceability)}
                />
              ))}
            </div>
            {errors.replaceability ? <p className="field__error" id="replaceability-error">{errors.replaceability}</p> : null}
          </fieldset>
        </section>

        <div className="form-submit">
          <p>入力はこの画面内だけで計算し、保存・送信しません。</p>
          <button className="button button--primary button--full" type="submit">2つの軸で判定する</button>
        </div>
      </form>
    </section>
  );
}
