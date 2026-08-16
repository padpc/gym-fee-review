import { type FormEvent, useRef, useState } from 'react';
import { ErrorSummary } from '../../components/ErrorSummary';
import { NumericField } from '../../components/NumericField';
import {
  buildAssessmentResult,
  feeBurdenOptions,
  valueOptions,
  valueStatusOptions,
  visitBandOptions,
  type AssessmentResult,
  type FeeBurden,
  type ValueId,
  type ValueStatus,
  type VisitBandId,
  type VisitMode,
} from '../../domain/assessment';
import {
  createEmptyRawAssessmentInput,
  normalizeDigits,
  validateAssessmentInput,
  type ErrorMap,
  type FeeMode,
  type RawAssessmentInput,
  type RawValueEntry,
  type TimeMode,
} from '../../domain/validation';
import { formatYen } from '../../shared/format';
import { ResultSummary } from './ResultSummary';

const fixedErrorOrder = [
  'monthly-fee',
  'monthly-additional-mode',
  'monthly-additional',
  'annual-fee-mode',
  'annual-fee',
  'visit-mode',
  'exact-visits',
  'visit-band',
  'time-mode',
  'total-hours',
  'average-minutes',
  'values',
  'primary-value',
  'secondary-values',
  'fee-burden',
];

const valueQuestionById: Record<ValueId, string> = {
  training: '使いたかったトレーニング設備は、期待していた状態にどの程度近かったですか',
  studio: '参加したかったスタジオ・プログラムは、期待していた状態にどの程度近かったですか',
  pool: 'プール・水中運動は、期待していた状態にどの程度近かったですか',
  'bath-sauna': '風呂・温泉・サウナ・休憩は、期待していた状態にどの程度近かったですか',
  coaching: '指導・フォーム確認は、期待していた状態にどの程度近かったですか',
  social: '友人との交流・コミュニティは、期待していた状態にどの程度近かったですか',
  convenience: '立地・営業時間・通いやすさは、実際の生活にどの程度合っていましたか',
  other: 'この利用は、会費を払う理由として期待していた状態にどの程度近かったですか',
};

function errorOrderFor(raw: RawAssessmentInput): string[] {
  return [
    ...fixedErrorOrder.slice(0, fixedErrorOrder.indexOf('fee-burden')),
    ...raw.values.flatMap((value) => [
      `value-${value.id}-custom-label`,
      `value-${value.id}-role`,
      `value-${value.id}-status`,
    ]),
    'fee-burden',
  ];
}

function focusFirstError(errors: ErrorMap, order: string[]) {
  const fieldId = order.find((id) => errors[id]) ?? Object.keys(errors)[0];
  if (fieldId) requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
}

function formErrors(errors: ErrorMap): ErrorMap {
  if (!errors.values || errors['primary-value']) return errors;
  const normalized: ErrorMap = { ...errors, 'primary-value': errors.values };
  delete normalized.values;
  return normalized;
}

function hasExactZeroVisits(raw: RawAssessmentInput): boolean {
  const normalized = normalizeDigits(raw.exactVisits);
  return raw.visitMode === 'exact' && /^\d+$/.test(normalized) && Number(normalized) === 0;
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
  disabled = false,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`checkbox-card ${checked ? 'checkbox-card--selected' : ''} ${disabled ? 'checkbox-card--disabled' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function TextField({ id, label, value, error, onChange }: {
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

function FeesFields({ raw, errors, update }: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  function changeMonthlyMode(mode: FeeMode) {
    update('monthlyAdditionalMode', mode);
    if (mode !== 'known') update('monthlyAdditionalFee', '');
  }

  function changeAnnualMode(mode: FeeMode) {
    update('annualFeeMode', mode);
    if (mode !== 'known') update('annualFee', '');
  }

  return (
    <section className="form-section" aria-labelledby="fees-heading">
      <div className="form-section__heading"><span className="step-number">1</span><h3 id="fees-heading">支払っている料金</h3></div>
      <NumericField
        id="monthly-fee"
        label="基本月会費"
        value={raw.monthlyFee}
        onChange={(value) => update('monthlyFee', value)}
        unit="円／月"
        maxLength={6}
        error={errors['monthly-fee']}
        hint="プランに表示されている月額だけを入力します。毎月のオプション費や年会費は下で分けます。"
      />

      <fieldset id="monthly-additional-mode" tabIndex={-1} className={`option-section option-section--spaced ${errors['monthly-additional-mode'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['monthly-additional-mode'])} aria-describedby={errors['monthly-additional-mode'] ? 'monthly-additional-mode-error' : undefined}>
        <legend>毎月必須の追加費用</legend>
        <p className="field__hint">契約上必ず払うロッカー代や必須オプションなど。都度払いは含めません。</p>
        <div className="choice-grid choice-grid--two">
          <ChoiceOption id="monthly-additional-none" name="monthly-additional-mode" value="none" checked={raw.monthlyAdditionalMode === 'none'} label="なし" errorId={errors['monthly-additional-mode'] ? 'monthly-additional-mode-error' : undefined} onChange={() => changeMonthlyMode('none')} />
          <ChoiceOption id="monthly-additional-known" name="monthly-additional-mode" value="known" checked={raw.monthlyAdditionalMode === 'known'} label="あり" errorId={errors['monthly-additional-mode'] ? 'monthly-additional-mode-error' : undefined} onChange={() => changeMonthlyMode('known')} />
        </div>
        {errors['monthly-additional-mode'] ? <p className="field__error" id="monthly-additional-mode-error">{errors['monthly-additional-mode']}</p> : null}
        {raw.monthlyAdditionalMode === 'known' ? (
          <div className="nested-input"><NumericField id="monthly-additional" label="毎月必須の追加費用" value={raw.monthlyAdditionalFee} onChange={(value) => update('monthlyAdditionalFee', value)} unit="円／月" maxLength={5} error={errors['monthly-additional']} /></div>
        ) : null}
      </fieldset>

      <fieldset id="annual-fee-mode" tabIndex={-1} className={`option-section option-section--spaced ${errors['annual-fee-mode'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['annual-fee-mode'])} aria-describedby={errors['annual-fee-mode'] ? 'annual-fee-mode-error' : undefined}>
        <legend>年会費・更新料など</legend>
        <p className="field__hint">年に一度など、月会費とは別に繰り返し払う費用です。入会金など一度だけの費用は含めません。</p>
        <div className="choice-grid choice-grid--two">
          <ChoiceOption id="annual-fee-none" name="annual-fee-mode" value="none" checked={raw.annualFeeMode === 'none'} label="なし" errorId={errors['annual-fee-mode'] ? 'annual-fee-mode-error' : undefined} onChange={() => changeAnnualMode('none')} />
          <ChoiceOption id="annual-fee-known" name="annual-fee-mode" value="known" checked={raw.annualFeeMode === 'known'} label="あり" errorId={errors['annual-fee-mode'] ? 'annual-fee-mode-error' : undefined} onChange={() => changeAnnualMode('known')} />
        </div>
        {errors['annual-fee-mode'] ? <p className="field__error" id="annual-fee-mode-error">{errors['annual-fee-mode']}</p> : null}
        {raw.annualFeeMode === 'known' ? (
          <div className="nested-input"><NumericField id="annual-fee" label="年会費・更新料など" value={raw.annualFee} onChange={(value) => update('annualFee', value)} unit="円／年" maxLength={6} error={errors['annual-fee']} hint="12分の1を月額へ加えます。" /></div>
        ) : null}
      </fieldset>
      <p className="inline-note">基本月会費に含まれている料金を、追加費用や年会費へ重ねて入力しないでください。</p>
    </section>
  );
}

function VisitAndTimeFields({ raw, errors, update }: {
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
        <legend>最近の1か月の来館回数</legend>
        <p className="field__hint">正確でなくても、範囲や「分からない」で診断できます。</p>
        <div className="choice-grid choice-grid--three">
          <ChoiceOption id="visit-mode" name="visit-mode" value="exact" checked={raw.visitMode === 'exact'} label="回数が分かる" errorId={errors['visit-mode'] ? 'visit-mode-error' : undefined} onChange={() => changeVisitMode('exact')} />
          <ChoiceOption id="visit-mode-range" name="visit-mode" value="range" checked={raw.visitMode === 'range'} label="だいたい分かる" errorId={errors['visit-mode'] ? 'visit-mode-error' : undefined} onChange={() => changeVisitMode('range')} />
          <ChoiceOption id="visit-mode-unknown" name="visit-mode" value="unknown" checked={raw.visitMode === 'unknown'} label="分からない" errorId={errors['visit-mode'] ? 'visit-mode-error' : undefined} onChange={() => changeVisitMode('unknown')} />
        </div>
        {errors['visit-mode'] ? <p className="field__error" id="visit-mode-error">{errors['visit-mode']}</p> : null}
        {raw.visitMode === 'exact' ? <div className="nested-input"><NumericField id="exact-visits" label="来館回数" value={raw.exactVisits} onChange={(value) => update('exactVisits', value)} unit="回／月" maxLength={3} error={errors['exact-visits']} hint="行かなかった月は0回と入力します。" /></div> : null}
        {raw.visitMode === 'range' ? (
          <fieldset className={`nested-fieldset ${errors['visit-band'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['visit-band'])} aria-describedby={errors['visit-band'] ? 'visit-band-error' : undefined}>
            <legend>だいたいの来館回数</legend>
            <div className="choice-grid choice-grid--bands">
              {visitBandOptions.map((band, index) => <ChoiceOption key={band.id} id={index === 0 ? 'visit-band' : `visit-band-${band.id}`} name="visit-band" value={band.id} checked={raw.visitBand === band.id} label={band.label} errorId={errors['visit-band'] ? 'visit-band-error' : undefined} onChange={() => update('visitBand', band.id as VisitBandId)} />)}
            </div>
            {errors['visit-band'] ? <p className="field__error" id="visit-band-error">{errors['visit-band']}</p> : null}
          </fieldset>
        ) : null}
        {raw.visitMode === 'unknown' ? <p className="inline-note">結果では回数別の参考額を示し、分からない回数を勝手に決めません。</p> : null}
      </fieldset>

      <fieldset id="time-mode" tabIndex={-1} className={`option-section option-section--spaced ${errors['time-mode'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['time-mode'])} aria-describedby={errors['time-mode'] ? 'time-mode-error' : undefined}>
        <legend>館内利用時間も料金表示に使いますか <span className="field__status" aria-hidden="true">任意</span></legend>
        <p className="field__hint">着替え、運動、クラス、プール、風呂・温泉・サウナ、休憩を含む館内で過ごした時間です。</p>
        <div className="choice-grid choice-grid--three">
          <ChoiceOption id="time-mode-choice" name="time-mode" value="unknown" checked={raw.timeMode === 'unknown'} label="入力しない" errorId={errors['time-mode'] ? 'time-mode-error' : undefined} onChange={() => changeTimeMode('unknown')} />
          <ChoiceOption id="time-mode-total" name="time-mode" value="total-hours" checked={raw.timeMode === 'total-hours'} label="月の合計時間" errorId={errors['time-mode'] ? 'time-mode-error' : undefined} onChange={() => changeTimeMode('total-hours')} />
          <ChoiceOption id="time-mode-average" name="time-mode" value="average-minutes" checked={raw.timeMode === 'average-minutes'} label="1回の平均時間" errorId={errors['time-mode'] ? 'time-mode-error' : undefined} onChange={() => changeTimeMode('average-minutes')} />
        </div>
        {errors['time-mode'] ? <p className="field__error" id="time-mode-error">{errors['time-mode']}</p> : null}
        {raw.timeMode === 'total-hours' ? <div className="nested-input"><NumericField id="total-hours" label="月の合計館内利用時間" value={raw.totalHours} onChange={(value) => update('totalHours', value)} unit="時間／月" maxLength={5} inputMode="decimal" error={errors['total-hours']} hint="0.1時間（6分）単位で入力します。" /></div> : null}
        {raw.timeMode === 'average-minutes' ? <div className="nested-input"><NumericField id="average-minutes" label="1回の平均館内利用時間" value={raw.averageMinutes} onChange={(value) => update('averageMinutes', value)} unit="分／回" maxLength={4} error={errors['average-minutes']} /></div> : null}
        <p className="inline-note">館内利用時間は1時間あたり料金にだけ使い、長いほど価値や質が高いとは判定しません。</p>
      </fieldset>
    </section>
  );
}

function ValueEntryFields({ entry, errors, update }: {
  entry: RawValueEntry;
  errors: ErrorMap;
  update: (next: RawValueEntry) => void;
}) {
  const prefix = `value-${entry.id}`;
  const label = valueOptions.find((option) => option.id === entry.id)?.label ?? entry.id;
  return (
    <article className="value-entry" aria-labelledby={`${prefix}-heading`}>
      <div className="value-entry__heading">
        <h4 id={`${prefix}-heading`}>{entry.id === 'other' && entry.customLabel.trim() ? entry.customLabel : label}</h4>
        <span>{entry.role === 'primary' ? '最も重要' : '追加の理由'}</span>
      </div>
      {entry.id === 'other' ? <TextField id={`${prefix}-custom-label`} label="具体的な利用" value={entry.customLabel} error={errors[`${prefix}-custom-label`]} onChange={(customLabel) => update({ ...entry, customLabel })} /> : null}
      <fieldset id={`${prefix}-status`} tabIndex={-1} className={`nested-fieldset value-question ${errors[`${prefix}-status`] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors[`${prefix}-status`])} aria-describedby={errors[`${prefix}-status`] ? `${prefix}-status-error` : undefined}>
        <legend>{valueQuestionById[entry.id]}</legend>
        <div className="choice-grid choice-grid--status">
          {valueStatusOptions.map((option, index) => <ChoiceOption key={option.id} id={`${prefix}-status-${index}`} name={`${prefix}-status`} value={option.id} checked={entry.status === option.id} label={option.label} errorId={errors[`${prefix}-status`] ? `${prefix}-status-error` : undefined} onChange={() => update({ ...entry, status: option.id as ValueStatus })} />)}
        </div>
        {errors[`${prefix}-status`] ? <p className="field__error" id={`${prefix}-status-error`}>{errors[`${prefix}-status`]}</p> : null}
      </fieldset>
    </article>
  );
}

function ValuesFields({ raw, errors, update }: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  const primary = raw.values.find((value) => value.role === 'primary');
  const secondary = raw.values.filter((value) => value.role === 'secondary');

  function selectPrimary(id: ValueId | 'none') {
    if (id === 'none') {
      update('values', []);
      update('noValueUsed', true);
      return;
    }
    const selected = raw.values.find((value) => value.id === id) ?? { id, customLabel: '', role: '', status: '' };
    const nextSecondary = raw.values.filter((value) => value.id !== id && value.role === 'secondary');
    update('values', [{ ...selected, role: 'primary' }, ...nextSecondary.slice(0, 2)]);
    update('noValueUsed', false);
  }

  function toggleSecondary(id: ValueId, checked: boolean) {
    if (checked && secondary.length < 2) {
      update('values', [...raw.values, { id, customLabel: '', role: 'secondary', status: '' }]);
    } else if (!checked) {
      update('values', raw.values.filter((value) => value.id !== id));
    }
  }

  function updateEntry(next: RawValueEntry) {
    update('values', raw.values.map((value) => value.id === next.id ? next : value));
  }

  return (
    <section className="form-section" aria-labelledby="values-heading">
      <div className="form-section__heading"><span className="step-number">3</span><h3 id="values-heading">会費を払う理由として重要だった利用</h3></div>
      <fieldset id="primary-value" tabIndex={-1} className={`option-section ${errors['primary-value'] || errors.values ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['primary-value'] || errors.values)} aria-describedby={errors['primary-value'] ? 'primary-value-error' : errors.values ? 'values-error' : undefined}>
        <legend>最も重要だったものを1つ選んでください</legend>
        <p className="field__hint">利用回数が少なくても、会費を払う一番の理由なら選べます。風呂・サウナだけでも対象です。</p>
        <div className="choice-grid choice-grid--value-options">
          {valueOptions.map((option) => <ChoiceOption key={option.id} id={`primary-value-${option.id}`} name="primary-value" value={option.id} checked={primary?.id === option.id} label={option.label} errorId={errors['primary-value'] ? 'primary-value-error' : undefined} onChange={() => selectPrimary(option.id)} />)}
          <ChoiceOption id="no-value-used" name="primary-value" value="none" checked={raw.noValueUsed} label="特にない" errorId={errors['primary-value'] ? 'primary-value-error' : undefined} onChange={() => selectPrimary('none')} />
        </div>
        {errors.values ? <p className="field__error" id="values-error">{errors.values}</p> : null}
        {errors['primary-value'] ? <p className="field__error" id="primary-value-error">{errors['primary-value']}</p> : null}
      </fieldset>

      {primary ? (
        <fieldset id="secondary-values" tabIndex={-1} className={`option-section option-section--spaced ${errors['secondary-values'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['secondary-values'])} aria-describedby={errors['secondary-values'] ? 'secondary-values-error' : undefined}>
          <legend>ほかにも大きな理由があれば、2つまで選べます <span className="field__status" aria-hidden="true">任意</span></legend>
          <p className="field__hint">小さな利用をすべて選ぶ必要はありません。</p>
          <div className="checkbox-grid">
            {valueOptions.filter((option) => option.id !== primary.id).map((option) => {
              const checked = secondary.some((value) => value.id === option.id);
              return <CheckboxOption key={option.id} id={`secondary-value-${option.id}`} checked={checked} disabled={!checked && secondary.length >= 2} label={option.label} onChange={(nextChecked) => toggleSecondary(option.id, nextChecked)} />;
            })}
          </div>
          <p className="selection-count" aria-live="polite">追加で選択中：{secondary.length}／2件</p>
          {errors['secondary-values'] ? <p className="field__error" id="secondary-values-error">{errors['secondary-values']}</p> : null}
        </fieldset>
      ) : null}

      {raw.values.length > 0 ? (
        <div className="value-entry-list">
          {[...raw.values].sort((a, b) => a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1).map((entry) => <ValueEntryFields key={entry.id} entry={entry} errors={errors} update={updateEntry} />)}
        </div>
      ) : raw.noValueUsed ? <p className="inline-note">重要な利用が特にないことを、料金と負担の情報と合わせて判断します。</p> : null}
    </section>
  );
}

function parseYen(value: string, minimum: number, maximum: number): number | null {
  const normalized = normalizeDigits(value);
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function FeePreview({ raw }: { raw: RawAssessmentInput }) {
  const base = parseYen(raw.monthlyFee, 0, 100_000);
  if (base === null) return <p className="fee-preview fee-preview--empty">基本月会費を入力すると、ここに判断対象の月額を表示します。</p>;
  const monthlyAdditional = raw.monthlyAdditionalMode === 'known'
    ? parseYen(raw.monthlyAdditionalFee, 1, 50_000)
    : raw.monthlyAdditionalMode === 'none' ? 0 : null;
  const annual = raw.annualFeeMode === 'known'
    ? parseYen(raw.annualFee, 1, 200_000)
    : raw.annualFeeMode === 'none' ? 0 : null;
  const missingInputs = [
    !raw.monthlyAdditionalMode
      ? '毎月必須の追加費用の有無'
      : monthlyAdditional === null ? '毎月必須の追加費用の金額' : '',
    !raw.annualFeeMode
      ? '年会費・更新料などの有無'
      : annual === null ? '年会費・更新料などの金額' : '',
  ].filter(Boolean);
  if (monthlyAdditional === null || annual === null) {
    return (
      <div className="fee-preview fee-preview--empty" aria-live="polite">
        <p>実質月額はまだ計算できません</p>
        <span>次を入力してください：{missingInputs.join('、')}</span>
      </div>
    );
  }
  const subtotal = Math.round(base + monthlyAdditional + annual / 12);
  return (
    <div className="fee-preview" aria-live="polite">
      <p>計算済みの実質月額</p>
      <strong>{formatYen(subtotal)}</strong>
    </div>
  );
}

function DecisionFields({ raw, errors, update }: {
  raw: RawAssessmentInput;
  errors: ErrorMap;
  update: <K extends keyof RawAssessmentInput>(key: K, value: RawAssessmentInput[K]) => void;
}) {
  return (
    <section className="form-section" aria-labelledby="decision-heading-form">
      <div className="form-section__heading"><span className="step-number">4</span><h3 id="decision-heading-form">会費の負担</h3></div>
      <FeePreview raw={raw} />
      <fieldset id="fee-burden" tabIndex={-1} className={`option-section option-section--spaced ${errors['fee-burden'] ? 'option-section--error' : ''}`} aria-invalid={Boolean(errors['fee-burden'])} aria-describedby={errors['fee-burden'] ? 'fee-burden-error' : undefined}>
        <legend>実際に支払う会費は、生活費に対して無理なく払えますか</legend>
        <div className="choice-grid choice-grid--three">
          {feeBurdenOptions.map((option, index) => <ChoiceOption key={option.id} id={`fee-burden-choice-${index}`} name="fee-burden" value={option.id} checked={raw.feeBurden === option.id} label={option.label} errorId={errors['fee-burden'] ? 'fee-burden-error' : undefined} onChange={() => update('feeBurden', option.id as FeeBurden)} />)}
        </div>
        {errors['fee-burden'] ? <p className="field__error" id="fee-burden-error">{errors['fee-burden']}</p> : null}
      </fieldset>
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
    setRaw((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      if (key === 'values' || key === 'noValueUsed') {
        delete next.values;
        delete next['primary-value'];
        delete next['secondary-values'];
        Object.keys(next).filter((errorKey) => errorKey.startsWith('value-')).forEach((errorKey) => delete next[errorKey]);
      } else {
        const ids: Partial<Record<keyof RawAssessmentInput, string[]>> = {
          monthlyFee: ['monthly-fee'],
          monthlyAdditionalMode: ['monthly-additional-mode'],
          monthlyAdditionalFee: ['monthly-additional'],
          annualFeeMode: ['annual-fee-mode'],
          annualFee: ['annual-fee'],
          visitMode: ['visit-mode'],
          visitBand: ['visit-band'],
          exactVisits: ['exact-visits'],
          timeMode: ['time-mode'],
          totalHours: ['total-hours'],
          averageMinutes: ['average-minutes'],
          feeBurden: ['fee-burden'],
        };
        ids[key]?.forEach((id) => delete next[id]);
      }
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedRaw = hasExactZeroVisits(raw)
      ? { ...raw, values: [], noValueUsed: true }
      : raw;
    const validation = validateAssessmentInput(submittedRaw);
    if (!validation.ok) {
      const normalizedErrors = formErrors(validation.errors);
      setErrors(normalizedErrors);
      focusFirstError(normalizedErrors, errorOrderFor(submittedRaw));
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
        <p className="eyebrow">料金と利用を具体的に確認</p>
        <h2 id="calculator-heading" ref={formHeadingRef} tabIndex={-1}>今の会費を診断する</h2>
        <p>料金、利用、期待、負担を入力します。館内利用時間と追加の利用理由だけ任意です。</p>
      </div>
      <form className="assessment-form" noValidate onSubmit={submit}>
        <ErrorSummary errors={errors} order={errorOrderFor(raw)} />
        <FeesFields raw={raw} errors={errors} update={update} />
        <VisitAndTimeFields raw={raw} errors={errors} update={update} />
        {hasExactZeroVisits(raw) ? (
          <section className="form-section zero-use-section" aria-labelledby="zero-use-heading">
            <div className="form-section__heading"><span className="step-number">3</span><h3 id="zero-use-heading">最近の利用</h3></div>
            <p className="inline-note">来館0回のため、重要だった利用の質問は省略します。今月利用しなかった事実を料金と負担に合わせて判断します。</p>
          </section>
        ) : <ValuesFields raw={raw} errors={errors} update={update} />}
        <DecisionFields raw={raw} errors={errors} update={update} />
        <div className="form-submit">
          <p>入力内容は保存・送信されず、この画面内だけで計算します。</p>
          <button className="button button--primary button--full" type="submit">診断結果を見る</button>
        </div>
      </form>
      <aside className="privacy-note" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">入力と診断について</h2>
        <p>入力はこの端末のブラウザ内だけで処理し、保存・送信しません。契約変更を自動で決めず、全国一律の合格額や不透明な総合点も使いません。</p>
        <a className="text-link" href="/methodology">計算方法を確認する</a>
      </aside>
    </section>
  );
}
