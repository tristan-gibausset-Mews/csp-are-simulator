import type { ChangeEvent } from 'react';
import InfoTooltip from './InfoTooltip';
import { inputExplanations } from '../lib/resultExplanations';
import type { SimulationInput } from '../lib/types';

interface InputPanelProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
}

const NEW_SALARY_MIN = 0;
const NEW_SALARY_MAX = 15000;
const NEW_SALARY_STEP = 100;

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function FieldLabel({ htmlFor, text, tooltip }: { htmlFor: string; text: string; tooltip: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-mews-grey-900">
        {text}
      </label>
      <InfoTooltip text={tooltip} label={`À propos de : ${text}`} />
    </div>
  );
}

function FieldWithUnit({
  id,
  value,
  unit,
  disabled,
  onChange,
  step = 1,
  min = 0,
  max,
  width = 150,
}: {
  id: string;
  value: number | '';
  unit: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  width?: number;
}) {
  return (
    <div
      style={{ width }}
      className={`flex h-9 items-center gap-1.5 rounded-lg border pl-2.5 pr-2.5 transition-colors ${
        disabled
          ? 'border-mews-grey-300/30 bg-mews-grey-100/40'
          : 'border-mews-grey-300/60 bg-background-card-muted focus-within:border-mews-accent focus-within:ring-2 focus-within:ring-mews-accent/20'
      }`}
    >
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        className="h-full w-full min-w-0 border-0 bg-transparent p-0 text-sm text-mews-grey-900 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-mews-grey-500"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-mews-grey-500">{unit}</span>
    </div>
  );
}

function BlockTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-3 border-b border-mews-grey-300/30 pb-2 text-xs font-semibold uppercase tracking-wide text-mews-grey-500">
      {children}
    </h3>
  );
}

/** Champ salaire du nouvel emploi : input exact + curseur synchronisés. */
function NewSalarySlider({
  value,
  disabled,
  onChange,
}: {
  value: number | '';
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <FieldWithUnit
        id="newMonthlyGrossSalary"
        value={value}
        unit="€/mois brut"
        step={NEW_SALARY_STEP}
        max={NEW_SALARY_MAX}
        width={170}
        disabled={disabled}
        onChange={(v) => onChange(toNumber(v))}
      />
      <input
        type="range"
        aria-label="Salaire du nouvel emploi"
        min={NEW_SALARY_MIN}
        max={NEW_SALARY_MAX}
        step={NEW_SALARY_STEP}
        value={value === '' ? 0 : value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-mews mt-3 max-w-[220px]"
      />
      <div className="mt-1 flex max-w-[220px] justify-between text-[10px] text-mews-grey-500">
        <span>0</span>
        <span>5k</span>
        <span>10k</span>
        <span>15k</span>
      </div>
    </div>
  );
}

export default function InputPanel({ input, onChange }: InputPanelProps) {
  const hasNewJob = input.monthsBeforeNewJob !== null;

  const handleNoNewJobToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onChange({ monthsBeforeNewJob: null, newMonthlyGrossSalary: null });
    } else {
      onChange({ monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    }
  };

  const handleSeniorityToggle = (checked: boolean) => {
    const patch: Partial<SimulationInput> = { seniorityAtLeastOneYear: checked };
    if (checked && input.currentEmployerSeniorityMonths < 12) {
      patch.currentEmployerSeniorityMonths = 12;
    }
    onChange(patch);
  };

  return (
    <section className="card" aria-labelledby="input-panel-title">
      <h2 id="input-panel-title" className="section-title mb-4">
        Votre situation
      </h2>

      <div className="space-y-6">
        <div>
          <BlockTitle>Aujourd’hui</BlockTitle>
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="currentMonthlyGrossSalary" text="Salaire actuel" tooltip={inputExplanations.currentMonthlyGrossSalary} />
              <FieldWithUnit
                id="currentMonthlyGrossSalary"
                value={input.currentMonthlyGrossSalary}
                unit="€/mois brut"
                step={50}
                width={180}
                onChange={(v) => onChange({ currentMonthlyGrossSalary: toNumber(v) })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="age" text="Âge" tooltip={inputExplanations.age} />
              <FieldWithUnit id="age" value={input.age} unit="ans" min={16} width={110} onChange={(v) => onChange({ age: toNumber(v) })} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-mews-grey-900">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={input.seniorityAtLeastOneYear}
                onChange={(e) => handleSeniorityToggle(e.target.checked)}
              />
              Ancienneté d’au moins 1 an
              <InfoTooltip text={inputExplanations.seniorityAtLeastOneYear} label="À propos de : ancienneté d’au moins 1 an" />
            </label>

            {!input.seniorityAtLeastOneYear && (
              <div className="rounded-lg border border-warn/25 bg-warn/10 p-3">
                <FieldLabel
                  htmlFor="currentEmployerSeniorityMonths"
                  text="Ancienneté chez l’employeur actuel"
                  tooltip={inputExplanations.currentEmployerSeniorityMonthsInput}
                />
                <FieldWithUnit
                  id="currentEmployerSeniorityMonths"
                  value={input.currentEmployerSeniorityMonths}
                  unit="mois"
                  width={130}
                  onChange={(v) => onChange({ currentEmployerSeniorityMonths: toNumber(v) })}
                />
                <p className="mt-1.5 text-xs leading-relaxed text-warn">
                  Ancienneté &lt; 1 an : cette valeur influence l’estimation de vos droits ARE.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <BlockTitle>Solde de départ</BlockTitle>
          <div>
            <FieldLabel htmlFor="remainingPaidLeaveDays" text="Congés restants" tooltip={inputExplanations.remainingPaidLeaveDays} />
            <FieldWithUnit
              id="remainingPaidLeaveDays"
              value={input.remainingPaidLeaveDays}
              unit="jours"
              width={130}
              onChange={(v) => onChange({ remainingPaidLeaveDays: toNumber(v) })}
            />
          </div>
        </div>

        <div>
          <BlockTitle>Reprise d’emploi</BlockTitle>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-mews-grey-900">
              <input type="checkbox" className="checkbox-input" checked={!hasNewJob} onChange={handleNoNewJobToggle} />
              Pas de reprise d’emploi
            </label>

            <div className={!hasNewJob ? 'opacity-40' : ''}>
              <FieldLabel htmlFor="monthsBeforeNewJob" text="Reprise d’emploi dans" tooltip={inputExplanations.monthsBeforeNewJob} />
              <FieldWithUnit
                id="monthsBeforeNewJob"
                value={input.monthsBeforeNewJob ?? ''}
                unit="mois"
                width={120}
                disabled={!hasNewJob}
                onChange={(v) => onChange({ monthsBeforeNewJob: toNumber(v) })}
              />
            </div>

            <div className={!hasNewJob ? 'opacity-40' : ''}>
              <FieldLabel htmlFor="newMonthlyGrossSalary" text="Salaire du nouvel emploi" tooltip={inputExplanations.newMonthlyGrossSalary} />
              <NewSalarySlider
                value={input.newMonthlyGrossSalary ?? ''}
                disabled={!hasNewJob}
                onChange={(v) => onChange({ newMonthlyGrossSalary: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
