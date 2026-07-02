import { formatDayAsMonth, formatEuros } from '../lib/formatters';
import type { DisplayMode, SimulationResult } from '../lib/types';

interface KeyDatesPanelProps {
  result: SimulationResult;
  displayMode: DisplayMode;
}

function cumulativeAtDay(result: SimulationResult, day: number, scenario: 'CSP' | 'ARE + préavis' | 'both', displayMode: DisplayMode) {
  const idx = Math.min(result.dailySeries.length - 1, Math.max(0, Math.round(day)));
  const point = result.dailySeries[idx];
  if (!point) return null;
  const field = displayMode === 'with_new_salary' ? 'withNewSalaryTotal' : 'benefitsOnlyTotal';
  if (scenario === 'CSP') return point.csp[field];
  if (scenario === 'ARE + préavis') return point.classicAre[field];
  return null;
}

export default function KeyDatesPanel({ result, displayMode }: KeyDatesPanelProps) {
  return (
    <section aria-labelledby="key-dates-title">
      <h2 id="key-dates-title" className="mb-4 text-lg font-semibold text-mews-grey-900">
        Dates clés
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-mews-grey-100 text-left text-xs uppercase tracking-wide text-mews-grey-500">
              <th className="py-2 pr-3">Événement</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Scénario</th>
              <th className="py-2 pr-3">Cumul à cette date</th>
              <th className="py-2">Explication</th>
            </tr>
          </thead>
          <tbody>
            {result.keyDates.map((entry) => {
              const cumulative = entry.day !== null ? cumulativeAtDay(result, entry.day, entry.scenario, displayMode) : null;
              return (
                <tr key={entry.id} className="border-b border-mews-grey-100 last:border-0 align-top">
                  <td className="py-2 pr-3 font-medium text-mews-grey-900">{entry.label}</td>
                  <td className="py-2 pr-3 text-mews-grey-500">{entry.day !== null ? formatDayAsMonth(entry.day) : '—'}</td>
                  <td className="py-2 pr-3 text-mews-grey-500">{entry.scenario === 'both' ? 'CSP & ARE' : entry.scenario}</td>
                  <td className="py-2 pr-3 text-mews-grey-900">{cumulative !== null ? formatEuros(cumulative) : '—'}</td>
                  <td className="py-2 text-mews-grey-500">{entry.explanation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
