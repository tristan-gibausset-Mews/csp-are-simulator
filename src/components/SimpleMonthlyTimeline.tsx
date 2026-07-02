import { Fragment, useState } from 'react';
import { formatEuros, formatSimpleMonth } from '../lib/formatters';
import type { DisplayMode, MonthlyCashflow, SimulationResult } from '../lib/types';

interface SimpleMonthlyTimelineProps {
  result: SimulationResult;
  displayMode: DisplayMode;
}

const DEFAULT_VISIBLE_MONTHS = 8;

function monthBadges(month: MonthlyCashflow, result: SimulationResult): string[] {
  const badges = new Set<string>();

  if (month.classicAre.notice > 0.5) badges.add('Préavis');
  if (month.csp.paidLeave > 0.5 || month.classicAre.paidLeave > 0.5) badges.add('Congés payés');
  if (month.csp.supraLegalSeverance > 0.5 || month.classicAre.supraLegalSeverance > 0.5) badges.add('Indemnité supra-légale');
  if (month.csp.asp > 0.5) badges.add('Allocation CSP');
  if (month.classicAre.are > 0.5 || month.csp.are > 0.5) badges.add('Chômage ARE');
  if (month.csp.reclassementPrime > 0.5) badges.add('Prime CSP');

  for (const event of result.events) {
    if (Math.floor(event.month) !== month.monthIndex) continue;
    if (event.type === 'new_job') badges.add('Reprise d’emploi');
    if (event.type === 'asp_stop' && event.label === 'Arrêt ASP') badges.add('Allocation arrêtée');
    if (event.type === 'are_stop' && event.label === 'Arrêt ARE') badges.add('Allocation arrêtée');
  }

  if (badges.size === 0) badges.add('Rien versé');
  return Array.from(badges);
}

function badgeColorClasses(label: string): string {
  switch (label) {
    case 'Préavis':
    case 'Chômage ARE':
      return 'bg-are-light text-are';
    case 'Allocation CSP':
    case 'Prime CSP':
      return 'bg-csp-light text-csp';
    case 'Congés payés':
    case 'Indemnité supra-légale':
      return 'bg-info-light text-info';
    case 'Reprise d’emploi':
      return 'bg-mews-accent-light text-mews-accent';
    case 'Allocation arrêtée':
      return 'bg-warn-light text-warn';
    default:
      return 'bg-mews-grey-100 text-mews-grey-500';
  }
}

function DiffPill({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.5) {
    return <span className="badge bg-mews-grey-100 text-mews-grey-500">Égalité</span>;
  }
  const forCsp = diff > 0;
  return (
    <span className={`badge ${forCsp ? 'bg-csp-light text-csp' : 'bg-are-light text-are'}`}>
      +{formatEuros(Math.abs(diff))} {forCsp ? 'CSP' : 'préavis + ARE'}
    </span>
  );
}

export default function SimpleMonthlyTimeline({ result, displayMode }: SimpleMonthlyTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const months = result.monthlySeries;
  const visibleCount = showAll ? months.length : Math.min(DEFAULT_VISIBLE_MONTHS, months.length);
  const visibleMonths = months.slice(0, visibleCount);

  const cspField = displayMode === 'with_new_salary' ? 'withNewSalaryMonthlyTotal' : 'benefitsOnlyMonthlyTotal';

  return (
    <section className="card" aria-labelledby="simple-monthly-title">
      <h2 id="simple-monthly-title" className="section-title">
        Ce que vous touchez chaque mois
      </h2>
      <p className="section-subtitle">Hors salaire du nouvel emploi, sauf si vous activez l’option.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-mews-grey-100 text-left text-[11px] font-semibold uppercase tracking-wide text-mews-grey-500">
              <th className="py-2.5 pr-3">Mois</th>
              <th className="py-2.5 pr-3 text-right">CSP</th>
              <th className="py-2.5 pr-3 text-right">Préavis + ARE</th>
              <th className="py-2.5 pr-3">Différence</th>
              <th className="py-2.5">Ce qui se passe</th>
            </tr>
          </thead>
          <tbody>
            {visibleMonths.map((month, index) => {
              const cspAmount = month.csp[cspField];
              const areAmount = month.classicAre[cspField];
              return (
                <Fragment key={month.monthIndex}>
                  <tr className={`border-b border-mews-grey-100 align-top ${index % 2 === 1 ? 'bg-mews-grey-100/30' : ''}`}>
                    <td className="py-2.5 pr-3 font-medium text-mews-grey-900">{formatSimpleMonth(month.monthIndex + 1)}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-csp">{formatEuros(cspAmount)}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-are">{formatEuros(areAmount)}</td>
                    <td className="py-2.5 pr-3">
                      <DiffPill diff={cspAmount - areAmount} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {monthBadges(month, result).map((badge) => (
                          <span key={badge} className={`badge ${badgeColorClasses(badge)}`}>
                            {badge}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {showDetail && (
                    <tr className="border-b border-mews-grey-100 bg-mews-grey-100/40 text-xs">
                      <td className="py-2.5 pr-3 text-mews-grey-500">Détail</td>
                      <td className="py-2.5 pr-3" colSpan={2}>
                        <ul className="space-y-0.5 text-mews-grey-900">
                          <li>Congés payés : {formatEuros(month.csp.paidLeave)}</li>
                          <li>Indemnité supra-légale : {formatEuros(month.csp.supraLegalSeverance)}</li>
                          <li>Allocation CSP : {formatEuros(month.csp.asp)}</li>
                          <li>Chômage après CSP : {formatEuros(month.csp.are)}</li>
                          <li>Prime CSP : {formatEuros(month.csp.reclassementPrime)}</li>
                          <li>IDR : {formatEuros(month.csp.idr)}</li>
                        </ul>
                      </td>
                      <td className="py-2.5 pr-3" colSpan={2}>
                        <ul className="space-y-0.5 text-mews-grey-900">
                          <li>Préavis : {formatEuros(month.classicAre.notice)}</li>
                          <li>Congés payés : {formatEuros(month.classicAre.paidLeave)}</li>
                          <li>Indemnité supra-légale : {formatEuros(month.classicAre.supraLegalSeverance)}</li>
                          <li>Chômage classique (ARE) : {formatEuros(month.classicAre.are)}</li>
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {months.length > DEFAULT_VISIBLE_MONTHS && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="btn-secondary">
            {showAll ? 'Réduire aux 8 premiers mois' : 'Afficher tous les mois'}
          </button>
        )}
        <button type="button" onClick={() => setShowDetail((v) => !v)} className="btn-secondary">
          {showDetail ? 'Masquer le détail par composant' : 'Voir le détail par composant'}
        </button>
      </div>
    </section>
  );
}
