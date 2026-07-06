import InfoTooltip from './InfoTooltip';
import type { SimulationResult } from '../lib/types';

interface EventTimelineProps {
  result: SimulationResult;
}

function scenarioBadgeClasses(scenario: string): string {
  if (scenario === 'CSP') return 'bg-csp/15 text-csp';
  if (scenario === 'ARE + préavis') return 'bg-are/15 text-are';
  return 'bg-mews-grey-100 text-mews-grey-500';
}

export default function EventTimeline({ result }: EventTimelineProps) {
  return (
    <section aria-labelledby="event-timeline-title">
      <h2 id="event-timeline-title" className="section-title mb-3">
        Chronologie des événements
      </h2>
      <ol className="space-y-1.5">
        {result.events.map((event) => (
          <li key={event.id} className="flex items-center gap-3 border-b border-mews-grey-100 py-2 text-sm last:border-0">
            <span className="w-14 shrink-0 tabular-nums text-mews-grey-500">M{Math.round(event.month * 10) / 10}</span>
            <span className={`badge shrink-0 ${scenarioBadgeClasses(event.scenario)}`}>
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
