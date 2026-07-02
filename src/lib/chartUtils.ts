import type { DailySimulationPoint, DisplayMode } from './types';
import { DAYS_PER_MONTH } from './regulatoryConstants';

export interface ChartPoint {
  month: number;
  csp: number;
  are: number;
}

/**
 * Sous-échantillonne la série journalière pour l'affichage du graphique, en
 * choisissant le total pertinent selon le mode d'affichage actif.
 */
export function toChartData(
  dailySeries: DailySimulationPoint[],
  displayMode: DisplayMode,
  pointsPerMonth = 2,
): ChartPoint[] {
  if (dailySeries.length === 0) return [];
  const field = displayMode === 'with_new_salary' ? 'withNewSalaryTotal' : 'benefitsOnlyTotal';
  const step = Math.max(1, Math.round(DAYS_PER_MONTH / pointsPerMonth));
  const points: ChartPoint[] = [];

  for (let i = 0; i < dailySeries.length; i += step) {
    const point = dailySeries[i];
    if (!point) continue;
    points.push({ month: point.month, csp: point.csp[field], are: point.classicAre[field] });
  }

  const last = dailySeries[dailySeries.length - 1];
  const lastPushed = points[points.length - 1];
  if (last && (!lastPushed || lastPushed.month !== last.month)) {
    points.push({ month: last.month, csp: last.csp[field], are: last.classicAre[field] });
  }

  return points;
}

export function dayToMonth(day: number): number {
  return day / DAYS_PER_MONTH;
}
