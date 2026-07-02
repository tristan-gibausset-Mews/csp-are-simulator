import InfoTooltip from './InfoTooltip';
import { formatDayOrDash, formatEuros, formatEurosPrecise } from '../lib/formatters';
import { inputExplanations, resultExplanations } from '../lib/resultExplanations';
import type { SimulationResult } from '../lib/types';

interface AssumptionsPanelProps {
  result: SimulationResult;
}

function horizonLabel(result: SimulationResult): string {
  const { horizon, input } = result;
  if (horizon.mode === 'manual') return `${horizon.displayedMonths} mois — horizon manuel`;
  if (horizon.cappedByAgeMax) {
    const ageBand = input.age < 55 ? '' : input.age < 57 ? ' (âge 55-56 ans)' : ' (âge 57 ans et plus)';
    return `${horizon.displayedMonths} mois — horizon automatique ajusté${ageBand}`;
  }
  return `${horizon.displayedMonths} mois — horizon automatique recommandé`;
}

interface Row {
  label: string;
  value: string;
  tooltip?: string;
}

function RowItem({ label, value, tooltip }: Row) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-mews-grey-100 py-1.5 last:border-0">
      <span className="flex items-center gap-1.5 text-sm text-mews-grey-500">
        {label}
        {tooltip && <InfoTooltip text={tooltip} label={`À propos de : ${label}`} />}
      </span>
      <span className="text-right text-sm font-medium text-mews-grey-900">{value}</span>
    </div>
  );
}

export default function AssumptionsPanel({ result }: AssumptionsPanelProps) {
  const { input, areEntitlement } = result;
  const degressivityApplicable = result.areDegressiveApplicableClassic || result.areDegressiveApplicableAfterCsp;

  const rows: Row[] = [
    { label: 'SJR estimé', value: formatEurosPrecise(result.sjr), tooltip: resultExplanations.estimatedSjr },
    { label: 'Salaire annuel de référence estimé', value: formatEuros(result.annualReferenceSalary), tooltip: resultExplanations.annualReferenceSalary },
    {
      label: 'Durée de droits ARE estimée',
      value: `${Math.round(areEntitlement.totalAREEntitlementDays)} jours`,
      tooltip: resultExplanations.areEntitlementDays,
    },
    { label: 'Durée maximale selon l’âge', value: `${areEntitlement.maxEntitlementDaysByAge} jours` },
    {
      label: 'Durée d’affiliation utilisée',
      value: areEntitlement.usedOfficialOverride ? 'Non utilisée (durée officielle renseignée)' : `${Math.round(areEntitlement.cappedAffiliationMonths)} mois`,
    },
    {
      label: 'Ancienneté utilisée pour le CSP',
      value: input.seniorityAtLeastOneYear ? '≥ 1 an' : '< 1 an',
      tooltip: inputExplanations.seniorityAtLeastOneYear,
    },
    { label: 'Préavis utilisé', value: `${input.noticePeriodMonths} mois` },
    { label: 'Congés payés utilisés', value: `${input.remainingPaidLeaveDays} jours` },
    { label: 'Indemnité supra-légale utilisée', value: `${input.supraLegalSeveranceMonths} mois de salaire` },
    {
      label: 'Date de reprise d’emploi',
      value: result.hasNewJob ? formatDayOrDash(result.newJobStartDay) : 'Pas de reprise d’emploi prévue',
    },
    { label: 'Type de nouveau contrat', value: result.hasNewJob ? input.newJobContractType : 'Non applicable' },
    {
      label: 'Éligibilité prime de reclassement',
      value: result.reclassementPrime.eligible ? 'Oui' : 'Non',
      tooltip: resultExplanations.cspReclassementPrime,
    },
    {
      label: 'Dégressivité applicable',
      value: degressivityApplicable ? 'Oui' : 'Non',
      tooltip: resultExplanations.degressivityThreshold,
    },
    { label: 'Durée affichée', value: horizonLabel(result), tooltip: resultExplanations.simulationHorizon },
  ];

  return (
    <section aria-labelledby="assumptions-panel-title">
      <h2 id="assumptions-panel-title" className="mb-3 text-lg font-semibold text-mews-grey-900">
        Hypothèses de calcul
      </h2>
      {rows.map((row) => (
        <RowItem key={row.label} {...row} />
      ))}
    </section>
  );
}
