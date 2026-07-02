import AccordionPanel from './AccordionPanel';
import InfoTooltip from './InfoTooltip';
import { inputExplanations } from '../lib/resultExplanations';
import type { ContractType, SimulationHorizonMode, SimulationInput } from '../lib/types';

interface AdvancedSettingsProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
}

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'INTERIM', label: 'Intérim' },
  { value: 'OTHER', label: 'Autre' },
];

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

export default function AdvancedSettings({ input, onChange }: AdvancedSettingsProps) {
  const isCdi = input.newJobContractType === 'CDI';
  const isManualHorizon = input.simulationHorizonMode === 'manual';

  const handleContractTypeChange = (value: ContractType) => {
    if (value === 'CDI') {
      onChange({ newJobContractType: value, newJobContractDurationMonths: null });
    } else if (input.newJobContractDurationMonths === null) {
      onChange({ newJobContractType: value, newJobContractDurationMonths: 6 });
    } else {
      onChange({ newJobContractType: value });
    }
  };

  return (
    <AccordionPanel title="Modifier les hypothèses avancées" subtitle="Préavis, indemnité supra-légale, durée des droits, contrat repris…">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor="currentEmployerSeniorityMonthsAdvanced"
            text="Ancienneté chez l’employeur actuel (mois)"
            tooltip={inputExplanations.currentEmployerSeniorityMonthsInput}
          />
          <input
            id="currentEmployerSeniorityMonthsAdvanced"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.currentEmployerSeniorityMonths}
            onChange={(e) => onChange({ currentEmployerSeniorityMonths: toNumber(e.target.value) })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="noticePeriodMonths" text="Durée du préavis (mois)" tooltip={inputExplanations.noticePeriodMonths} />
          <input
            id="noticePeriodMonths"
            type="number"
            min={0}
            step={0.5}
            className="field-input"
            value={input.noticePeriodMonths}
            onChange={(e) => onChange({ noticePeriodMonths: toNumber(e.target.value) })}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="supraLegalSeveranceMonths"
            text="Indemnité supra-légale (mois de salaire)"
            tooltip={inputExplanations.supraLegalSeveranceMonthsInput}
          />
          <input
            id="supraLegalSeveranceMonths"
            type="number"
            min={0}
            step={0.5}
            className="field-input"
            value={input.supraLegalSeveranceMonths}
            onChange={(e) => onChange({ supraLegalSeveranceMonths: toNumber(e.target.value) })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="newJobContractType" text="Type de nouveau contrat" tooltip={inputExplanations.newJobContractType} />
          <select
            id="newJobContractType"
            className="field-input"
            value={input.newJobContractType}
            onChange={(e) => handleContractTypeChange(e.target.value as ContractType)}
          >
            {CONTRACT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel
            htmlFor="newJobContractDurationMonths"
            text="Durée du nouveau contrat (mois)"
            tooltip={inputExplanations.newJobContractDurationMonths}
          />
          <input
            id="newJobContractDurationMonths"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.newJobContractDurationMonths ?? ''}
            disabled={isCdi}
            onChange={(e) => onChange({ newJobContractDurationMonths: toNumber(e.target.value) })}
          />
        </div>

        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-mews-grey-900">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={input.sameWorkingTime}
              onChange={(e) => onChange({ sameWorkingTime: e.target.checked })}
            />
            Même quotité de travail que l’ancien emploi
            <InfoTooltip text={inputExplanations.sameWorkingTime} label="À propos de : même quotité de travail" />
          </label>
        </div>

        <div>
          <FieldLabel
            htmlFor="previousEmployerAffiliationMonths"
            text="Mois travaillés chez d’anciens employeurs"
            tooltip={inputExplanations.previousEmployerAffiliationMonthsInput}
          />
          <input
            id="previousEmployerAffiliationMonths"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.previousEmployerAffiliationMonths}
            onChange={(e) => onChange({ previousEmployerAffiliationMonths: toNumber(e.target.value) })}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="existingARERemainingDays"
            text="Droits ARE restants déjà ouverts (jours)"
            tooltip={inputExplanations.existingARERemainingDaysInput}
          />
          <input
            id="existingARERemainingDays"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.existingARERemainingDays}
            onChange={(e) => onChange({ existingARERemainingDays: toNumber(e.target.value) })}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-mews-grey-500">
            À utiliser si France Travail vous a déjà notifié un reliquat de droits.
          </p>
        </div>

        <div>
          <FieldLabel
            htmlFor="officialAREEntitlementDaysOverride"
            text="Durée ARE officielle notifiée (jours)"
            tooltip={inputExplanations.officialAREEntitlementDaysOverrideInput}
          />
          <input
            id="officialAREEntitlementDaysOverride"
            type="number"
            min={0}
            step={1}
            className="field-input"
            value={input.officialAREEntitlementDaysOverride ?? ''}
            placeholder="Non renseignée"
            onChange={(e) => {
              const raw = e.target.value;
              onChange({ officialAREEntitlementDaysOverride: raw === '' ? null : toNumber(raw) });
            }}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-mews-grey-500">
            Si vous connaissez votre durée officielle de droits, elle remplace l’estimation du simulateur.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="simulationHorizonMode" text="Mode de durée d’affichage" tooltip={inputExplanations.simulationHorizonMode} />
          <select
            id="simulationHorizonMode"
            className="field-input"
            value={input.simulationHorizonMode}
            onChange={(e) => onChange({ simulationHorizonMode: e.target.value as SimulationHorizonMode })}
          >
            <option value="auto">Automatique</option>
            <option value="manual">Manuel</option>
          </select>
        </div>

        <div>
          <FieldLabel
            htmlFor="simulationHorizonMonths"
            text="Durée d’affichage de la simulation (mois)"
            tooltip={inputExplanations.simulationHorizonMonthsInput}
          />
          <input
            id="simulationHorizonMonths"
            type="number"
            min={1}
            max={60}
            step={1}
            className="field-input"
            value={input.simulationHorizonMonths}
            disabled={!isManualHorizon}
            onChange={(e) => onChange({ simulationHorizonMonths: toNumber(e.target.value) })}
          />
        </div>
      </div>
    </AccordionPanel>
  );
}
