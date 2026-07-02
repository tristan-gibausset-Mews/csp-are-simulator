import InfoTooltip from './InfoTooltip';
import { dayToMonth } from '../lib/chartUtils';
import { formatEuros, formatEurosPrecise } from '../lib/formatters';
import { resultExplanations } from '../lib/resultExplanations';
import type { ResultExplanationKey } from '../lib/resultExplanations';
import type { SimulationResult } from '../lib/types';

interface ResultsCardsProps {
  result: SimulationResult;
}

interface CardItem {
  label: string;
  value: string;
  hint?: string;
  tooltipKey: ResultExplanationKey;
}

function Card({ label, value, hint, tooltipKey }: CardItem) {
  return (
    <div className="card-flat flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-mews-grey-500">{label}</span>
        <InfoTooltip text={resultExplanations[tooltipKey]} label={`À propos de : ${label}`} />
      </div>
      <span className="text-lg font-semibold tabular-nums text-mews-grey-900">{value}</span>
      {hint && <span className="text-xs leading-relaxed text-mews-grey-500">{hint}</span>}
    </div>
  );
}

function winnerAtLabel(result: SimulationResult, label: string): string {
  const point = result.decisionPoints.find((p) => p.label === label);
  return point ? point.winner : 'Non disponible';
}

export default function ResultsCards({ result }: ResultsCardsProps) {
  const items: CardItem[] = [
    { label: 'SJR estimé', value: formatEurosPrecise(result.sjr), tooltipKey: 'estimatedSjr' },
    { label: 'ASP journalière', value: formatEurosPrecise(result.aspDaily), tooltipKey: 'aspDaily' },
    { label: 'ASP mensuelle moyenne', value: formatEuros(result.aspDaily * (365 / 12)), tooltipKey: 'aspMonthly' },
    { label: 'ARE journalière (avant dégressivité)', value: formatEurosPrecise(result.baseAreDaily), tooltipKey: 'areDailyBeforeDegressivity' },
    {
      label: 'ARE journalière (après dégressivité)',
      value: result.areDailyAfterDegressivityClassic !== null ? formatEurosPrecise(result.areDailyAfterDegressivityClassic) : 'Non applicable',
      tooltipKey: 'areDailyAfterDegressivity',
    },
    {
      label: 'Durée des droits ARE estimée',
      value: `${Math.round(result.areEntitlement.totalAREEntitlementDays)} jours`,
      hint: result.areEntitlement.usedOfficialOverride ? 'Durée officielle utilisée' : 'Estimation à partir de l’affiliation',
      tooltipKey: 'areEntitlementDays',
    },
    { label: 'Préavis versé au salarié (scénario ARE)', value: formatEuros(result.areNoticePaidToEmployee), tooltipKey: 'noticePaidToEmployeeAre' },
    {
      label: 'Préavis non versé / versé à France Travail (CSP)',
      value: formatEuros(result.noticePaidToFranceTravail),
      hint: result.cspNoticePaidToEmployee > 0 ? `Excédent versé au salarié : ${formatEuros(result.cspNoticePaidToEmployee)}` : undefined,
      tooltipKey: 'noticeNotPaidToEmployeeCsp',
    },
    { label: 'Congés payés', value: formatEuros(result.paidLeaveAmount), tooltipKey: 'paidLeaveAmount' },
    { label: 'Indemnité supra-légale', value: formatEuros(result.supraLegalSeveranceAmount), tooltipKey: 'supraLegalSeveranceAmount' },
    { label: 'Différé congés payés', value: `${Math.round(result.paidLeaveDeferralDays)} jours`, tooltipKey: 'paidLeaveDeferralDays' },
    { label: 'Différé spécifique', value: `${result.specificDeferralDays} jours`, tooltipKey: 'specificDeferralDays' },
    { label: 'Délai d’attente', value: `${result.waitingPeriodDays} jours`, tooltipKey: 'waitingPeriodDays' },
    {
      label: 'Début ARE classique estimé',
      value: result.classicAreNeverStarted ? 'Jamais (reprise anticipée)' : `M${Math.round(dayToMonth(result.classicAreStartDay) * 10) / 10}`,
      tooltipKey: 'classicAreStartDate',
    },
    {
      label: 'Prime de reclassement CSP',
      value: result.reclassementPrime.eligible ? formatEuros(result.reclassementPrime.primeTotal) : 'Non applicable',
      hint: result.reclassementPrime.eligible ? (result.chosenAid === 'RECLASSEMENT_PRIME' ? 'Aide retenue' : 'Aide non retenue') : undefined,
      tooltipKey: 'cspReclassementPrime',
    },
    {
      label: 'IDR',
      value: result.idr.eligible ? formatEuros(result.idr.idrTotal) : 'Non applicable',
      hint: result.idr.eligible ? (result.chosenAid === 'IDR' ? 'Aide retenue' : 'Aide non retenue') : undefined,
      tooltipKey: 'idr',
    },
    { label: 'Option la plus favorable à M6', value: winnerAtLabel(result, 'M6'), tooltipKey: 'winningOptionM6' },
    { label: 'Option la plus favorable à M9', value: winnerAtLabel(result, 'M9'), tooltipKey: 'winningOptionM9' },
    { label: 'Option la plus favorable à M15', value: winnerAtLabel(result, 'M15'), tooltipKey: 'winningOptionM15' },
    { label: 'Option la plus favorable à M20', value: winnerAtLabel(result, 'M20'), tooltipKey: 'winningOptionM20' },
    {
      label: 'Option la plus favorable au dernier mois utile',
      value: winnerAtLabel(result, 'Dernier mois utile'),
      tooltipKey: 'winningOptionAtRightsExhaustion',
    },
  ];

  return (
    <section aria-labelledby="results-cards-title">
      <h2 id="results-cards-title" className="section-title mb-4">
        Résultats détaillés
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
