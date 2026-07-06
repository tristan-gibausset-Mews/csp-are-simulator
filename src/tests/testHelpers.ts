import { expect } from 'vitest';
import { DAYS_PER_MONTH } from '../lib/regulatoryConstants';
import { DEFAULT_INPUT } from '../lib/types';
import type { SimulationInput } from '../lib/types';

/**
 * Tolérances volontairement larges : les calculs internes ne sont jamais
 * arrondis (voir calculationEngine.ts), donc comparer au centime près serait
 * fragile face aux écarts d'arrondi de conversion jour <-> mois (365/12).
 * On teste les ordres de grandeur et les règles, pas la précision binaire.
 */
export const MONEY_TOLERANCE = 2;
export const DAY_TOLERANCE = 1;

export function expectMoneyClose(actual: number, expected: number, tolerance = MONEY_TOLERANCE): void {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

export function expectDayClose(actual: number, expected: number, tolerance = DAY_TOLERANCE): void {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

/** Convertit un nombre de mois en jours calendaires (365 / 12 par mois). */
export function monthsToDays(months: number): number {
  return months * DAYS_PER_MONTH;
}

/**
 * Entrée de base réutilisée par toute la suite de tests métier : salaire
 * 3000 €, 28 jours de congés, préavis de 3 mois, ancienneté >= 1 an, pas de
 * reprise d'emploi par défaut (chaque test override ce qui l'intéresse).
 */
export const BASE_INPUT: SimulationInput = {
  ...DEFAULT_INPUT,
  currentMonthlyGrossSalary: 3000,
  remainingPaidLeaveDays: 28,
  monthsBeforeNewJob: null,
  newMonthlyGrossSalary: null,
  age: 45,
  seniorityAtLeastOneYear: true,
  currentEmployerSeniorityMonths: 12,
  previousEmployerAffiliationMonths: 0,
  existingARERemainingDays: 0,
  officialAREEntitlementDaysOverride: null,
  noticePeriodMonths: 3,
  newJobContractType: 'CDI',
  newJobContractDurationMonths: null,
  sameWorkingTime: true,
  simulationHorizonMode: 'manual',
  simulationHorizonMonths: 24,
};
