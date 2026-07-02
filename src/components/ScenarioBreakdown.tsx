import { useState } from 'react';
import { formatDayOrDash, formatEuros, formatEurosPrecise } from '../lib/formatters';
import type { SimulationResult } from '../lib/types';

interface ScenarioBreakdownProps {
  result: SimulationResult;
}

interface Row {
  label: string;
  value: string;
  hint?: string;
}

function RowItem({ label, value, hint }: Row) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-mews-grey-100 py-2 last:border-0">
      <span className="text-sm text-mews-grey-500">{label}</span>
      <span className="text-right text-sm font-medium tabular-nums text-mews-grey-900">
        {value}
        {hint && <span className="ml-1 block text-xs font-normal text-mews-grey-500">{hint}</span>}
      </span>
    </div>
  );
}

export default function ScenarioBreakdown({ result }: ScenarioBreakdownProps) {
  const [mobileTab, setMobileTab] = useState<'CSP' | 'ARE'>('CSP');
  const lastPoint = result.dailySeries[result.dailySeries.length - 1];

  const areRestanteRate = result.areDailyAfterDegressivityAfterCsp ?? result.baseAreDaily;
  const areRestanteTotal = result.cspAreAfterCspApplicable
    ? ((result.cspAreAfterCspExhaustionDay ?? 0) - (result.cspAreAfterCspStartDay ?? 0)) * areRestanteRate
    : 0;

  const cspExhaustionDay = result.cspAspStoppedByNewJob
    ? result.cspAspEndDay
    : result.cspAreAfterCspApplicable
      ? result.cspAreAfterCspExhaustionDay
      : result.cspAspEndDay;

  const cspRows: Row[] = [
    { label: 'Congés payés versés', value: formatEuros(result.paidLeaveAmount) },
    { label: 'Indemnité supra-légale versée', value: formatEuros(result.supraLegalSeveranceAmount) },
    {
      label: 'Préavis non versé / versé à France Travail',
      value: formatEuros(result.noticePaidToFranceTravail),
      hint: result.cspNoticePaidToEmployee > 0 ? `Excédent versé au salarié : ${formatEuros(result.cspNoticePaidToEmployee)}` : undefined,
    },
    { label: 'ASP journalière', value: formatEurosPrecise(result.aspDaily) },
    { label: 'ASP mensuelle moyenne', value: formatEuros(result.aspDaily * (365 / 12)) },
    {
      label: 'Durée ASP',
      value: `${Math.round(result.cspAspEndDay)} jours`,
      hint: result.cspAspStoppedByNewJob ? 'Arrêtée par la reprise d’emploi' : 'Sur les 12 mois du CSP',
    },
    {
      label: 'ARE restante après CSP',
      value: result.cspAreAfterCspApplicable ? formatEuros(areRestanteTotal) : 'Non applicable',
      hint: !result.cspAreAfterCspApplicable ? 'Reprise avant la fin du CSP' : undefined,
    },
    {
      label: 'Prime de reclassement CSP',
      value: result.reclassementPrime.eligible ? formatEuros(result.reclassementPrime.primeTotal) : 'Non applicable',
      hint: result.reclassementPrime.eligible ? (result.chosenAid === 'RECLASSEMENT_PRIME' ? 'Aide retenue' : 'Aide non retenue') : undefined,
    },
    {
      label: 'IDR',
      value: result.idr.eligible ? formatEuros(result.idr.idrTotal) : 'Non applicable',
      hint: result.idr.eligible ? (result.chosenAid === 'IDR' ? 'Aide retenue' : 'Aide non retenue') : undefined,
    },
    { label: 'Date d’épuisement des droits', value: formatDayOrDash(cspExhaustionDay) },
    { label: 'Total lié à la rupture et au chômage', value: formatEuros(lastPoint?.csp.benefitsOnlyTotal ?? 0) },
    { label: 'Total avec nouveau salaire', value: formatEuros(lastPoint?.csp.withNewSalaryTotal ?? 0) },
  ];

  const areRows: Row[] = [
    { label: 'Préavis versé au salarié', value: formatEuros(result.areNoticePaidToEmployee) },
    { label: 'Congés payés versés', value: formatEuros(result.paidLeaveAmount) },
    { label: 'Indemnité supra-légale versée', value: formatEuros(result.supraLegalSeveranceAmount) },
    { label: 'Différé congés payés', value: `${Math.round(result.paidLeaveDeferralDays)} jours` },
    { label: 'Différé spécifique', value: `${result.specificDeferralDays} jours` },
    { label: 'Délai d’attente', value: `${result.waitingPeriodDays} jours` },
    {
      label: 'Date de début ARE',
      value: result.classicAreNeverStarted ? 'Non atteinte' : formatDayOrDash(result.classicAreStartDay),
      hint: result.classicAreNeverStarted ? 'Reprise d’emploi avant cette date' : undefined,
    },
    { label: 'ARE journalière avant dégressivité', value: formatEurosPrecise(result.baseAreDaily) },
    {
      label: 'ARE journalière après dégressivité',
      value: result.areDailyAfterDegressivityClassic !== null ? formatEurosPrecise(result.areDailyAfterDegressivityClassic) : 'Non applicable',
    },
    { label: 'Durée ARE (estimée ou renseignée)', value: `${Math.round(result.areEntitlement.totalAREEntitlementDays)} jours` },
    {
      label: 'Date d’épuisement des droits',
      value: result.classicAreNeverStarted ? 'Non applicable' : formatDayOrDash(result.classicAreExhaustionDay),
      hint: result.classicAreStoppedByNewJob ? 'Arrêtée par la reprise d’emploi' : undefined,
    },
    { label: 'Total lié à la rupture et au chômage', value: formatEuros(lastPoint?.classicAre.benefitsOnlyTotal ?? 0) },
    { label: 'Total avec nouveau salaire', value: formatEuros(lastPoint?.classicAre.withNewSalaryTotal ?? 0) },
  ];

  return (
    <section aria-labelledby="scenario-breakdown-title">
      <h2 id="scenario-breakdown-title" className="section-title mb-4">
        Détail par scénario
      </h2>

      <div className="mb-4 inline-flex gap-0.5 rounded-lg bg-mews-grey-100 p-1 text-sm sm:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('CSP')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${mobileTab === 'CSP' ? 'bg-white text-csp shadow-sm' : 'text-mews-grey-500'}`}
        >
          CSP
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('ARE')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${mobileTab === 'ARE' ? 'bg-white text-are shadow-sm' : 'text-mews-grey-500'}`}
        >
          ARE + préavis
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className={mobileTab === 'CSP' ? '' : 'hidden sm:block'}>
          <h3 className="mb-2 border-b-2 border-csp/40 pb-2 text-sm font-semibold text-csp">CSP</h3>
          {cspRows.map((row) => (
            <RowItem key={row.label} {...row} />
          ))}
        </div>
        <div className={mobileTab === 'ARE' ? '' : 'hidden sm:block'}>
          <h3 className="mb-2 border-b-2 border-are/40 pb-2 text-sm font-semibold text-are">ARE + préavis</h3>
          {areRows.map((row) => (
            <RowItem key={row.label} {...row} />
          ))}
        </div>
      </div>
    </section>
  );
}
