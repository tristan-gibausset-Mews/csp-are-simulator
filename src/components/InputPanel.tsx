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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="currentMonthlyGrossSalary" text="Salaire brut mensuel actuel" tooltip={inputExplanations.currentMonthlyGrossSalary} />
          <input
            id="currentMonthlyGrossSalary"
            type="number"
            min={0}
            step={50}
            className="field-input"
            value={input.currentMonthlyGrossSalary}
            onChange={(e) => onChange({ currentMonthlyGrossSalary: toNumber(e.target.value) })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="remainingPaidLeaveDays" text="Congés payés restants (jours)" tooltip={inputExplanations.remainingPaidLeaveDays} />
          <input
            id="remainingPaidLeaveDays"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.remainingPaidLeaveDays}
            onChange={(e) => onChange({ remainingPaidLeaveDays: toNumber(e.target.value) })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="age" text="Âge du salarié" tooltip={inputExplanations.age} />
          <input
            id="age"
            type="number"
            min={16}
            max={70}
            step={1}
            className="field-input"
            value={input.age}
            onChange={(e) => onChange({ age: toNumber(e.target.value) })}
          />
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-mews-grey-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-mews-grey-300 text-mews-accent focus:ring-mews-accent"
              checked={input.seniorityAtLeastOneYear}
              onChange={(e) => handleSeniorityToggle(e.target.checked)}
            />
            Ancienneté ≥ 1 an
            <InfoTooltip text={inputExplanations.seniorityAtLeastOneYear} label="À propos de : Ancienneté ≥ 1 an" />
          </label>
        </div>

        <div>
          <FieldLabel htmlFor="monthsBeforeNewJob" text="Durée avant reprise d’un emploi (mois)" tooltip={inputExplanations.monthsBeforeNewJob} />
          <input
            id="monthsBeforeNewJob"
            type="number"
            min={0}
            step={1}
            className="field-input disabled:cursor-not-allowed disabled:bg-mews-grey-100"
            value={input.monthsBeforeNewJob ?? ''}
            disabled={!hasNewJob}
            onChange={(e) => onChange({ monthsBeforeNewJob: toNumber(e.target.value) })}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-mews-grey-500">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-mews-grey-300 text-mews-accent focus:ring-mews-accent"
              checked={!hasNewJob}
              onChange={handleNoNewJobToggle}
            />
            Pas de reprise d’emploi
          </label>
        </div>

        <div>
          <FieldLabel htmlFor="newMonthlyGrossSalary" text="Salaire brut mensuel du nouvel emploi" tooltip={inputExplanations.newMonthlyGrossSalary} />
          <input
            id="newMonthlyGrossSalary"
            type="number"
            min={0}
            step={50}
            className="field-input disabled:cursor-not-allowed disabled:bg-mews-grey-100"
            value={input.newMonthlyGrossSalary ?? ''}
            disabled={!hasNewJob}
            onChange={(e) => onChange({ newMonthlyGrossSalary: toNumber(e.target.value) })}
          />
        </div>

        <div className={!input.seniorityAtLeastOneYear ? 'rounded-lg border border-mews-accent/40 bg-mews-accent-light p-2 sm:col-span-2' : ''}>
          <FieldLabel
            htmlFor="currentEmployerSeniorityMonths"
            text="Ancienneté chez l’employeur actuel (mois)"
            tooltip={inputExplanations.currentEmployerSeniorityMonthsInput}
          />
          <input
            id="currentEmployerSeniorityMonths"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.currentEmployerSeniorityMonths}
            onChange={(e) => onChange({ currentEmployerSeniorityMonths: toNumber(e.target.value) })}
          />
          {!input.seniorityAtLeastOneYear && (
            <p className="mt-1 text-xs text-mews-accent">
              Ancienneté &lt; 1 an cochée : vérifiez cette valeur, elle influence l’estimation de vos droits ARE.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
