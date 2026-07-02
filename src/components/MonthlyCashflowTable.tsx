import { Fragment, useState } from 'react';
import { formatEuros, formatSignedEuros } from '../lib/formatters';
import type { DisplayMode, MonthlyCashflow, SimulationResult, WinningScenario } from '../lib/types';

interface MonthlyCashflowTableProps {
  result: SimulationResult;
}

function localWinner(csp: number, are: number): WinningScenario {
  if (Math.abs(csp - are) < 0.01) return 'Égalité';
  return csp > are ? 'CSP' : 'ARE + préavis';
}

function badgesForMonth(result: SimulationResult, monthIndex: number): string[] {
  const badges: string[] = [];
  for (const event of result.events) {
    if (Math.floor(event.month) !== monthIndex) continue;
    if (event.type === 'new_job') badges.push('Reprise d’emploi');
    else if (event.type === 'asp_stop' && event.label === 'Arrêt ASP') badges.push('ASP arrêtée');
    else if (event.type === 'are_stop' && event.label === 'Arrêt ARE') badges.push('ARE arrêtée');
    else if (event.id === 'classic_are_never_started') badges.push('ARE non démarrée');
  }
  return badges;
}

export default function MonthlyCashflowTable({ result }: MonthlyCashflowTableProps) {
  const [tab, setTab] = useState<DisplayMode>('benefits_only');
  const [showDetail, setShowDetail] = useState(false);

  const rows: (MonthlyCashflow & { badges: string[]; cspTotal: number; areTotal: number; cspCumulative: number; areCumulative: number; winner: WinningScenario })[] =
    result.monthlySeries.map((month) => {
      const cspTotal = tab === 'with_new_salary' ? month.csp.withNewSalaryMonthlyTotal : month.csp.benefitsOnlyMonthlyTotal;
      const areTotal = tab === 'with_new_salary' ? month.classicAre.withNewSalaryMonthlyTotal : month.classicAre.benefitsOnlyMonthlyTotal;
      const cspCumulative = tab === 'with_new_salary' ? month.csp.withNewSalaryCumulativeTotal : month.csp.benefitsOnlyCumulativeTotal;
      const areCumulative = tab === 'with_new_salary' ? month.classicAre.withNewSalaryCumulativeTotal : month.classicAre.benefitsOnlyCumulativeTotal;
      return {
        ...month,
        badges: badgesForMonth(result, month.monthIndex),
        cspTotal,
        areTotal,
        cspCumulative,
        areCumulative,
        winner: localWinner(cspCumulative, areCumulative),
      };
    });

  return (
    <section className="card" aria-labelledby="monthly-cashflow-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="monthly-cashflow-title" className="text-lg font-semibold text-mews-grey-900">
          Montants touchés chaque mois
        </h2>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-mews-grey-300 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab('benefits_only')}
              className={`rounded-md px-2.5 py-1 font-medium ${tab === 'benefits_only' ? 'bg-mews-accent text-white' : 'text-mews-grey-500'}`}
            >
              Indemnités uniquement
            </button>
            <button
              type="button"
              onClick={() => setTab('with_new_salary')}
              className={`rounded-md px-2.5 py-1 font-medium ${tab === 'with_new_salary' ? 'bg-mews-accent text-white' : 'text-mews-grey-500'}`}
            >
              Avec nouveau salaire
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="rounded-lg border border-mews-grey-300 px-2.5 py-1 text-xs font-medium text-mews-grey-900 hover:border-mews-accent hover:text-mews-accent"
          >
            {showDetail ? 'Masquer le détail par composant' : 'Afficher le détail par composant'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-mews-grey-100 text-left text-xs uppercase tracking-wide text-mews-grey-500">
              <th className="py-2 pr-3">Mois</th>
              <th className="py-2 pr-3">CSP ce mois</th>
              <th className="py-2 pr-3">ARE + préavis ce mois</th>
              <th className="py-2 pr-3">Écart du mois</th>
              <th className="py-2 pr-3">Cumul CSP</th>
              <th className="py-2 pr-3">Cumul ARE + préavis</th>
              <th className="py-2 pr-3">Écart cumulé</th>
              <th className="py-2">Option gagnante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.monthLabel}>
                <tr className="border-b border-mews-grey-100 align-top">
                  <td className="py-2 pr-3 font-medium text-mews-grey-900">
                    {row.monthLabel}
                    {row.badges.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.badges.map((badge) => (
                          <span key={badge} className="rounded-full bg-mews-accent-light px-1.5 py-0.5 text-[10px] font-medium text-mews-accent">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-csp">{formatEuros(row.cspTotal)}</td>
                  <td className="py-2 pr-3 text-are">{formatEuros(row.areTotal)}</td>
                  <td className="py-2 pr-3">{formatSignedEuros(row.cspTotal - row.areTotal)}</td>
                  <td className="py-2 pr-3 text-csp">{formatEuros(row.cspCumulative)}</td>
                  <td className="py-2 pr-3 text-are">{formatEuros(row.areCumulative)}</td>
                  <td className="py-2 pr-3">{formatSignedEuros(row.cspCumulative - row.areCumulative)}</td>
                  <td className="py-2 font-medium">{row.winner}</td>
                </tr>
                {showDetail && (
                  <tr className="border-b border-mews-grey-100 bg-mews-grey-100/40 text-xs">
                    <td className="py-2 pr-3 text-mews-grey-500">Détail</td>
                    <td className="py-2 pr-3">
                      <ul className="space-y-0.5 text-mews-grey-900">
                        <li>Congés payés : {formatEuros(row.csp.paidLeave)}</li>
                        <li>Supra-légale : {formatEuros(row.csp.supraLegalSeverance)}</li>
                        <li>ASP : {formatEuros(row.csp.asp)}</li>
                        <li>ARE après CSP : {formatEuros(row.csp.are)}</li>
                        <li>Prime reclassement : {formatEuros(row.csp.reclassementPrime)}</li>
                        <li>IDR : {formatEuros(row.csp.idr)}</li>
                        {tab === 'with_new_salary' && <li>Nouveau salaire : {formatEuros(row.csp.newSalary)}</li>}
                      </ul>
                    </td>
                    <td className="py-2 pr-3" colSpan={2}>
                      <ul className="space-y-0.5 text-mews-grey-900">
                        <li>Préavis : {formatEuros(row.classicAre.notice)}</li>
                        <li>Congés payés : {formatEuros(row.classicAre.paidLeave)}</li>
                        <li>Supra-légale : {formatEuros(row.classicAre.supraLegalSeverance)}</li>
                        <li>ARE : {formatEuros(row.classicAre.are)}</li>
                        {tab === 'with_new_salary' && <li>Nouveau salaire : {formatEuros(row.classicAre.newSalary)}</li>}
                      </ul>
                    </td>
                    <td colSpan={4} />
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
