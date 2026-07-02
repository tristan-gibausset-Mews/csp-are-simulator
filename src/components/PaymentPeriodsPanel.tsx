import { formatDayAsMonth } from '../lib/formatters';
import type { PaymentPeriod, ScenarioLabel, SimulationResult } from '../lib/types';

interface PaymentPeriodsPanelProps {
  result: SimulationResult;
}

const STATUS_LABEL: Record<PaymentPeriod['status'], string> = {
  paid: 'Versée',
  stopped: 'Arrêtée',
  not_started: 'Non démarrée',
  not_applicable: 'Non applicable',
};

const STATUS_CLASSES: Record<PaymentPeriod['status'], string> = {
  paid: 'bg-are-light text-are',
  stopped: 'bg-warn-light text-warn',
  not_started: 'bg-mews-grey-100 text-mews-grey-500',
  not_applicable: 'bg-mews-grey-100 text-mews-grey-500',
};

function formatRange(period: PaymentPeriod): string {
  if (period.startDay === null && period.endDay === null) return '—';
  if (period.startDay !== null && period.endDay !== null && Math.round(period.startDay) === Math.round(period.endDay)) {
    return formatDayAsMonth(period.startDay);
  }
  const start = period.startDay !== null ? formatDayAsMonth(period.startDay) : '—';
  const end = period.endDay !== null ? formatDayAsMonth(period.endDay) : '—';
  return `${start} → ${end}`;
}

function Column({ scenario, periods }: { scenario: ScenarioLabel; periods: PaymentPeriod[] }) {
  const colorClass = scenario === 'CSP' ? 'text-csp' : 'text-are';
  return (
    <div>
      <h3 className={`mb-2 border-b-2 pb-2 text-sm font-semibold ${colorClass} ${scenario === 'CSP' ? 'border-csp/40' : 'border-are/40'}`}>
        {scenario}
      </h3>
      <ul className="space-y-2">
        {periods.map((period) => (
          <li key={period.label} className="rounded-lg border border-mews-grey-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-mews-grey-900">{period.label}</span>
              <span className={`badge ${STATUS_CLASSES[period.status]}`}>{STATUS_LABEL[period.status]}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-mews-grey-500">
              {formatRange(period)} — {period.explanation}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PaymentPeriodsPanel({ result }: PaymentPeriodsPanelProps) {
  const cspPeriods = result.paymentPeriods.filter((p) => p.scenario === 'CSP');
  const arePeriods = result.paymentPeriods.filter((p) => p.scenario === 'ARE + préavis');

  return (
    <section aria-labelledby="payment-periods-title">
      <h2 id="payment-periods-title" className="section-title mb-4">
        Périodes de versement
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Column scenario="CSP" periods={cspPeriods} />
        <Column scenario="ARE + préavis" periods={arePeriods} />
      </div>
    </section>
  );
}
