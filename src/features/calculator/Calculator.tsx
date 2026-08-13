import { type FormEvent, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import {
  barrierOptions,
  buildAssessmentResult,
  continuationOptions,
  feeBurdenOptions,
  payReasonOptions,
  valueFrequencyOptions,
  valueFulfillmentOptions,
  valueOptions,
  visitBandOptions,
  type AssessmentResult,
  type BarrierId,
  type ContinuationIntent,
  type FeeBurden,
  type PayReason,
  type ValueFrequency,
  type ValueFulfillment,
  type ValueId,
  type VisitBandId,
  type VisitMode,
} from '../../domain/assessment';
import {
  createEmptyRawAssessmentInput,
  rawRequiresBarrier,
  validateAssessmentInput,
  type AdditionalFeesMode,
  type ErrorMap,
  type RawAssessmentInput,
  type RawValueEntry,
  type TimeMode,
} from '../../domain/validation';
import { ResultSummary } from './ResultSummary';

const fixedErrorOrder = [
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
  'values',
  'continuation',
  'fee-burden',
  'barrier',
];

function errorOrderFor(raw: RawAssessmentInput): string[] {
  return [
    ...fixedErrorOrder.slice(0, fixedErrorOrder.indexOf('values') + 1),
    ...raw.values.flatMap((value) => [
      `value-${value.id}-custom-label`,
      `value-${value.id}-frequency`,
      `value-${value.id}-fulfillment`,
      `value-${value.id}-pay-reason`,
    ]),
    ...fixedErrorOrder.slice(fixedErrorOrder.indexOf('values') + 1),
  ];
}

function focusFirstError(errors: ErrorMap, order: string[]) {
  const fieldId = order.find((id) => errors[id]) ?? Object.keys(errors)[0];
  if (fieldId) requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
}

interface ChoiceOptionProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  errorId?: string;
  onChange: () => void;
}

function ChoiceOption({ id, name, value, checked, label, description, errorId, onChange }: ChoiceOptionProps) {
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
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(errorId)}
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
  checked,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`checkbox-card ${checked ? 'checkbox-card--selected' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function TextField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>{label}<span className="field__status field__status--required" aria-hidden="true">必須</span></label>
      <div className="field__control field__control--text">
        <input
          id={id}
          type="text"
          maxLength={80}
          autoComplete="off"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required="true"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error ? <p className="field__error" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

function FeesFields({
  raw,
  errors,
  update,
}: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  function changeMode(mode: AdditionalFeesMode) {
    update('additionalFeesMode', mode);
    if (mode === 'none') {
      update('monthlyFixedFee', '');
      update('annualFee', '');
    }
  }

  return (
    <section className="form-section" aria-labelledby="fees-heading">
      <div className="form-section__heading"><span className="step-number">1</span><h3 id="fees-heading">毎月払っている料金</h3></div>
      <NumericField
        id="monthly-fee"
        label="月会費"
        value={raw.monthlyFee}
        onChange={(value) => update('monthlyFee', value)}
        unit="円／月"
        maxLength={6}
        error={errors['monthly-fee']}
        hint="税込みの通常月会費を入力します。"
      />
      <fieldset className={`option-section option-section--spaced ${errors['additional-fees-mode'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['additional-fees-mode'])} aria-describedby={errors['additional-fees-mode'] ? 'additional-fees-mode-error' : undefined}>
        <legend>月会費以外に、継続に必須の費用はありますか</legend>
        <p className="field__hint">ロッカー代などの毎月必須費用、年会費・更新料だけを含めます。</p>
        <div className="choice-grid choice-grid--two">
          <ChoiceOption id="additional-fees-mode" name="additional-fees-mode" value="none" checked={raw.additionalFeesMode === 'none'} label="月会費以外はない" errorId={errors['additional-fees-mode'] ? 'additional-fees-mode-error' : undefined} onChange={() => changeMode('none')} />
          <ChoiceOption id="additional-fees-mode-known" name="additional-fees-mode" value="known" checked={raw.additionalFeesMode === 'known'} label="追加費用・年会費がある" errorId={errors['additional-fees-mode'] ? 'additional-fees-mode-error' : undefined} onChange={() => changeMode('known')} />
        </div>
        {errors['additional-fees-mode'] ? <p className="field__error" id="additional-fees-mode-error">{errors['additional-fees-mode']}</p> : null}
      </fieldset>
      {raw.additionalFeesMode === 'known' ? (
        <div className="field-grid nested-fees">
          <NumericField id="monthly-fixed-fee" label="毎月必要な追加費用" value={raw.monthlyFixedFee} onChange={(value) => update('monthlyFixedFee', value)} unit="円／月" maxLength={5} error={errors['monthly-fixed-fee']} required={false} hint="なければ空欄または0円" />
          <NumericField id="annual-fee" label="年会費・更新料等" value={raw.annualFee} onChange={(value) => update('annualFee', value)} unit="円／年" maxLength={6} error={errors['annual-fee']} required={false} hint="12分の1を実質月額へ加えます。" />
        </div>
      ) : null}
    </section>
  );
}

function VisitAndTimeFields({
  raw,
  errors,
  update,
}: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  function changeVisitMode(mode: VisitMode) {
    update('visitMode', mode);
    if (mode !== 'exact') update('exactVisits', '');
    if (mode !== 'range') update('visitBand', '');
  }

  function changeTimeMode(mode: TimeMode) {
    update('timeMode', mode);
    if (mode !== 'total-hours') update('totalHours', '');
    if (mode !== 'average-minutes') update('averageMinutes', '');
  }

  return (
    <section className="form-section" aria-labelledby="usage-heading-form">
      <div className="form-section__heading"><span className="step-number">2</span><h3 id="usage-heading-form">来館と館内利用時間</h3></div>
      <fieldset className={`option-section ${errors['visit-mode'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['visit-mode'])} aria-describedby={errors['visit-mode'] ? 'visit-mode-error' : undefined}>
        <legend>最近の典型的な1か月の来館回数</legend>
        <p className="field__hint">正確でなくても、範囲や「分からない」で診断できます。</p>
        <div className="choice-grid choice-grid--three">
          <ChoiceOption id="visit-mode" name="visit-mode" value="exact" checked={raw.visitMode === 'exact'} label="回数が分かる" errorId={errors['visit-mode'] ? 'visit-mode-error' : undefined} onChange={() => changeVisitMode('exact')} />
          <ChoiceOption id="visit-mode-range" name="visit-mode" value="range" checked={raw.visitMode === 'range'} label="だいたい分かる" errorId={errors['visit-mode'] ? 'visit-mode-error' : undefined} onChange={() => changeVisitMode('range')} />
          <ChoiceOption id="visit-mode-unknown" name="visit-mode" value="unknown" checked={raw.visitMode === 'unknown'} label="分からない" errorId={errors['visit-mode'] ? 'visit-mode-error' : undefined} onChange={() => changeVisitMode('unknown')} />
        </div>
        {errors['visit-mode'] ? <p className="field__error" id="visit-mode-error">{errors['visit-mode']}</p> : null}
        {raw.visitMode === 'exact' ? (
          <div className="nested-input"><NumericField id="exact-visits" label="来館回数" value={raw.exactVisits} onChange={(value) => update('exactVisits', value)} unit="回／月" maxLength={3} error={errors['exact-visits']} hint="行かなかった月は0回と入力します。" /></div>
        ) : null}
        {raw.visitMode === 'range' ? (
          <fieldset className={`nested-fieldset ${errors['visit-band'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['visit-band'])} aria-describedby={errors['visit-band'] ? 'visit-band-error' : undefined}>
            <legend>だいたいの来館回数</legend>
            <div className="choice-grid choice-grid--bands">
              {visitBandOptions.map((band, index) => (
                <ChoiceOption key={band.id} id={index === 0 ? 'visit-band' : `visit-band-${band.id}`} name="visit-band" value={band.id} checked={raw.visitBand === band.id} label={band.label} errorId={errors['visit-band'] ? 'visit-band-error' : undefined} onChange={() => update('visitBand', band.id as VisitBandId)} />
              ))}
            </div>
            {errors['visit-band'] ? <p className="field__error" id="visit-band-error">{errors['visit-band']}</p> : null}
          </fieldset>
        ) : null}
        {raw.visitMode === 'unknown' ? <p className="inline-note">結果では1・2・4・8・12回だった場合の参考単価を表示します。価値の結論は通常どおり出します。</p> : null}
      </fieldset>

      <fieldset id="time-mode" tabIndex={-1} className={`option-section option-section--spaced ${errors['time-mode'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['time-mode'])} aria-describedby={errors['time-mode'] ? 'time-mode-error' : undefined}>
        <legend>館内利用時間も料金表示に使いますか <span className="field__status" aria-hidden="true">任意</span></legend>
        <p className="field__hint">着替え、運動、クラス、プール、風呂・サウナ、休憩を含む館内で過ごした時間です。</p>
        <div className="choice-grid choice-grid--three">
          <ChoiceOption id="time-mode-choice" name="time-mode" value="unknown" checked={raw.timeMode === 'unknown'} label="入力しない" errorId={errors['time-mode'] ? 'time-mode-error' : undefined} onChange={() => changeTimeMode('unknown')} />
          <ChoiceOption id="time-mode-total" name="time-mode" value="total-hours" checked={raw.timeMode === 'total-hours'} label="月の合計時間" errorId={errors['time-mode'] ? 'time-mode-error' : undefined} onChange={() => changeTimeMode('total-hours')} />
          <ChoiceOption id="time-mode-average" name="time-mode" value="average-minutes" checked={raw.timeMode === 'average-minutes'} label="1回の平均時間" errorId={errors['time-mode'] ? 'time-mode-error' : undefined} onChange={() => changeTimeMode('average-minutes')} />
        </div>
        {errors['time-mode'] ? <p className="field__error" id="time-mode-error">{errors['time-mode']}</p> : null}
        {raw.timeMode === 'total-hours' ? <div className="nested-input"><NumericField id="total-hours" label="月の合計館内利用時間" value={raw.totalHours} onChange={(value) => update('totalHours', value)} unit="時間／月" maxLength={5} inputMode="decimal" error={errors['total-hours']} hint="0.1時間（6分）単位で入力します。" /></div> : null}
        {raw.timeMode === 'average-minutes' ? <div className="nested-input"><NumericField id="average-minutes" label="1回の平均館内利用時間" value={raw.averageMinutes} onChange={(value) => update('averageMinutes', value)} unit="分／回" maxLength={4} error={errors['average-minutes']} /></div> : null}
        <p className="inline-note">館内利用時間は1時間あたり料金にだけ使い、長いほど価値やトレーニングの質が高いとは判定しません。</p>
      </fieldset>
    </section>
  );
}

function ValueEntryFields({
  entry,
  errors,
  update,
}: {
  entry: RawValueEntry;
  errors: ErrorMap;
  update: (next: RawValueEntry) => void;
}) {
  const prefix = `value-${entry.id}`;
  const label = valueOptions.find((option) => option.id === entry.id)?.label ?? entry.id;
  return (
    <article className="value-entry" aria-labelledby={`${prefix}-heading`}>
      <div className="value-entry__heading"><h4 id={`${prefix}-heading`}>{label}</h4><span>選んだ項目だけ確認</span></div>
      {entry.id === 'other' ? <TextField id={`${prefix}-custom-label`} label="具体的な価値" value={entry.customLabel} error={errors[`${prefix}-custom-label`]} onChange={(customLabel) => update({ ...entry, customLabel })} /> : null}
      <fieldset id={`${prefix}-frequency`} tabIndex={-1} className={`nested-fieldset value-question ${errors[`${prefix}-frequency`] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors[`${prefix}-frequency`])} aria-describedby={errors[`${prefix}-frequency`] ? `${prefix}-frequency-error` : undefined}>
        <legend>どの程度使いましたか</legend>
        <div className="choice-grid choice-grid--four">
          {valueFrequencyOptions.map((option, index) => <ChoiceOption key={option.id} id={`${prefix}-frequency-${index}`} name={`${prefix}-frequency`} value={option.id} checked={entry.frequency === option.id} label={option.label} errorId={errors[`${prefix}-frequency`] ? `${prefix}-frequency-error` : undefined} onChange={() => update({ ...entry, frequency: option.id as ValueFrequency })} />)}
        </div>
        {errors[`${prefix}-frequency`] ? <p className="field__error" id={`${prefix}-frequency-error`}>{errors[`${prefix}-frequency`]}</p> : null}
      </fieldset>
      <fieldset id={`${prefix}-fulfillment`} tabIndex={-1} className={`nested-fieldset value-question ${errors[`${prefix}-fulfillment`] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors[`${prefix}-fulfillment`])} aria-describedby={errors[`${prefix}-fulfillment`] ? `${prefix}-fulfillment-error` : undefined}>
        <legend>期待どおり使えましたか</legend>
        <div className="choice-grid choice-grid--four">
          {valueFulfillmentOptions.map((option, index) => <ChoiceOption key={option.id} id={`${prefix}-fulfillment-${index}`} name={`${prefix}-fulfillment`} value={option.id} checked={entry.fulfillment === option.id} label={option.label} errorId={errors[`${prefix}-fulfillment`] ? `${prefix}-fulfillment-error` : undefined} onChange={() => update({ ...entry, fulfillment: option.id as ValueFulfillment })} />)}
        </div>
        {errors[`${prefix}-fulfillment`] ? <p className="field__error" id={`${prefix}-fulfillment-error`}>{errors[`${prefix}-fulfillment`]}</p> : null}
      </fieldset>
      <fieldset id={`${prefix}-pay-reason`} tabIndex={-1} className={`nested-fieldset value-question ${errors[`${prefix}-pay-reason`] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors[`${prefix}-pay-reason`])} aria-describedby={errors[`${prefix}-pay-reason`] ? `${prefix}-pay-reason-error` : undefined}>
        <legend>これは会費を払って残したい価値ですか</legend>
        <div className="choice-grid choice-grid--three">
          {payReasonOptions.map((option, index) => <ChoiceOption key={option.id} id={`${prefix}-pay-reason-${index}`} name={`${prefix}-pay-reason`} value={option.id} checked={entry.payReason === option.id} label={option.label} errorId={errors[`${prefix}-pay-reason`] ? `${prefix}-pay-reason-error` : undefined} onChange={() => update({ ...entry, payReason: option.id as PayReason })} />)}
        </div>
        {errors[`${prefix}-pay-reason`] ? <p className="field__error" id={`${prefix}-pay-reason-error`}>{errors[`${prefix}-pay-reason`]}</p> : null}
      </fieldset>
    </article>
  );
}

function ValuesFields({
  raw,
  errors,
  update,
}: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  function toggleValue(id: ValueId, checked: boolean) {
    if (checked) {
      update('values', [...raw.values, { id, customLabel: '', frequency: '', fulfillment: '', payReason: '' }]);
      update('noValueUsed', false);
    } else {
      update('values', raw.values.filter((value) => value.id !== id));
    }
  }
  function updateEntry(next: RawValueEntry) {
    update('values', raw.values.map((value) => value.id === next.id ? next : value));
  }
  function selectNone(checked: boolean) {
    update('noValueUsed', checked);
    if (checked) update('values', []);
  }

  return (
    <section className="form-section" aria-labelledby="values-heading">
      <div className="form-section__heading"><span className="step-number">3</span><h3 id="values-heading">実際に使った価値</h3></div>
      <fieldset id="values" tabIndex={-1} className={`option-section ${errors.values ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors.values)} aria-describedby={errors.values ? 'values-error' : undefined}>
        <legend>今月、ジムで使ったものをすべて選んでください</legend>
        <p className="field__hint">主なものを1つに絞る必要はありません。風呂・サウナだけの利用も対象です。</p>
        <div className="checkbox-grid">
          {valueOptions.map((option) => <CheckboxOption key={option.id} id={`value-choice-${option.id}`} checked={raw.values.some((value) => value.id === option.id)} label={option.label} onChange={(checked) => toggleValue(option.id, checked)} />)}
          <CheckboxOption id="no-value-used" checked={raw.noValueUsed} label="今月は特に利用していない" onChange={selectNone} />
        </div>
        {errors.values ? <p className="field__error" id="values-error">{errors.values}</p> : null}
      </fieldset>
      {raw.values.length > 0 ? (
        <div className="value-entry-list">
          {valueOptions.flatMap((option) => {
            const entry = raw.values.find((value) => value.id === option.id);
            return entry ? [<ValueEntryFields key={entry.id} entry={entry} errors={errors} update={updateEntry} />] : [];
          })}
        </div>
      ) : raw.noValueUsed ? <p className="inline-note">利用しなかった理由と、続けるための条件を結果で整理します。</p> : null}
    </section>
  );
}

function DecisionFields({
  raw,
  errors,
  update,
}: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  const showBarrier = Boolean(raw.feeBurden && raw.continuation && rawRequiresBarrier(raw));
  return (
    <section className="form-section" aria-labelledby="decision-heading-form">
      <div className="form-section__heading"><span className="step-number">4</span><h3 id="decision-heading-form">続けたい気持ちと費用負担</h3></div>
      <fieldset id="continuation" tabIndex={-1} className={`option-section ${errors.continuation ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors.continuation)} aria-describedby={errors.continuation ? 'continuation-error' : undefined}>
        <legend>来月も同じ料金・同じ使い方なら、このジムを選びますか</legend>
        <div className="choice-grid choice-grid--three">
          {continuationOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'continuation-choice' : `continuation-choice-${index}`} name="continuation" value={option.id} checked={raw.continuation === option.id} label={option.label} errorId={errors.continuation ? 'continuation-error' : undefined} onChange={() => update('continuation', option.id as ContinuationIntent)} />)}
        </div>
        {errors.continuation ? <p className="field__error" id="continuation-error">{errors.continuation}</p> : null}
      </fieldset>
      <fieldset id="fee-burden" tabIndex={-1} className={`option-section option-section--spaced ${errors['fee-burden'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['fee-burden'])} aria-describedby={errors['fee-burden'] ? 'fee-burden-error' : undefined}>
        <legend>現在の会費は、生活費に対して無理なく払えますか</legend>
        <div className="choice-grid choice-grid--three">
          {feeBurdenOptions.map((option, index) => <ChoiceOption key={option.id} id={`fee-burden-choice-${index}`} name="fee-burden" value={option.id} checked={raw.feeBurden === option.id} label={option.label} errorId={errors['fee-burden'] ? 'fee-burden-error' : undefined} onChange={() => update('feeBurden', option.id as FeeBurden)} />)}
        </div>
        {errors['fee-burden'] ? <p className="field__error" id="fee-burden-error">{errors['fee-burden']}</p> : null}
      </fieldset>
      {showBarrier ? (
        <fieldset id="barrier" tabIndex={-1} className={`option-section option-section--spaced conditional-panel ${errors.barrier ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors.barrier)} aria-describedby={errors.barrier ? 'barrier-error' : undefined}>
          <legend>継続を迷わせる主な要因は何ですか</legend>
          <p className="field__hint">次の一行動を具体的にするため、最も近いものを1つ選びます。</p>
          <div className="choice-grid choice-grid--option-list">
            {barrierOptions.map((option, index) => <ChoiceOption key={option.id} id={index === 0 ? 'barrier-choice' : `barrier-choice-${index}`} name="barrier" value={option.id} checked={raw.barrier === option.id} label={option.label} errorId={errors.barrier ? 'barrier-error' : undefined} onChange={() => update('barrier', option.id as BarrierId)} />)}
          </div>
          {errors.barrier ? <p className="field__error" id="barrier-error">{errors.barrier}</p> : null}
        </fieldset>
      ) : null}
    </section>
  );
}

export function Calculator({ initialRaw }: { initialRaw?: RawAssessmentInput } = {}) {
  const [raw, setRaw] = useState<RawAssessmentInput>(() => initialRaw ?? createEmptyRawAssessmentInput());
  const [errors, setErrors] = useState<ErrorMap>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  function update<K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) {
    setRaw((current) => {
      const next = { ...current, [key]: value } as RawAssessmentInput;
      if (next.feeBurden && next.continuation && !rawRequiresBarrier(next)) next.barrier = '';
      return next;
    });
    setErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      if (key === 'values' || key === 'noValueUsed') {
        delete next.values;
        Object.keys(next).filter((errorKey) => errorKey.startsWith('value-')).forEach((errorKey) => delete next[errorKey]);
      } else {
        const ids: Partial<Record<keyof RawAssessmentInput, string[]>> = {
          monthlyFee: ['monthly-fee'], additionalFeesMode: ['additional-fees-mode'], monthlyFixedFee: ['monthly-fixed-fee'], annualFee: ['annual-fee'],
          visitMode: ['visit-mode'], visitBand: ['visit-band'], exactVisits: ['exact-visits'], timeMode: ['time-mode'], totalHours: ['total-hours'], averageMinutes: ['average-minutes'],
          feeBurden: ['fee-burden'], continuation: ['continuation'], barrier: ['barrier'],
        };
        ids[key]?.forEach((id) => delete next[id]);
      }
      if (key === 'values' || key === 'noValueUsed' || key === 'feeBurden' || key === 'continuation') delete next.barrier;
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateAssessmentInput(raw);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstError(validation.errors, errorOrderFor(raw));
      return;
    }
    setErrors({});
    setResult(buildAssessmentResult(validation.value));
    requestAnimationFrame(() => resultHeadingRef.current?.focus());
  }

  function edit() {
    setResult(null);
    requestAnimationFrame(() => formHeadingRef.current?.focus());
  }

  if (result) return <ResultSummary result={result} headingRef={resultHeadingRef} onEdit={edit} />;

  return (
    <section className="calculator" aria-labelledby="calculator-heading">
      <div className="calculator__intro">
        <p className="eyebrow">最近の典型的な1か月</p>
        <h2 id="calculator-heading" ref={formHeadingRef} tabIndex={-1}>料金と、残したい価値を入力</h2>
        <p><span aria-hidden="true">必須</span>の質問に回答します。館内利用時間だけ任意です。</p>
      </div>
      <form className="assessment-form" noValidate onSubmit={submit}>
        <ErrorSummary errors={errors} order={errorOrderFor(raw)} />
        <FeesFields raw={raw} errors={errors} update={update} />
        <VisitAndTimeFields raw={raw} errors={errors} update={update} />
        <ValuesFields raw={raw} errors={errors} update={update} />
        <DecisionFields raw={raw} errors={errors} update={update} />
        <div className="form-submit">
          <p>入力内容は保存・送信されず、この画面内だけで計算します。</p>
          <button className="button button--primary button--full" type="submit">診断結果を見る</button>
        </div>
      </form>
    </section>
  );
}
