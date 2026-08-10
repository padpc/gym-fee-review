import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import {
  activityOptions,
  barrierOptions,
  buildAssessmentResult,
  contentFitOptions,
  continuationOptions,
  purposeEvidenceOptions,
  purposeOptions,
  safetyOptions,
  usedServiceOptions,
  visitBandOptions,
  type ActivityId,
  type AssessmentResult,
  type BarrierId,
  type ContentFit,
  type ContinuationIntent,
  type EquivalenceAnswer,
  type PurposeEvidence,
  type PurposeId,
  type SafetyAnswer,
  type UsedServiceId,
  type VisitBandId,
  type VisitMode,
} from '../../domain/assessment';
import {
  createEmptyRawAssessmentInput,
  rawRequiresBarrier,
  validateAssessmentInput,
  type AdditionalFeesMode,
  type AlternativeAvailability,
  type AlternativeKind,
  type CountMode,
  type ErrorMap,
  type RawAssessmentInput,
  type TimeMode,
} from '../../domain/validation';
import { ResultSummary } from './ResultSummary';

const errorOrder = [
  'monthly-fee',
  'additional-fees-mode',
  'monthly-fixed-fee',
  'annual-fee',
  'visit-mode',
  'exact-visits',
  'visit-band',
  'time-mode',
  'total-hours',
  'average-minutes',
  'purpose',
  'activity',
  'performed-mode',
  'performed-count',
  'completed-mode',
  'completed-count',
  'content-fit',
  'purpose-evidence',
  'used-services',
  'continuation',
  'safety',
  'barrier',
  'alternative-availability',
  'alternative-name',
  'alternative-kind',
  'alternative-monthly-fee',
  'alternative-per-visit-fee',
  'alternative-additional-fees-mode',
  'alternative-monthly-fixed-fee',
  'alternative-annual-fee',
  'alternative-service-monthly-fee',
  'equivalence-services',
  'equivalence-hours',
  'equivalence-location',
  'alternative-source-confirmed',
];

const rawKeyToFieldId: Partial<Record<keyof RawAssessmentInput, string>> = {
  monthlyFee: 'monthly-fee',
  additionalFeesMode: 'additional-fees-mode',
  monthlyFixedFee: 'monthly-fixed-fee',
  annualFee: 'annual-fee',
  visitMode: 'visit-mode',
  visitBand: 'visit-band',
  exactVisits: 'exact-visits',
  timeMode: 'time-mode',
  totalHours: 'total-hours',
  averageMinutes: 'average-minutes',
  purpose: 'purpose',
  activity: 'activity',
  performedMode: 'performed-mode',
  performedCount: 'performed-count',
  completedMode: 'completed-mode',
  completedCount: 'completed-count',
  contentFit: 'content-fit',
  purposeEvidence: 'purpose-evidence',
  usedServices: 'used-services',
  continuation: 'continuation',
  safety: 'safety',
  barrier: 'barrier',
  alternativeAvailability: 'alternative-availability',
  alternativeKind: 'alternative-kind',
  alternativeName: 'alternative-name',
  alternativeMonthlyFee: 'alternative-monthly-fee',
  alternativePerVisitFee: 'alternative-per-visit-fee',
  alternativeAdditionalFeesMode: 'alternative-additional-fees-mode',
  alternativeMonthlyFixedFee: 'alternative-monthly-fixed-fee',
  alternativeAnnualFee: 'alternative-annual-fee',
  alternativeServiceMonthlyFee: 'alternative-service-monthly-fee',
  equivalenceServices: 'equivalence-services',
  equivalenceHours: 'equivalence-hours',
  equivalenceLocation: 'equivalence-location',
  alternativeSourceConfirmed: 'alternative-source-confirmed',
};

const equivalenceOptions: ReadonlyArray<{ id: EquivalenceAnswer; label: string }> = [
  { id: 'meets', label: '満たす' },
  { id: 'does-not-meet', label: '満たさない' },
  { id: 'not-required', label: '比較に不要' },
  { id: 'unknown', label: '分からない' },
];

const purposeCopy: Record<PurposeId, { evidence: string }> = {
  strength: {
    evidence: '重量、回数、フォーム等に具体的な変化がありましたか',
  },
  'weight-shape': {
    evidence: '体型、服のゆとり、運動習慣等に具体的な変化がありましたか',
  },
  endurance: {
    evidence: '継続時間、距離、速度、息切れ等に具体的な変化がありましたか',
  },
  health: {
    evidence: '運動習慣、体調の実感、継続できた週等に具体的な変化がありましたか',
  },
  stress: {
    evidence: '利用後の気分、睡眠、楽しさ等に具体的な変化がありましたか',
  },
  'program-amenity': {
    evidence: 'クラス、プール、温浴等を目的どおり利用できましたか',
  },
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

function CheckboxOption({
  id,
  name,
  checked,
  label,
  onChange,
}: {
  id: string;
  name: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className={`checkbox-card ${checked ? 'checkbox-card--selected' : ''}`} htmlFor={id}>
      <input id={id} name={name} type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function TextField({
  id,
  label,
  value,
  hint,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  hint?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>{label}<span className="field__status field__status--required" aria-hidden="true">必須</span></label>
      {hint ? <p className="field__hint" id={`${id}-hint`}>{hint}</p> : null}
      <div className="field__control field__control--text">
        <input
          id={id}
          name={id}
          type="text"
          maxLength={80}
          autoComplete="off"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          aria-required="true"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error ? <p className="field__error" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

function ConfirmationCheck({
  id,
  checked,
  error,
  children,
  onChange,
}: {
  id: string;
  checked: boolean;
  error?: string;
  children: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`confirmation ${error ? 'confirmation--error' : ''}`}>
      <label className="confirmation__label" htmlFor={id}>
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{children}</span>
      </label>
      {error ? <p className="field__error" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

function VisitFields({
  raw,
  errors,
  update,
  clearErrors,
}: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
  clearErrors: (fieldIds: string[]) => void;
}) {
  function changeMode(mode: VisitMode) {
    update('visitMode', mode);
    clearErrors(['visit-mode', 'exact-visits', 'visit-band']);
  }

  return (
    <fieldset className={`option-section ${errors['visit-mode'] ? 'option-section--error' : ''}`}>
      <legend>最近の典型的な1か月の来館回数</legend>
      <p className="field__hint">正確でなくても、範囲や「分からない」を選べます。</p>
      <div className="choice-grid choice-grid--three">
        <ChoiceOption id="visit-mode" name="visit-mode" value="exact" checked={raw.visitMode === 'exact'} label="回数が分かる" description="実数を入力" onChange={() => changeMode('exact')} />
        <ChoiceOption id="visit-mode-range" name="visit-mode" value="range" checked={raw.visitMode === 'range'} label="だいたい分かる" description="頻度の範囲を選択" onChange={() => changeMode('range')} />
        <ChoiceOption id="visit-mode-unknown" name="visit-mode" value="unknown" checked={raw.visitMode === 'unknown'} label="分からない" description="推測値へ置き換えない" onChange={() => changeMode('unknown')} />
      </div>
      {errors['visit-mode'] ? <p className="field__error" id="visit-mode-error">{errors['visit-mode']}</p> : null}
      {raw.visitMode === 'exact' ? (
        <div className="nested-input">
          <NumericField id="exact-visits" label="来館回数" value={raw.exactVisits} onChange={(value) => update('exactVisits', value)} unit="回／月" maxLength={3} error={errors['exact-visits']} hint="0回もそのまま入力" />
        </div>
      ) : null}
      {raw.visitMode === 'range' ? (
        <fieldset className={`nested-fieldset ${errors['visit-band'] ? 'option-section--error' : ''}`}>
          <legend>だいたいの頻度</legend>
          <div className="choice-grid choice-grid--bands">
            {visitBandOptions.map((band, index) => (
              <ChoiceOption key={band.id} id={index === 0 ? 'visit-band' : `visit-band-${band.id}`} name="visit-band" value={band.id} checked={raw.visitBand === band.id} label={band.label} onChange={() => update('visitBand', band.id as VisitBandId)} />
            ))}
          </div>
          {errors['visit-band'] ? <p className="field__error" id="visit-band-error">{errors['visit-band']}</p> : null}
        </fieldset>
      ) : null}
      {raw.visitMode === 'unknown' ? <p className="inline-note">回数単価と回数に連動する代替料金は「算出できない」と表示します。</p> : null}
    </fieldset>
  );
}

function TimeFields({
  raw,
  errors,
  update,
  clearErrors,
}: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
  clearErrors: (fieldIds: string[]) => void;
}) {
  function changeMode(mode: TimeMode) {
    update('timeMode', mode);
    clearErrors(['time-mode', 'total-hours', 'average-minutes']);
  }
  return (
    <fieldset className="option-section">
      <legend>実運動時間（任意）</legend>
      <p className="field__hint">実際に運動・目的利用へ使った時間です。入力した場合だけ1時間単価を出し、長さを質とは判定しません。</p>
      <div className="choice-grid choice-grid--three">
        <ChoiceOption id="time-mode" name="time-mode" value="total-hours" checked={raw.timeMode === 'total-hours'} label="月の合計実運動時間" onChange={() => changeMode('total-hours')} />
        <ChoiceOption id="time-mode-average" name="time-mode" value="average-minutes" checked={raw.timeMode === 'average-minutes'} label="来館1回の平均実運動時間" onChange={() => changeMode('average-minutes')} />
        <ChoiceOption id="time-mode-unknown" name="time-mode" value="unknown" checked={raw.timeMode === 'unknown'} label="入力しない" onChange={() => changeMode('unknown')} />
      </div>
      {raw.timeMode === 'total-hours' ? (
        <div className="nested-input"><NumericField id="total-hours" label="月の合計実運動時間" value={raw.totalHours} onChange={(value) => update('totalHours', value)} unit="時間／月" maxLength={5} inputMode="decimal" error={errors['total-hours']} hint="0.1時間刻み。例：9" /></div>
      ) : null}
      {raw.timeMode === 'average-minutes' ? (
        <div className="nested-input"><NumericField id="average-minutes" label="来館1回の平均実運動時間" value={raw.averageMinutes} onChange={(value) => update('averageMinutes', value)} unit="分／回" maxLength={4} error={errors['average-minutes']} /></div>
      ) : null}
    </fieldset>
  );
}

function CountFields({
  id,
  legend,
  mode,
  value,
  minimum,
  errors,
  onModeChange,
  onValueChange,
  unknownLabel,
}: {
  id: 'performed' | 'completed';
  legend: string;
  mode: CountMode;
  value: string;
  minimum: number;
  errors: ErrorMap;
  onModeChange: (mode: CountMode) => void;
  onValueChange: (value: string) => void;
  unknownLabel?: string;
}) {
  const modeId = `${id}-mode`;
  const countId = `${id}-count`;
  return (
    <fieldset className={`option-section option-section--compact ${errors[modeId] ? 'option-section--error' : ''}`}>
      <legend>{legend}</legend>
      <div className="choice-grid choice-grid--two">
        <ChoiceOption id={modeId} name={modeId} value="exact" checked={mode === 'exact'} label="回数が分かる" onChange={() => onModeChange('exact')} />
        <ChoiceOption id={`${modeId}-unknown`} name={modeId} value="unknown" checked={mode === 'unknown'} label={unknownLabel ?? '分からない'} onChange={() => onModeChange('unknown')} />
      </div>
      {errors[modeId] ? <p className="field__error" id={`${modeId}-error`}>{errors[modeId]}</p> : null}
      {mode === 'exact' ? (
        <div className="nested-input"><NumericField id={countId} label={legend} value={value} onChange={onValueChange} unit="回" maxLength={3} error={errors[countId]} hint={minimum === 0 ? '0回もそのまま入力' : '1回以上。予定がない場合は「分からない」'} /></div>
      ) : null}
    </fieldset>
  );
}

function EquivalenceField({
  fieldId,
  legend,
  value,
  error,
  allowNotRequired = true,
  onChange,
}: {
  fieldId: 'equivalence-services' | 'equivalence-hours' | 'equivalence-location';
  legend: string;
  value: EquivalenceAnswer | '';
  error?: string;
  allowNotRequired?: boolean;
  onChange: (value: EquivalenceAnswer) => void;
}) {
  const options = allowNotRequired
    ? equivalenceOptions
    : equivalenceOptions.filter((option) => option.id !== 'not-required');
  return (
    <fieldset className={`option-section option-section--compact ${error ? 'option-section--error' : ''}`}>
      <legend>{legend}</legend>
      <div className="choice-grid choice-grid--four">
        {options.map((option, index) => (
          <ChoiceOption key={option.id} id={index === 0 ? fieldId : `${fieldId}-${option.id}`} name={fieldId} value={option.id} checked={value === option.id} label={option.label} onChange={() => onChange(option.id)} />
        ))}
      </div>
      {error ? <p className="field__error" id={`${fieldId}-error`}>{error}</p> : null}
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

  function updateRaw<K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) {
    setRaw((current) => {
      const next = { ...current, [key]: value };
      return rawRequiresBarrier(next) ? next : { ...next, barrier: '' };
    });
    const fieldId = rawKeyToFieldId[key];
    if (fieldId) clearErrors([fieldId]);
  }

  function changeAlternativeAvailability(availability: AlternativeAvailability) {
    setRaw((current) => ({
      ...current,
      alternativeAvailability: availability,
      alternativeSourceConfirmed: false,
    }));
    clearErrors(errorOrder.filter((id) => id.startsWith('alternative-') || id.startsWith('equivalence-')));
  }

  function changeAlternativeKind(kind: AlternativeKind) {
    setRaw((current) => ({ ...current, alternativeKind: kind, alternativeSourceConfirmed: false }));
    clearErrors(['alternative-kind', 'alternative-monthly-fee', 'alternative-per-visit-fee']);
  }

  function updateAlternativeRaw<K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) {
    setRaw((current) => ({ ...current, [key]: value, alternativeSourceConfirmed: false }));
    const fieldId = rawKeyToFieldId[key];
    if (fieldId) clearErrors([fieldId]);
  }

  function changeAdditionalFeesMode(key: 'additionalFeesMode' | 'alternativeAdditionalFeesMode', mode: AdditionalFeesMode) {
    if (key === 'additionalFeesMode') {
      updateRaw(key, mode);
      clearErrors(['additional-fees-mode', 'monthly-fixed-fee', 'annual-fee']);
    } else {
      setRaw((current) => ({ ...current, [key]: mode, alternativeSourceConfirmed: false }));
      clearErrors([
        'alternative-additional-fees-mode',
        'alternative-monthly-fixed-fee',
        'alternative-annual-fee',
        'alternative-service-monthly-fee',
      ]);
    }
  }

  function changePurpose(purpose: PurposeId) {
    setRaw((current) => ({
      ...current,
      purpose,
      contentFit: '',
      purposeEvidence: '',
      barrier: '',
    }));
    clearErrors(['purpose', 'content-fit', 'purpose-evidence', 'barrier']);
  }

  function changeActivity(activity: ActivityId) {
    setRaw((current) => ({
      ...current,
      activity,
      performedMode: '',
      performedCount: '',
      completedMode: '',
      completedCount: '',
      contentFit: '',
      barrier: '',
      equivalenceServices: '',
      alternativeSourceConfirmed: false,
    }));
    clearErrors([
      'activity',
      'performed-mode',
      'performed-count',
      'completed-mode',
      'completed-count',
      'content-fit',
      'barrier',
      'equivalence-services',
      'alternative-source-confirmed',
    ]);
  }

  function toggleUsedService(serviceId: UsedServiceId) {
    setRaw((current) => {
      const selected = current.usedServices.includes(serviceId);
      const usedServices = serviceId === 'none'
        ? selected ? [] : ['none']
        : selected
          ? current.usedServices.filter((id) => id !== serviceId)
          : [...current.usedServices.filter((id) => id !== 'none'), serviceId];
      return {
        ...current,
        usedServices: usedServices as UsedServiceId[],
        equivalenceServices: '',
        alternativeSourceConfirmed: false,
      };
    });
    clearErrors(['used-services', 'equivalence-services', 'alternative-source-confirmed']);
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

  if (result) return <ResultSummary result={result} headingRef={resultHeadingRef} onEdit={editInputs} />;

  const selectedPurposeCopy = raw.purpose ? purposeCopy[raw.purpose] : null;
  const selectedActivity = raw.activity
    ? activityOptions.find((option) => option.id === raw.activity) ?? null
    : null;
  const selectedServiceLabels = raw.usedServices
    .filter((serviceId) => serviceId !== 'none')
    .map((serviceId) => usedServiceOptions.find((option) => option.id === serviceId)?.label ?? serviceId);
  const showBarrier = rawRequiresBarrier(raw);

  return (
    <section className="calculator" id="calculator" aria-labelledby="calculator-heading">
      <div className="calculator__intro">
        <p className="eyebrow">来館・目的活動・内容完了を分けて確認</p>
        <h2 id="calculator-heading" ref={inputHeadingRef} tabIndex={-1}>最近1か月の費用と使い方を入力</h2>
        <p>分からない回数は推測値へ置き換えません。料金比較は最後に任意で追加できます。</p>
      </div>

      <form className="assessment-form" noValidate onSubmit={submit}>
        <ErrorSummary errors={errors} order={errorOrder} />

        <section className="form-section" aria-labelledby="fee-heading">
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">1</span><div><p className="eyebrow">費用</p><h3 id="fee-heading">今後も支払う費用</h3></div></div>
          <NumericField id="monthly-fee" label="月会費" value={raw.monthlyFee} onChange={(value) => updateRaw('monthlyFee', value)} unit="円／月" maxLength={6} error={errors['monthly-fee']} hint="税込の通常月額" />
          <fieldset className={`option-section option-section--spaced ${errors['additional-fees-mode'] ? 'option-section--error' : ''}`}>
            <legend>月会費以外の継続必須費用</legend>
            <p className="field__hint">契約書や明細で、毎月必要な費用と年会費を確認して選びます。</p>
            <div className="choice-grid choice-grid--two">
              <ChoiceOption id="additional-fees-mode" name="additional-fees-mode" value="none" checked={raw.additionalFeesMode === 'none'} label="月会費以外はない" onChange={() => changeAdditionalFeesMode('additionalFeesMode', 'none')} />
              <ChoiceOption id="additional-fees-mode-known" name="additional-fees-mode" value="known" checked={raw.additionalFeesMode === 'known'} label="追加費用・年会費がある" onChange={() => changeAdditionalFeesMode('additionalFeesMode', 'known')} />
            </div>
            {errors['additional-fees-mode'] ? <p className="field__error" id="additional-fees-mode-error">{errors['additional-fees-mode']}</p> : null}
          </fieldset>
          {raw.additionalFeesMode === 'known' ? (
            <div className="nested-fees">
              <p>請求周期を取り違えないよう分けて入力し、結果では実質月額へまとめます。該当しない欄は空欄のままで構いません。</p>
            <div className="field-grid">
              <NumericField id="monthly-fixed-fee" label="現在の利用に毎月必要な追加費用" value={raw.monthlyFixedFee} onChange={(value) => updateRaw('monthlyFixedFee', value)} unit="円／月" maxLength={5} required={false} error={errors['monthly-fixed-fee']} hint="必須ロッカー、目的に必要な月額サービス等" />
              <NumericField id="annual-fee" label="年会費等" value={raw.annualFee} onChange={(value) => updateRaw('annualFee', value)} unit="円／年" maxLength={6} required={false} error={errors['annual-fee']} hint="12分の1を月額へ加算" />
            </div>
            <p className="inline-note">既に支払った入会金・登録料・キー代は、今後の継続判断へ含めません。</p>
            </div>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="usage-heading">
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">2</span><div><p className="eyebrow">実利用</p><h3 id="usage-heading">最近の典型的な1か月</h3></div></div>
          <VisitFields raw={raw} errors={errors} update={updateRaw} clearErrors={clearErrors} />
          <TimeFields raw={raw} errors={errors} update={updateRaw} clearErrors={clearErrors} />
        </section>

        <section className="form-section" aria-labelledby="purpose-heading">
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">3</span><div><p className="eyebrow">目的活動</p><h3 id="purpose-heading">何を、どこまでできたか</h3></div></div>
          <fieldset className={`option-section ${errors.purpose ? 'option-section--error' : ''}`}>
            <legend>主な目的</legend>
            <p className="field__hint">目的は変化の具体例を切り替えます。目的の種類だけで料金や点数は変わりません。</p>
            <div className="choice-grid choice-grid--purpose">
              {purposeOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'purpose' : `purpose-${option.id}`} name="purpose" value={option.id} checked={raw.purpose === option.id} label={option.label} onChange={() => changePurpose(option.id as PurposeId)} />)}
            </div>
            {errors.purpose ? <p className="field__error" id="purpose-error">{errors.purpose}</p> : null}
          </fieldset>

          <fieldset className={`option-section ${errors.activity ? 'option-section--error' : ''}`}>
            <legend>主に行った活動</legend>
            <p className="field__hint">活動は、内容完了の例、質の確認、代替プランに必要な条件を切り替えます。</p>
            <div className="choice-grid choice-grid--purpose">
              {activityOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'activity' : `activity-${option.id}`} name="activity" value={option.id} checked={raw.activity === option.id} label={option.label} onChange={() => changeActivity(option.id as ActivityId)} />)}
            </div>
            {errors.activity ? <p className="field__error" id="activity-error">{errors.activity}</p> : null}
            {selectedActivity ? <p className="question-context"><strong>内容完了の例</strong><span>{selectedActivity.completionExample}</span></p> : null}
          </fieldset>

          <div className="purpose-count-grid">
            <CountFields id="performed" legend="目的の活動を行った来館回数 S" mode={raw.performedMode} value={raw.performedCount} minimum={0} errors={errors} onModeChange={(mode) => { updateRaw('performedMode', mode); clearErrors(['performed-mode', 'performed-count']); }} onValueChange={(value) => updateRaw('performedCount', value)} />
            <CountFields id="completed" legend="予定した主な内容を完了した回数 F" mode={raw.completedMode} value={raw.completedCount} minimum={0} errors={errors} onModeChange={(mode) => { updateRaw('completedMode', mode); clearErrors(['completed-mode', 'completed-count']); }} onValueChange={(value) => updateRaw('completedCount', value)} />
          </div>
        </section>

        <section className="form-section" aria-labelledby="quality-heading-form">
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">4</span><div><p className="eyebrow">質と実感</p><h3 id="quality-heading-form">内容・変化・続けたいか</h3></div></div>

          <fieldset className={`option-section ${errors['content-fit'] ? 'option-section--error' : ''}`}>
            <legend>{selectedActivity?.qualityQuestion ?? '活動の内容、強度、難易度は目的に合っていましたか'}</legend>
            <p className="field__hint">内容が合っていたかを結果と次の行動へ使います。料金へ加点しません。</p>
            <div className="choice-grid choice-grid--four">
              {contentFitOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'content-fit' : `content-fit-${option.id}`} name="content-fit" value={option.id} checked={raw.contentFit === option.id} label={option.label} onChange={() => updateRaw('contentFit', option.id as ContentFit)} />)}
            </div>
            {errors['content-fit'] ? <p className="field__error" id="content-fit-error">{errors['content-fit']}</p> : null}
          </fieldset>

          <fieldset className={`option-section ${errors['purpose-evidence'] ? 'option-section--error' : ''}`}>
            <legend>主な目的に沿う変化はありましたか</legend>
            <p className="field__hint">{selectedPurposeCopy?.evidence ?? '目的に応じた変化を本人が確認した方向だけ扱います。'} ジムが原因とは断定しません。</p>
            <div className="choice-grid choice-grid--four">
              {purposeEvidenceOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'purpose-evidence' : `purpose-evidence-${option.id}`} name="purpose-evidence" value={option.id} checked={raw.purposeEvidence === option.id} label={option.label} onChange={() => updateRaw('purposeEvidence', option.id as PurposeEvidence)} />)}
            </div>
            {errors['purpose-evidence'] ? <p className="field__error" id="purpose-evidence-error">{errors['purpose-evidence']}</p> : null}
          </fieldset>

          <fieldset className={`option-section ${errors['used-services'] ? 'option-section--error' : ''}`}>
            <legend>会費に含まれ、実際に使った付帯サービス</legend>
            <p className="field__hint">複数選べます。結果で現在プランの価値として示し、代替比較では保持したい条件にします。</p>
            <div className="checkbox-grid">
              {usedServiceOptions.map((option, index) => <CheckboxOption key={option.id} id={index === 0 ? 'used-services' : `used-services-${option.id}`} name="used-services" checked={raw.usedServices.includes(option.id)} label={option.label} onChange={() => toggleUsedService(option.id as UsedServiceId)} />)}
            </div>
            {errors['used-services'] ? <p className="field__error" id="used-services-error">{errors['used-services']}</p> : null}
          </fieldset>

          <fieldset className={`option-section ${errors.continuation ? 'option-section--error' : ''}`}>
            <legend>同じ条件なら、来月もこのジムを選びたいですか</legend>
            <p className="field__hint">料金には加えず、継続候補を出せるかと次の行動へ使います。</p>
            <div className="choice-grid choice-grid--four">
              {continuationOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'continuation' : `continuation-${option.id}`} name="continuation" value={option.id} checked={raw.continuation === option.id} label={option.label} onChange={() => updateRaw('continuation', option.id as ContinuationIntent)} />)}
            </div>
            {errors.continuation ? <p className="field__error" id="continuation-error">{errors.continuation}</p> : null}
          </fieldset>

          <fieldset className={`option-section ${errors.safety ? 'option-section--error' : ''}`}>
            <legend>運動中・後に、強い痛み、胸の痛み、めまい等、続ける前に確認したい症状はありましたか</legend>
            <p className="field__hint">安全上の回答は料金や満足と合算せず、主な確認候補より優先します。</p>
            <div className="choice-grid choice-grid--three">
              {safetyOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'safety' : `safety-${option.id}`} name="safety" value={option.id} checked={raw.safety === option.id} label={option.label} onChange={() => updateRaw('safety', option.id as SafetyAnswer)} />)}
            </div>
            {errors.safety ? <p className="field__error" id="safety-error">{errors.safety}</p> : null}
            {raw.safety === 'concern' ? <p className="safety-note" role="alert">強い・続く症状がある場合は運動を中止し、医療機関等へ確認してください。この診断は緊急性や診断を判定しません。</p> : null}
          </fieldset>

          {showBarrier ? (
            <div className="conditional-panel">
              <h4>問題があった場合だけ確認します</h4>
              <p>選んだ要因を、次の1か月で試す一行動へ使います。点数化しません。</p>
              <fieldset className={`option-section ${errors.barrier ? 'option-section--error' : ''}`}>
                <legend>利用・完了・満足を妨げた主な要因</legend>
                <div className="choice-grid choice-grid--purpose">
                  {barrierOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'barrier' : `barrier-${option.id}`} name="barrier" value={option.id} checked={raw.barrier === option.id} label={option.label} onChange={() => updateRaw('barrier', option.id as BarrierId)} />)}
                </div>
                {errors.barrier ? <p className="field__error" id="barrier-error">{errors.barrier}</p> : null}
              </fieldset>
            </div>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="alternative-heading-form">
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">5</span><div><p className="eyebrow">任意の料金比較</p><h3 id="alternative-heading-form">実在する代替プラン</h3></div></div>
          <fieldset className="option-section">
            <legend>公式料金を確認した候補も比較しますか</legend>
            <p className="field__hint">比較しなくても基本診断を完了できます。比較する場合も候補1件だけです。</p>
            <div className="choice-grid choice-grid--two">
              <ChoiceOption id="alternative-availability" name="alternative-availability" value="unknown" checked={raw.alternativeAvailability === 'unknown'} label="今回は比較しない" description="基本診断だけ行う" onChange={() => changeAlternativeAvailability('unknown')} />
              <ChoiceOption id="alternative-availability-known" name="alternative-availability" value="known" checked={raw.alternativeAvailability === 'known'} label="候補1件を比較する" description="公式料金と条件を入力" onChange={() => changeAlternativeAvailability('known')} />
            </div>
          </fieldset>

          {raw.alternativeAvailability === 'known' ? (
            <div className="alternative-fields">
              <TextField id="alternative-name" label="代替プラン名" value={raw.alternativeName} onChange={(value) => updateAlternativeRaw('alternativeName', value)} error={errors['alternative-name']} hint="店舗名やプラン名。公式情報と照合できる名前" />
              <fieldset className={`option-section ${errors['alternative-kind'] ? 'option-section--error' : ''}`}>
                <legend>料金の種類</legend>
                <div className="choice-grid choice-grid--two">
                  <ChoiceOption id="alternative-kind" name="alternative-kind" value="monthly" checked={raw.alternativeKind === 'monthly'} label="月額プラン" onChange={() => changeAlternativeKind('monthly')} />
                  <ChoiceOption id="alternative-kind-per-visit" name="alternative-kind" value="per-visit" checked={raw.alternativeKind === 'per-visit'} label="都度利用" onChange={() => changeAlternativeKind('per-visit')} />
                </div>
                {errors['alternative-kind'] ? <p className="field__error" id="alternative-kind-error">{errors['alternative-kind']}</p> : null}
              </fieldset>
              {raw.alternativeKind === 'monthly' ? <NumericField id="alternative-monthly-fee" label="代替プランの月会費" value={raw.alternativeMonthlyFee} onChange={(value) => updateAlternativeRaw('alternativeMonthlyFee', value)} unit="円／月" maxLength={6} error={errors['alternative-monthly-fee']} /> : null}
              {raw.alternativeKind === 'per-visit' ? <NumericField id="alternative-per-visit-fee" label="代替プランの1回料金" value={raw.alternativePerVisitFee} onChange={(value) => updateAlternativeRaw('alternativePerVisitFee', value)} unit="円／回" maxLength={6} error={errors['alternative-per-visit-fee']} /> : null}
              <fieldset className={`option-section ${errors['alternative-additional-fees-mode'] ? 'option-section--error' : ''}`}>
                <legend>表示料金以外の継続必須費用</legend>
                <div className="choice-grid choice-grid--two">
                  <ChoiceOption id="alternative-additional-fees-mode" name="alternative-additional-fees-mode" value="none" checked={raw.alternativeAdditionalFeesMode === 'none'} label="表示料金以外はない" onChange={() => changeAdditionalFeesMode('alternativeAdditionalFeesMode', 'none')} />
                  <ChoiceOption id="alternative-additional-fees-mode-known" name="alternative-additional-fees-mode" value="known" checked={raw.alternativeAdditionalFeesMode === 'known'} label="必須費用がある" onChange={() => changeAdditionalFeesMode('alternativeAdditionalFeesMode', 'known')} />
                </div>
                {errors['alternative-additional-fees-mode'] ? <p className="field__error" id="alternative-additional-fees-mode-error">{errors['alternative-additional-fees-mode']}</p> : null}
              </fieldset>
              {raw.alternativeAdditionalFeesMode === 'known' ? (
                <div className="nested-fees">
                <p>該当しない欄は空欄のままで構いません。</p>
                <div className="field-grid field-grid--three">
                  <NumericField id="alternative-monthly-fixed-fee" label="毎月必須の費用" value={raw.alternativeMonthlyFixedFee} onChange={(value) => updateAlternativeRaw('alternativeMonthlyFixedFee', value)} unit="円／月" maxLength={5} required={false} error={errors['alternative-monthly-fixed-fee']} />
                  <NumericField id="alternative-annual-fee" label="年会費" value={raw.alternativeAnnualFee} onChange={(value) => updateAlternativeRaw('alternativeAnnualFee', value)} unit="円／年" maxLength={6} required={false} error={errors['alternative-annual-fee']} />
                  <NumericField id="alternative-service-monthly-fee" label="必要な追加サービス" value={raw.alternativeServiceMonthlyFee} onChange={(value) => updateAlternativeRaw('alternativeServiceMonthlyFee', value)} unit="円／月" maxLength={5} required={false} error={errors['alternative-service-monthly-fee']} />
                </div>
                </div>
              ) : null}
               <div className="equivalence-intro"><h4>今の使い方を再現できるか確認</h4><p>一つでも満たさない条件があれば、安くても「同等の代替」と判定しません。</p></div>
               <div className="question-context">
                 <strong>候補に必要な条件</strong>
                 <span>{selectedActivity?.alternativeRequirement ?? '同じ主な活動を再現できる'}</span>
                 {selectedServiceLabels.length > 0 ? <span>実際に使った付帯サービス：{selectedServiceLabels.join('・')}</span> : <span>実際に使った付帯サービス：特になし</span>}
               </div>
               <EquivalenceField fieldId="equivalence-services" legend="主な活動と実際に使った付帯サービス" value={raw.equivalenceServices} error={errors['equivalence-services']} allowNotRequired={false} onChange={(value) => updateAlternativeRaw('equivalenceServices', value)} />
               <EquivalenceField fieldId="equivalence-hours" legend="必要な利用時間帯" value={raw.equivalenceHours} error={errors['equivalence-hours']} onChange={(value) => updateAlternativeRaw('equivalenceHours', value)} />
              <EquivalenceField fieldId="equivalence-location" legend="必要な店舗範囲" value={raw.equivalenceLocation} error={errors['equivalence-location']} onChange={(value) => updateAlternativeRaw('equivalenceLocation', value)} />
              <ConfirmationCheck id="alternative-source-confirmed" checked={raw.alternativeSourceConfirmed} error={errors['alternative-source-confirmed']} onChange={(checked) => updateRaw('alternativeSourceConfirmed', checked)}>
                通常料金、利用条件、必須費用を公式ページまたは契約書で確認した
              </ConfirmationCheck>
            </div>
           ) : <p className="inline-note">料金の得・損は断定しません。Sが分かる場合だけ、現在会費と同額になる目的活動1回料金を示します。</p>}
        </section>

        <div className="form-submit">
          <p>入力はこの画面内だけで計算し、保存・送信しません。</p>
          <button className="button button--primary button--full" type="submit">診断結果を見る</button>
        </div>
      </form>
    </section>
  );
}
