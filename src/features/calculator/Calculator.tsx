import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import {
  continuationCatalog,
  criterionOptions,
  serviceCatalog,
  usageFrequencyLabels,
  visitBandOptions,
  buildReviewResult,
  getCriterionLabel,
  type ContinuationId,
  type ReviewResult,
  type ServiceId,
  type TimeMode,
  type UsageFrequency,
  type VisitBandId,
  type VisitMode,
} from '../../domain/review';
import {
  createEmptyRawReviewInput,
  validateReviewInput,
  type ErrorMap,
  type RawReviewInput,
} from '../../domain/validation';
import { ResultSummary } from './ResultSummary';

type Step = 'criterion' | 'inputs' | 'result';

const errorOrder = [
  'monthly-fee',
  'monthly-fixed-fee',
  'annual-fee',
  'time-mode',
  'visit-mode',
  'visit-band',
  'exact-visits',
  'total-hours',
  'average-minutes',
  ...serviceCatalog.map((service) => `service-${service.id}-frequency`),
];

const rawKeyToFieldId: Partial<Record<keyof RawReviewInput, string>> = {
  monthlyFee: 'monthly-fee',
  monthlyFixedFee: 'monthly-fixed-fee',
  annualFee: 'annual-fee',
  visitMode: 'visit-mode',
  visitBand: 'visit-band',
  exactVisits: 'exact-visits',
  timeMode: 'time-mode',
  totalHours: 'total-hours',
  averageMinutes: 'average-minutes',
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
  raw: RawReviewInput;
  errors: ErrorMap;
  onModeChange: (mode: VisitMode) => void;
  onBandChange: (band: VisitBandId) => void;
  onExactChange: (value: string) => void;
  clearError: (fieldId: string) => void;
}

function VisitFields({ raw, errors, onModeChange, onBandChange, onExactChange, clearError }: VisitFieldsProps) {
  return (
    <fieldset className={`option-section ${errors['visit-mode'] ? 'option-section--error' : ''}`} aria-describedby={errors['visit-mode'] ? 'visit-mode-error' : undefined}>
      <legend>回数の分かり方</legend>
      <p className="field__hint">覚えている範囲で選べます。3か月分を用意する必要はありません。</p>
      <div className="stacked-choices">
        <ChoiceOption
          id="visit-mode"
          name="visit-mode"
          value="exact"
          checked={raw.visitMode === 'exact'}
          label="先月の回数が分かる"
          description="直前に完了した1か月の実数"
          onChange={() => onModeChange('exact')}
        />
        <ChoiceOption
          id="visit-mode-range"
          name="visit-mode"
          value="range"
          checked={raw.visitMode === 'range'}
          label="だいたいの頻度なら分かる"
          description="週1回前後などの範囲で確認"
          onChange={() => onModeChange('range')}
        />
        <ChoiceOption
          id="visit-mode-unknown"
          name="visit-mode"
          value="unknown"
          checked={raw.visitMode === 'unknown'}
          label="分からない（回数別の目安を見る）"
          description="入力なしで複数の回数例を表示"
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
            hint="公式アプリ、カレンダー、手帳などで確認できる場合だけ"
          />
        </div>
      ) : null}

      {raw.visitMode === 'range' ? (
        <fieldset className={`nested-fieldset ${errors['visit-band'] ? 'option-section--error' : ''}`} aria-describedby={errors['visit-band'] ? 'visit-band-error' : undefined}>
          <legend>だいたいの頻度</legend>
          <div className="compact-choice-grid">
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
        <p className="inline-note" aria-live="polite">入力は不要です。月0～20回の代表例で1回あたりを表示します。</p>
      ) : null}
    </fieldset>
  );
}

interface TimeFieldsProps {
  raw: RawReviewInput;
  errors: ErrorMap;
  allowTotal: boolean;
  onModeChange: (mode: TimeMode) => void;
  onTotalChange: (value: string) => void;
  onAverageChange: (value: string) => void;
  clearError: (fieldId: string) => void;
}

function TimeFields({ raw, errors, allowTotal, onModeChange, onTotalChange, onAverageChange, clearError }: TimeFieldsProps) {
  const effectiveMode = allowTotal ? raw.timeMode : 'average';
  return (
    <fieldset className={`option-section ${errors['time-mode'] ? 'option-section--error' : ''}`} aria-describedby={errors['time-mode'] ? 'time-mode-error' : undefined}>
      <legend>滞在時間の分かり方</legend>
      {allowTotal ? (
        <div className="stacked-choices stacked-choices--two">
          <ChoiceOption
            id="time-mode"
            name="time-mode"
            value="total"
            checked={raw.timeMode === 'total'}
            label="先月の合計滞在時間"
            description="回数入力は不要"
            onChange={() => onModeChange('total')}
          />
          <ChoiceOption
            id="time-mode-average"
            name="time-mode"
            value="average"
            checked={raw.timeMode === 'average'}
            label="1回の平均滞在時間"
            description="回数の実数・概数・不明と組み合わせる"
            onChange={() => onModeChange('average')}
          />
        </div>
      ) : <p className="inline-note">概数・回数不明では、1回の平均滞在時間から範囲・目安を計算します。</p>}
      {errors['time-mode'] ? <p className="field__error" id="time-mode-error">{errors['time-mode']}</p> : null}

      {effectiveMode === 'total' ? (
        <div className="nested-input">
          <NumericField
            id="total-hours"
            label="先月の合計滞在時間"
            value={raw.totalHours}
            onChange={(value) => {
              onTotalChange(value);
              clearError('total-hours');
            }}
            unit="時間"
            maxLength={5}
            inputMode="decimal"
            error={errors['total-hours']}
            hint="0.1～600.0時間、小数1桁まで"
          />
        </div>
      ) : null}
      {effectiveMode === 'average' ? (
        <div className="nested-input">
          <NumericField
            id="average-minutes"
            label="1回の平均滞在時間"
            value={raw.averageMinutes}
            onChange={(value) => {
              onAverageChange(value);
              clearError('average-minutes');
            }}
            unit="分"
            maxLength={3}
            error={errors['average-minutes']}
            hint="着替え、休憩、入浴等を含む滞在時間。10～600分"
          />
        </div>
      ) : null}
    </fieldset>
  );
}

interface ServiceFieldsProps {
  raw: RawReviewInput;
  errors: ErrorMap;
  onUsedToggle: (serviceId: ServiceId, checked: boolean) => void;
  onFrequencyChange: (serviceId: ServiceId, frequency: UsageFrequency) => void;
  onImportantToggle: (serviceId: ServiceId, checked: boolean) => void;
  clearError: (fieldId: string) => void;
}

function ServiceFields({ raw, errors, onUsedToggle, onFrequencyChange, onImportantToggle, clearError }: ServiceFieldsProps) {
  return (
    <section className="input-section" aria-labelledby="services-input-heading">
      <div className="input-section__heading">
        <p className="eyebrow">金額や点数へ変換しません</p>
        <h4 id="services-input-heading">設備・プログラム</h4>
        <p>最近の典型的な1か月を思い浮かべてください。利用と重要性は別々に選びます。</p>
      </div>
      <fieldset className="check-fieldset">
        <legend>そのひと月に使ったもの</legend>
        <div className="check-grid">
          {serviceCatalog.map((service) => {
            const isUsed = Object.prototype.hasOwnProperty.call(raw.usedServices, service.id);
            const errorId = `service-${service.id}-frequency`;
            return (
              <div className={`check-item ${isUsed ? 'check-item--selected' : ''}`} key={service.id}>
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={isUsed}
                    onChange={(event) => onUsedToggle(service.id, event.target.checked)}
                  />
                  <span>{service.label}を使った</span>
                </label>
                {isUsed ? (
                  <div className="select-field">
                    <label htmlFor={errorId}>{service.label}の利用頻度</label>
                    <select
                      id={errorId}
                      value={raw.usedServices[service.id] ?? ''}
                      aria-invalid={Boolean(errors[errorId])}
                      aria-describedby={errors[errorId] ? `${errorId}-error` : undefined}
                      onChange={(event) => {
                        onFrequencyChange(service.id, event.target.value as UsageFrequency);
                        clearError(errorId);
                      }}
                    >
                      <option value="">選んでください</option>
                      {Object.entries(usageFrequencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {errors[errorId] ? <p className="field__error" id={`${errorId}-error`}>{errors[errorId]}</p> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="check-fieldset">
        <legend>会費を払う理由として重要なもの</legend>
        <div className="check-grid check-grid--simple">
          {serviceCatalog.map((service) => (
            <label className="check-control check-control--card" key={service.id}>
              <input
                type="checkbox"
                checked={raw.importantServices.includes(service.id)}
                onChange={(event) => onImportantToggle(service.id, event.target.checked)}
              />
              <span>{service.label}は会費を払う理由として重要</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function ContinuationFields({ raw, onToggle }: { raw: RawReviewInput; onToggle: (id: ContinuationId, checked: boolean) => void }) {
  return (
    <fieldset className="option-section">
      <legend>料金以外で失いたくない条件</legend>
      <p className="field__hint">任意です。選んだ数を点数や金額へ変換しません。</p>
      <div className="check-grid check-grid--simple">
        {continuationCatalog.map((item) => (
          <label className="check-control check-control--card" key={item.id}>
            <input
              type="checkbox"
              checked={raw.continuation.includes(item.id)}
              onChange={(event) => onToggle(item.id, event.target.checked)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Calculator() {
  const [step, setStep] = useState<Step>('criterion');
  const [raw, setRaw] = useState<RawReviewInput>(() => createEmptyRawReviewInput());
  const [criterionError, setCriterionError] = useState('');
  const [errors, setErrors] = useState<ErrorMap>({});
  const [result, setResult] = useState<ReviewResult | null>(null);
  const inputHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const showsVisitFields = useMemo(() => {
    if (raw.criterion === 'per-visit' || raw.criterion === 'all') return true;
    return raw.criterion === 'per-hour' && raw.timeMode === 'average';
  }, [raw.criterion, raw.timeMode]);
  const showsServices = raw.criterion === 'services' || raw.criterion === 'all';
  const showsContinuation = raw.criterion === 'continuation' || raw.criterion === 'all';

  useEffect(() => {
    if (step === 'inputs') inputHeadingRef.current?.focus();
    if (step === 'result') resultHeadingRef.current?.focus();
  }, [step]);

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

  function updateRaw<K extends keyof RawReviewInput>(key: K, value: RawReviewInput[K]) {
    setRaw((current) => ({ ...current, [key]: value }));
    const fieldId = rawKeyToFieldId[key];
    if (fieldId) clearError(fieldId);
  }

  function submitCriterion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!raw.criterion) {
      setCriterionError('確認したい基準を選んでください。');
      requestAnimationFrame(() => document.getElementById('criterion')?.focus());
      return;
    }
    setCriterionError('');
    setStep('inputs');
  }

  function submitInputs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateReviewInput(raw);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }
    setErrors({});
    setResult(buildReviewResult(validation.value));
    setStep('result');
  }

  function changeCriterion() {
    setResult(null);
    setErrors({});
    setStep('criterion');
    requestAnimationFrame(() => document.getElementById('criterion')?.focus());
  }

  function editInputs() {
    setResult(null);
    setErrors({});
    setStep('inputs');
  }

  function changeVisitMode(mode: VisitMode) {
    setRaw((current) => ({
      ...current,
      visitMode: mode,
      timeMode: current.criterion === 'all' && current.includeTime && mode !== 'exact'
        ? 'average'
        : current.timeMode,
    }));
    clearErrors([
      'visit-mode',
      'visit-band',
      'exact-visits',
      'time-mode',
      'total-hours',
      'average-minutes',
    ]);
  }

  function changeTimeMode(mode: TimeMode) {
    setRaw((current) => ({ ...current, timeMode: mode }));
    clearErrors(['time-mode', 'total-hours', 'average-minutes']);
  }

  function toggleUsedService(serviceId: ServiceId, checked: boolean) {
    setRaw((current) => {
      const usedServices = { ...current.usedServices };
      if (checked) usedServices[serviceId] = '';
      else delete usedServices[serviceId];
      return { ...current, usedServices };
    });
    clearError(`service-${serviceId}-frequency`);
  }

  function toggleListValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
    return checked ? [...new Set([...values, value])] : values.filter((current) => current !== value);
  }

  return (
    <section className="calculator" id="calculator" aria-labelledby="calculator-heading">
      <div className="calculator__intro">
        <p className="eyebrow">登録不要・入力はこの画面だけ</p>
        <h2 id="calculator-heading">会費の見え方を確認する</h2>
        <p>準備するのは月会費だけ。回数が分からなくても始められます。</p>
        <p className="calculator__scope-note">料金、時間、利用サービス、続けやすさを混ぜずに表示します。</p>
      </div>

      {step === 'criterion' ? (
        <form className="form-card" noValidate onSubmit={submitCriterion}>
          <div className="step-label" aria-label="2段階中の1段階目"><span>1</span><p>確認基準</p></div>
          <fieldset className={`criteria-fieldset ${criterionError ? 'option-section--error' : ''}`} aria-describedby={criterionError ? 'criterion-error' : undefined}>
            <legend>何を基準に確認しますか</legend>
            <p className="field__hint">あとから選び直せます。運営者が決めた一つの評価にはまとめません。</p>
            <div className="criteria-grid">
              {criterionOptions.map((option, index) => (
                <ChoiceOption
                  key={option.id}
                  id={index === 0 ? 'criterion' : `criterion-${option.id}`}
                  name="criterion"
                  value={option.id}
                  checked={raw.criterion === option.id}
                  label={option.label}
                  description={option.description}
                  onChange={() => {
                    updateRaw('criterion', option.id);
                    setCriterionError('');
                  }}
                />
              ))}
            </div>
            {criterionError ? <p className="field__error" id="criterion-error">{criterionError}</p> : null}
          </fieldset>
          <button className="button button--primary button--full" type="submit">この基準で入力へ</button>
        </form>
      ) : null}

      {step === 'inputs' && raw.criterion ? (
        <form className="form-card" noValidate onSubmit={submitInputs}>
          <div className="step-label" aria-label="2段階中の2段階目"><span>2</span><p>必要な入力</p></div>
          <div className="form-card__heading">
            <h3 ref={inputHeadingRef} tabIndex={-1}>必要な項目を入力</h3>
            <p className="selected-criterion">選択中：{getCriterionLabel(raw.criterion)}</p>
            <button className="text-button" type="button" onClick={changeCriterion}>基準を変更</button>
          </div>
          <ErrorSummary errors={errors} order={errorOrder} />

          <section className="input-section" aria-labelledby="fee-heading">
            <div className="input-section__heading">
              <p className="eyebrow">すべての基準で使用</p>
              <h4 id="fee-heading">現在の会費</h4>
            </div>
            <div className="fee-grid">
              <NumericField
                id="monthly-fee"
                label="月会費"
                value={raw.monthlyFee}
                onChange={(value) => updateRaw('monthlyFee', value)}
                unit="円"
                maxLength={6}
                error={errors['monthly-fee']}
                hint="税込で実際に支払っている金額"
              />
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
                hint="12分の1を月額相当に加えます"
              />
            </div>
          </section>

          {raw.criterion === 'per-hour' ? (
            <>
              <TimeFields
                raw={raw}
                errors={errors}
                allowTotal
                onModeChange={changeTimeMode}
                onTotalChange={(value) => updateRaw('totalHours', value)}
                onAverageChange={(value) => updateRaw('averageMinutes', value)}
                clearError={clearError}
              />
              {showsVisitFields ? (
                <VisitFields
                  raw={raw}
                  errors={errors}
                  onModeChange={changeVisitMode}
                  onBandChange={(band) => updateRaw('visitBand', band)}
                  onExactChange={(value) => updateRaw('exactVisits', value)}
                  clearError={clearError}
                />
              ) : null}
            </>
          ) : null}

          {raw.criterion !== 'per-hour' && showsVisitFields ? (
            <VisitFields
              raw={raw}
              errors={errors}
              onModeChange={changeVisitMode}
              onBandChange={(band) => updateRaw('visitBand', band)}
              onExactChange={(value) => updateRaw('exactVisits', value)}
              clearError={clearError}
            />
          ) : null}

          {raw.criterion === 'all' ? (
            <section className="input-section" aria-labelledby="optional-time-heading">
              <div className="input-section__heading">
                <p className="eyebrow">任意</p>
                <h4 id="optional-time-heading">滞在時間も確認する</h4>
              </div>
              <label className="check-control check-control--card check-control--wide">
                <input
                  type="checkbox"
                  checked={raw.includeTime}
                  onChange={(event) => {
                    const includeTime = event.target.checked;
                    setRaw((current) => ({
                      ...current,
                      includeTime,
                      timeMode: includeTime && current.visitMode !== 'exact'
                        ? 'average'
                        : current.timeMode,
                    }));
                    clearErrors(['time-mode', 'total-hours', 'average-minutes']);
                  }}
                />
                <span>1時間あたりも表示する</span>
              </label>
              {raw.includeTime ? (
                <TimeFields
                  raw={raw}
                  errors={errors}
                  allowTotal={raw.visitMode === 'exact'}
                  onModeChange={changeTimeMode}
                  onTotalChange={(value) => updateRaw('totalHours', value)}
                  onAverageChange={(value) => updateRaw('averageMinutes', value)}
                  clearError={clearError}
                />
              ) : null}
            </section>
          ) : null}

          {showsServices ? (
            <ServiceFields
              raw={raw}
              errors={errors}
              onUsedToggle={toggleUsedService}
              onFrequencyChange={(serviceId, frequency) => {
                setRaw((current) => ({
                  ...current,
                  usedServices: { ...current.usedServices, [serviceId]: frequency },
                }));
              }}
              onImportantToggle={(serviceId, checked) => {
                setRaw((current) => ({
                  ...current,
                  importantServices: toggleListValue(current.importantServices, serviceId, checked),
                }));
              }}
              clearError={clearError}
            />
          ) : null}

          {showsContinuation ? (
            <ContinuationFields
              raw={raw}
              onToggle={(id, checked) => {
                setRaw((current) => ({
                  ...current,
                  continuation: toggleListValue(current.continuation, id, checked),
                }));
              }}
            />
          ) : null}

          <div className="form-actions">
            <button className="button button--secondary" type="button" onClick={changeCriterion}>戻る</button>
            <button className="button button--primary" type="submit">自分の会費の見え方を見る</button>
          </div>
        </form>
      ) : null}

      {step === 'result' && result ? (
        <>
          <p className="sr-only" aria-live="polite">基準別の結果を表示しました。</p>
          <ResultSummary
            result={result}
            headingRef={resultHeadingRef}
            onEdit={editInputs}
            onChangeCriterion={changeCriterion}
          />
        </>
      ) : null}
    </section>
  );
}
