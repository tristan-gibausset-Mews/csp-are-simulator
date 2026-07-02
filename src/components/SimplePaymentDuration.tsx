import { DAYS_PER_MONTH } from '../lib/regulatoryConstants';
import { simplifyPaymentStatus } from '../lib/formatters';
import type { PaymentPeriod, SimulationResult } from '../lib/types';

interface SimplePaymentDurationProps {
  result: SimulationResult;
}

const LABEL_OVERRIDES: Record<string, string> = {
  ASP: 'Allocation CSP',
  'Prime de reclassement': 'Prime CSP',
};

function toMonth(day: number | null): number | null {
  return day === null ? null : Math.round(day / DAYS_PER_MONTH);
}

/** Phrase en langage courant décrivant une période de versement donnée. */
function describePeriod(period: PaymentPeriod, result: SimulationResult): string {
  const startMonth = toMonth(period.startDay);
  const endMonth = toMonth(period.endDay);

  switch (period.label) {
    case 'ASP':
      return period.status === 'stopped'
        ? `Versée jusqu’au mois ${endMonth}, puis arrêtée à la reprise d’emploi.`
        : 'Versée pendant 12 mois, sauf reprise d’emploi anticipée.';

    case 'Prime de reclassement':
      if (period.status !== 'paid') return 'Non versée dans ce scénario.';
      return result.reclassementPrime.secondPaymentPaid
        ? `Versée au mois ${startMonth} puis au mois ${endMonth} si le contrat reste éligible.`
        : `Versée au mois ${startMonth}.`;

    case 'ARE après CSP':
      if (period.status === 'not_started') return 'Non versée, car vous reprenez un emploi avant la fin du CSP.';
      if (period.status === 'not_applicable') return 'Non applicable dans ce scénario.';
      return period.status === 'stopped'
        ? `Versée à partir du mois ${startMonth}, jusqu’à la reprise d’emploi.`
        : `Versée à partir du mois ${startMonth}, jusqu’à la fin de vos droits.`;

    case 'Préavis':
      return `Versé pendant ${result.input.noticePeriodMonths} mois.`;

    case 'Congés payés et indemnité supra-légale':
      return 'Versés à la fin du préavis.';

    case 'ARE classique':
      if (period.status === 'not_started') return 'Non versée, car vous reprenez un emploi avant son démarrage.';
      return period.status === 'stopped'
        ? `Versée à partir du mois ${startMonth}, jusqu’à la reprise d’emploi.`
        : `Versée à partir du mois ${startMonth}, jusqu’à la fin de vos droits.`;

    default:
      return simplifyPaymentStatus(period.status);
  }
}

function statusBadgeClasses(status: PaymentPeriod['status']): string {
  if (status === 'paid') return 'bg-are-light text-are';
  if (status === 'stopped') return 'bg-warn-light text-warn';
  return 'bg-mews-grey-100 text-mews-grey-500';
}

function Block({
  title,
  accentClass,
  periods,
  result,
}: {
  title: string;
  accentClass: string;
  periods: PaymentPeriod[];
  result: SimulationResult;
}) {
  return (
    <div>
      <h3 className={`mb-3 border-b-2 pb-2 text-sm font-semibold text-mews-grey-900 ${accentClass}`}>{title}</h3>
      <ul className="space-y-2.5">
        {periods.map((period) => (
          <li key={period.label} className="rounded-lg border border-mews-grey-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-mews-grey-900">{LABEL_OVERRIDES[period.label] ?? period.label}</p>
              <span className={`badge shrink-0 ${statusBadgeClasses(period.status)}`}>{simplifyPaymentStatus(period.status)}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-mews-grey-500">{describePeriod(period, result)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SimplePaymentDuration({ result }: SimplePaymentDurationProps) {
  const cspPeriods = result.paymentPeriods.filter((p) => p.scenario === 'CSP');
  const arePeriods = result.paymentPeriods.filter((p) => p.scenario === 'ARE + préavis');

  return (
    <section className="card" aria-labelledby="simple-duration-title">
      <h2 id="simple-duration-title" className="section-title mb-4">
        Pendant combien de temps ?
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Block title="CSP" accentClass="border-csp/40" periods={cspPeriods} result={result} />
        <Block title="Préavis + ARE" accentClass="border-are/40" periods={arePeriods} result={result} />
      </div>
    </section>
  );
}
