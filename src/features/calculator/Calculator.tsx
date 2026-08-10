import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import {
  barrierOptions,
  buildAssessmentResult,
  purposeEvidenceOptions,
  purposeOptions,
  visitBandOptions,
  type AssessmentResult,
  type BarrierId,
  type EquivalenceAnswer,
  type PurposeEvidence,
  type PurposeId,
  type VisitBandId,
  type VisitMode,
} from '../../domain/assessment';
import {
  createEmptyRawAssessmentInput,
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
  'planned-mode',
  'planned-count',
  'achieved-mode',
  'achieved-count',
  'purpose-evidence',
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
  'equivalence-equipment',
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
  plannedMode: 'planned-mode',
  plannedCount: 'planned-count',
  achievedMode: 'achieved-mode',
  achievedCount: 'achieved-count',
  purposeEvidence: 'purpose-evidence',
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
  equivalenceEquipment: 'equivalence-equipment',
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

const purposeCopy: Record<PurposeId, { planned: string; achieved: string; evidence: string }> = {
  strength: {
    planned: '予定した筋トレの来館回数',
    achieved: '筋トレを完了できた来館回数',
    evidence: '重量、回数、フォーム等に具体的な変化がありましたか',
  },
  'weight-shape': {
    planned: '予定したジム運動の来館回数',
    achieved: '目的の運動を実行できた来館回数',
    evidence: '体型、服のゆとり、運動習慣等に具体的な変化がありましたか',
  },
  endurance: {
    planned: '予定した体力づくりの来館回数',
    achieved: '体力づくりを完了できた来館回数',
    evidence: '継続時間、距離、速度、息切れ等に具体的な変化がありましたか',
  },
  health: {
    planned: '予定したジム運動の来館日数',
    achieved: 'ジムで運動できた来館日数',
    evidence: '運動習慣、体調の実感、継続できた週等に具体的な変化がありましたか',
  },
  stress: {
    planned: '予定した気分転換の来館回数',
    achieved: '気分転換につながった来館回数',
    evidence: '利用後の気分、睡眠、楽しさ等に具体的な変化がありましたか',
  },
  'program-amenity': {
    planned: '予定した設備・プログラム利用の来館回数',
    achieved: '目的の設備・プログラムを使えた来館回数',
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
      <legend>滞在時間（任意）</legend>
      <p className="field__hint">分かる場合だけ、1時間あたり料金を計算します。</p>
      <div className="choice-grid choice-grid--three">
        <ChoiceOption id="time-mode" name="time-mode" value="total-hours" checked={raw.timeMode === 'total-hours'} label="月の合計時間" onChange={() => changeMode('total-hours')} />
        <ChoiceOption id="time-mode-average" name="time-mode" value="average-minutes" checked={raw.timeMode === 'average-minutes'} label="1回の平均時間" onChange={() => changeMode('average-minutes')} />
        <ChoiceOption id="time-mode-unknown" name="time-mode" value="unknown" checked={raw.timeMode === 'unknown'} label="入力しない" onChange={() => changeMode('unknown')} />
      </div>
      {raw.timeMode === 'total-hours' ? (
        <div className="nested-input"><NumericField id="total-hours" label="月の合計滞在時間" value={raw.totalHours} onChange={(value) => update('totalHours', value)} unit="時間／月" maxLength={5} inputMode="decimal" error={errors['total-hours']} hint="0.1時間刻み。例：9" /></div>
      ) : null}
      {raw.timeMode === 'average-minutes' ? (
        <div className="nested-input"><NumericField id="average-minutes" label="1回の平均滞在時間" value={raw.averageMinutes} onChange={(value) => update('averageMinutes', value)} unit="分／回" maxLength={4} error={errors['average-minutes']} /></div>
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
  id: 'planned' | 'achieved';
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
  onChange,
}: {
  fieldId: 'equivalence-equipment' | 'equivalence-hours' | 'equivalence-location';
  legend: string;
  value: EquivalenceAnswer | '';
  error?: string;
  onChange: (value: EquivalenceAnswer) => void;
}) {
  return (
    <fieldset className={`option-section option-section--compact ${error ? 'option-section--error' : ''}`}>
      <legend>{legend}</legend>
      <div className="choice-grid choice-grid--four">
        {equivalenceOptions.map((option, index) => (
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
    setRaw((current) => ({ ...current, [key]: value }));
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
      plannedMode: '',
      plannedCount: '',
      achievedMode: '',
      achievedCount: '',
      purposeEvidence: '',
      equivalenceEquipment: '',
      equivalenceHours: '',
      equivalenceLocation: '',
      alternativeSourceConfirmed: false,
    }));
    clearErrors([
      'purpose',
      'planned-mode',
      'planned-count',
      'achieved-mode',
      'achieved-count',
      'purpose-evidence',
      'equivalence-equipment',
      'equivalence-hours',
      'equivalence-location',
      'alternative-source-confirmed',
    ]);
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

  const selectedPurpose = raw.purpose ? purposeCopy[raw.purpose] : null;

  return (
    <section className="calculator" id="calculator" aria-labelledby="calculator-heading">
      <div className="calculator__intro">
        <p className="eyebrow">実績と実在する比較条件から計算</p>
        <h2 id="calculator-heading" ref={inputHeadingRef} tabIndex={-1}>今の費用と使い方を入力</h2>
        <p>本人の「納得できる上限」は聞きません。分からない項目は、推測せず不明として扱います。</p>
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
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">3</span><div><p className="eyebrow">得たかった価値</p><h3 id="purpose-heading">目的に使えた来館実績</h3></div></div>
          <fieldset className={`option-section ${errors.purpose ? 'option-section--error' : ''}`}>
            <legend>主な目的</legend>
            <p className="field__hint">目的の種類自体には点を付けず、後の質問文だけを切り替えます。</p>
            <div className="choice-grid choice-grid--purpose">
              {purposeOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'purpose' : `purpose-${option.id}`} name="purpose" value={option.id} checked={raw.purpose === option.id} label={option.label} onChange={() => changePurpose(option.id as PurposeId)} />)}
            </div>
            {errors.purpose ? <p className="field__error" id="purpose-error">{errors.purpose}</p> : null}
          </fieldset>
          <div className="purpose-count-grid">
            <CountFields id="planned" legend={selectedPurpose?.planned ?? '予定していた回数'} mode={raw.plannedMode} value={raw.plannedCount} minimum={1} errors={errors} onModeChange={(mode) => { updateRaw('plannedMode', mode); clearErrors(['planned-mode', 'planned-count']); }} onValueChange={(value) => updateRaw('plannedCount', value)} unknownLabel="決めていない・分からない" />
            <CountFields id="achieved" legend={selectedPurpose?.achieved ?? '目的に使えた来館回数'} mode={raw.achievedMode} value={raw.achievedCount} minimum={0} errors={errors} onModeChange={(mode) => { updateRaw('achievedMode', mode); clearErrors(['achieved-mode', 'achieved-count']); }} onValueChange={(value) => updateRaw('achievedCount', value)} />
          </div>
          <fieldset className={`option-section ${errors['purpose-evidence'] ? 'option-section--error' : ''}`}>
            <legend>{selectedPurpose?.evidence ?? '目的に関する具体的な変化がありましたか'}</legend>
            <p className="field__hint">この回答は理由として表示し、料金や達成率へ加点しません。</p>
            <div className="choice-grid choice-grid--four">
              {purposeEvidenceOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'purpose-evidence' : `purpose-evidence-${option.id}`} name="purpose-evidence" value={option.id} checked={raw.purposeEvidence === option.id} label={option.label} onChange={() => updateRaw('purposeEvidence', option.id as PurposeEvidence)} />)}
            </div>
            {errors['purpose-evidence'] ? <p className="field__error" id="purpose-evidence-error">{errors['purpose-evidence']}</p> : null}
          </fieldset>
          <fieldset className={`option-section ${errors.barrier ? 'option-section--error' : ''}`}>
            <legend>利用を妨げた主な要因</legend>
            <p className="field__hint">結果で次に確認する一つの要因として使い、点数化しません。</p>
            <div className="choice-grid choice-grid--purpose">
              {barrierOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'barrier' : `barrier-${option.id}`} name="barrier" value={option.id} checked={raw.barrier === option.id} label={option.label} onChange={() => updateRaw('barrier', option.id as BarrierId)} />)}
            </div>
            {errors.barrier ? <p className="field__error" id="barrier-error">{errors.barrier}</p> : null}
          </fieldset>
        </section>

        <section className="form-section" aria-labelledby="alternative-heading-form">
          <div className="form-section__heading"><span className="step-number" aria-hidden="true">4</span><div><p className="eyebrow">事実として比較</p><h3 id="alternative-heading-form">実在する代替プラン</h3></div></div>
          <fieldset className="option-section">
            <legend>公式料金が分かる候補はありますか</legend>
            <p className="field__hint">本人の希望額ではなく、公式ページや契約書で確認した候補1件だけを扱います。</p>
            <div className="choice-grid choice-grid--two">
              <ChoiceOption id="alternative-availability" name="alternative-availability" value="unknown" checked={raw.alternativeAvailability === 'unknown'} label="まだ分からない" description="同額条件を逆算" onChange={() => changeAlternativeAvailability('unknown')} />
              <ChoiceOption id="alternative-availability-known" name="alternative-availability" value="known" checked={raw.alternativeAvailability === 'known'} label="公式料金が分かる" description="候補1件と比較" onChange={() => changeAlternativeAvailability('known')} />
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
              <div className="equivalence-intro"><h4>同じ目的を満たせるか確認</h4><p>一つでも満たさない条件があれば、安くても「同等の代替」と判定しません。</p></div>
              <EquivalenceField fieldId="equivalence-equipment" legend="必要な設備・サービス" value={raw.equivalenceEquipment} error={errors['equivalence-equipment']} onChange={(value) => updateAlternativeRaw('equivalenceEquipment', value)} />
              <EquivalenceField fieldId="equivalence-hours" legend="必要な利用回数・時間帯" value={raw.equivalenceHours} error={errors['equivalence-hours']} onChange={(value) => updateAlternativeRaw('equivalenceHours', value)} />
              <EquivalenceField fieldId="equivalence-location" legend="必要な店舗範囲" value={raw.equivalenceLocation} error={errors['equivalence-location']} onChange={(value) => updateAlternativeRaw('equivalenceLocation', value)} />
              <ConfirmationCheck id="alternative-source-confirmed" checked={raw.alternativeSourceConfirmed} error={errors['alternative-source-confirmed']} onChange={(checked) => updateRaw('alternativeSourceConfirmed', checked)}>
                通常料金、利用条件、必須費用を公式ページまたは契約書で確認した
              </ConfirmationCheck>
            </div>
          ) : <p className="inline-note">代替が不明でも、回数が分かれば現在会費と同額になる都度料金を計算します。</p>}
        </section>

        <div className="form-submit">
          <p>入力はこの画面内だけで計算し、保存・送信しません。</p>
          <button className="button button--primary button--full" type="submit">活用状況を計算する</button>
        </div>
      </form>
    </section>
  );
}
