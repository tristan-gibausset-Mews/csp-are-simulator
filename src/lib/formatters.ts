import { DAYS_PER_MONTH } from './regulatoryConstants';

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const currencyFormatterPrecise = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

/** Formate un montant en euros bruts, arrondi à l'unité (arrondi à l'affichage uniquement). */
export function formatEuros(value: number): string {
  return currencyFormatter.format(value);
}

/** Formate un montant en euros bruts avec 2 décimales (pour les taux journaliers). */
export function formatEurosPrecise(value: number): string {
  return currencyFormatterPrecise.format(value);
}

/** Formate un nombre de jours. */
export function formatDays(value: number): string {
  const rounded = Math.round(value);
  return `${rounded} jour${rounded === 1 ? '' : 's'}`;
}

/** Formate un jour de simulation en équivalent "mois" arrondi (ex. "M7"). */
export function formatDayAsMonth(day: number): string {
  return `M${Math.round(day / DAYS_PER_MONTH)}`;
}

/** Formate un jour de simulation en mois avec une décimale (ex. "11,8"). */
export function formatDayAsMonthPrecise(day: number): string {
  return (day / DAYS_PER_MONTH).toFixed(1).replace('.', ',');
}

/** Formate un écart signé en euros (+ / -). */
export function formatSignedEuros(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatEuros(value)}`;
}

/** Formate un jour (nombre entier de jours écoulés depuis le jour 0), ou "—" si non applicable. */
export function formatDayOrDash(day: number | null): string {
  if (day === null) return '—';
  return `Jour ${Math.round(day)} (${formatDayAsMonth(day)})`;
}

// ---------------------------------------------------------------------------
// Formatage "langage simple" (mode standard, sans jargon)
// ---------------------------------------------------------------------------

/** Formate un numéro de mois en toutes lettres (ex. "Mois 7"), jamais "M7". */
export function formatSimpleMonth(monthNumber: number): string {
  return `Mois ${Math.round(monthNumber)}`;
}

export type SimplePaymentStatus = 'Versée' | 'Arrêtée' | 'Non versée';

/** Traduit un statut technique de période de versement en mot simple. */
export function simplifyPaymentStatus(
  status: 'paid' | 'stopped' | 'not_started' | 'not_applicable',
): SimplePaymentStatus {
  if (status === 'paid') return 'Versée';
  if (status === 'stopped') return 'Arrêtée';
  return 'Non versée';
}

/**
 * Décrit une plage de jours en mois, en langage courant ("du début au mois
 * 4", "du mois 3 au mois 7", "au mois 3"), pour les vues simplifiées.
 */
export function formatSimpleDayRange(startDay: number | null, endDay: number | null): string {
  const startMonth = startDay !== null ? Math.round(startDay / DAYS_PER_MONTH) : null;
  const endMonth = endDay !== null ? Math.round(endDay / DAYS_PER_MONTH) : null;

  if (startMonth === null && endMonth === null) return '';
  if (startMonth === 0 && endMonth !== null && endMonth !== 0) return `du début au mois ${endMonth}`;
  if (startMonth !== null && endMonth !== null && startMonth === endMonth) return `au mois ${startMonth}`;
  if (startMonth !== null && endMonth !== null) return `du mois ${startMonth} au mois ${endMonth}`;
  if (startMonth !== null) return `à partir du mois ${startMonth}`;
  if (endMonth !== null) return `jusqu’au mois ${endMonth}`;
  return '';
}
