import InfoTooltip from './InfoTooltip';
import type { SimulationResult } from '../lib/types';

interface EventTimelineProps {
  result: SimulationResult;
}

function scenarioBadgeClasses(scenario: string): string {
  if (scenario === 'CSP') return 'bg-csp-light text-csp';
  if (scenario === 'ARE + préavis') return 'bg-are-light text-are';
  return 'bg-mews-grey-100 text-mews-grey-500';
}

export default function EventTimeline({ result }: EventTimelineProps) {
  return (
    <section className="card" aria-labelledby="event-timeline-title">
      <h2 id="event-timeline-title" className="mb-3 text-lg font-semibold text-mews-grey-900">
        Chronologie des événements
      </h2>
      <ol className="space-y-2">
        {result.events.map((event) => (
          <li key={event.id} className="flex items-center gap-3 border-b border-mews-grey-100 py-1.5 text-sm last:border-0">
            <span className="w-16 shrink-0 text-mews-grey-500">M{Math.round(event.month * 10) / 10}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${scenarioBadgeClasses(event.scenario)}`}>
              {event.scenario === 'both' ? 'CSP & ARE' : event.scenario}
            </span>
            <span className="flex-1 font-medium text-mews-grey-900">{event.label}</span>
            <InfoTooltip text={event.explanation} label={`À propos de : ${event.label}`} />
          </li>
        ))}
      </ol>
    </section>
  );
}
