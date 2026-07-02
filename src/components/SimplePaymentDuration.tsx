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
        ? `versée jusqu’au mois ${endMonth}, puis arrêtée à la reprise d’emploi.`
        : 'versée pendant 12 mois, sauf reprise d’emploi anticipée.';

    case 'Prime de reclassement':
      if (period.status !== 'paid') return 'non versée dans ce scénario.';
      return result.reclassementPrime.secondPaymentPaid
        ? `versée au mois ${startMonth} puis au mois ${endMonth} si le contrat reste éligible.`
        : `versée au mois ${startMonth}.`;

    case 'ARE après CSP':
      if (period.status === 'not_started') return 'non versée, car vous reprenez un emploi avant la fin du CSP.';
      if (period.status === 'not_applicable') return 'non applicable dans ce scénario.';
      return period.status === 'stopped'
        ? `versée à partir du mois ${startMonth}, jusqu’à la reprise d’emploi.`
        : `versée à partir du mois ${startMonth}, jusqu’à la fin de vos droits.`;

    case 'Préavis':
      return `versé pendant ${result.input.noticePeriodMonths} mois.`;

    case 'Congés payés et indemnité supra-légale':
      return 'versés à la fin du préavis.';

    case 'ARE classique':
      if (period.status === 'not_started') return 'non versée, car vous reprenez un emploi avant son démarrage.';
      return period.status === 'stopped'
        ? `versée à partir du mois ${startMonth}, jusqu’à la reprise d’emploi.`
        : `versée à partir du mois ${startMonth}, jusqu’à la fin de vos droits.`;

    default:
      return simplifyPaymentStatus(period.status).toLowerCase();
  }
}

function Block({ title, periods, result }: { title: string; periods: PaymentPeriod[]; result: SimulationResult }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-mews-grey-900">{title}</h3>
      <ul className="space-y-1.5">
        {periods.map((period) => (
          <li key={period.label} className="text-sm text-mews-grey-900">
            <span className="font-medium">{LABEL_OVERRIDES[period.label] ?? period.label}</span> :{' '}
            {describePeriod(period, result)}
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
      <h2 id="simple-duration-title" className="mb-4 text-lg font-semibold text-mews-grey-900">
        Pendant combien de temps ?
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Block title="CSP" periods={cspPeriods} result={result} />
        <Block title="Préavis + ARE" periods={arePeriods} result={result} />
      </div>
    </section>
  );
}
