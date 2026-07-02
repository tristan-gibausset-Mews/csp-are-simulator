import type { ChangeEvent } from 'react';
import InfoTooltip from './InfoTooltip';
import { inputExplanations } from '../lib/resultExplanations';
import type { SimulationInput } from '../lib/types';

interface InputPanelProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function FieldLabel({ htmlFor, text, tooltip }: { htmlFor: string; text: string; tooltip: string }) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
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
}: {
  id: string;
  value: number | '';
  unit: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        className="field-input disabled:cursor-not-allowed disabled:bg-mews-grey-100"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="shrink-0 text-xs text-mews-grey-500">{unit}</span>
    </div>
  );
}

function BlockTitle({ children }: { children: string }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mews-grey-500">{children}</h3>;
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
      <h2 id="input-panel-title" className="mb-4 text-lg font-semibold text-mews-grey-900">
        Votre situation
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                onChange={(v) => onChange({ currentMonthlyGrossSalary: toNumber(v) })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="age" text="Âge" tooltip={inputExplanations.age} />
              <FieldWithUnit id="age" value={input.age} unit="ans" min={16} onChange={(v) => onChange({ age: toNumber(v) })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-mews-grey-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-mews-grey-300 text-mews-accent focus:ring-mews-accent"
                checked={input.seniorityAtLeastOneYear}
                onChange={(e) => handleSeniorityToggle(e.target.checked)}
              />
              Ancienneté d’au moins 1 an
              <InfoTooltip text={inputExplanations.seniorityAtLeastOneYear} label="À propos de : ancienneté d’au moins 1 an" />
            </label>

            {!input.seniorityAtLeastOneYear && (
              <div className="rounded-lg border border-mews-accent/40 bg-mews-accent-light p-2">
                <FieldLabel
                  htmlFor="currentEmployerSeniorityMonths"
                  text="Ancienneté chez l’employeur actuel"
                  tooltip={inputExplanations.currentEmployerSeniorityMonthsInput}
                />
                <FieldWithUnit
                  id="currentEmployerSeniorityMonths"
                  value={input.currentEmployerSeniorityMonths}
                  unit="mois"
                  onChange={(v) => onChange({ currentEmployerSeniorityMonths: toNumber(v) })}
                />
                <p className="mt-1 text-xs text-mews-accent">
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
              onChange={(v) => onChange({ remainingPaidLeaveDays: toNumber(v) })}
            />
          </div>
        </div>

        <div>
          <BlockTitle>Reprise d’emploi</BlockTitle>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-mews-grey-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-mews-grey-300 text-mews-accent focus:ring-mews-accent"
                checked={!hasNewJob}
                onChange={handleNoNewJobToggle}
              />
              Pas de reprise d’emploi
            </label>

            <div>
              <FieldLabel htmlFor="monthsBeforeNewJob" text="Reprise d’emploi dans" tooltip={inputExplanations.monthsBeforeNewJob} />
              <FieldWithUnit
                id="monthsBeforeNewJob"
                value={input.monthsBeforeNewJob ?? ''}
                unit="mois"
                disabled={!hasNewJob}
                onChange={(v) => onChange({ monthsBeforeNewJob: toNumber(v) })}
              />
            </div>

            <div>
              <FieldLabel htmlFor="newMonthlyGrossSalary" text="Salaire du nouvel emploi" tooltip={inputExplanations.newMonthlyGrossSalary} />
              <FieldWithUnit
                id="newMonthlyGrossSalary"
                value={input.newMonthlyGrossSalary ?? ''}
                unit="€/mois brut"
                step={50}
                disabled={!hasNewJob}
                onChange={(v) => onChange({ newMonthlyGrossSalary: toNumber(v) })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
