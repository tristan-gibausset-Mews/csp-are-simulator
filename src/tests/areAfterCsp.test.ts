import { describe, expect, it } from 'vitest';
import { runSimulation } from '../lib/calculationEngine';
import { CSP_MAX_DAYS, DAYS_PER_MONTH } from '../lib/regulatoryConstants';
import { inputExplanations, resultExplanations } from '../lib/resultExplanations';
import { BASE_INPUT, expectDayClose, expectMoneyClose } from './testHelpers';

/**
 * Reliquat ARE après CSP : quand les droits ARE totaux dépassent les 365
 * jours d'ASP du CSP, le solde continue à être versé après la fin du CSP,
 * sans reprise anticipée. Ces tests couvrent le calcul ET sa visibilité dans
 * le résultat exposé (result.remainingAreDaysAfterCsp).
 */

describe('Reliquat ARE après CSP — droits maximum sous 55 ans (548 jours)', () => {
  // currentEmployerSeniorityMonths: 36 -> affiliation plafonnée à 24 mois ->
  // 548 jours (plafond d'âge), soit un reliquat de 548 - 365 = 183 jours.
  const input = { ...BASE_INPUT, currentMonthlyGrossSalary: 3000, age: 45, currentEmployerSeniorityMonths: 36, monthsBeforeNewJob: null };
  const result = runSimulation(input);

  it('pays ASP for exactly 365 days and leaves a ~183-day ARE remainder', () => {
    expect(result.areEntitlement.totalAREEntitlementDays).toBe(548);
    expect(result.cspAspEndDay).toBe(365);
    expectDayClose(result.remainingAreDaysAfterCsp, 183, 1);
    expect(result.cspAreAfterCspApplicable).toBe(true);
  });

  it('pays ARE-after-CSP after day 365 and stops once the ~183-day remainder is exhausted', () => {
    const beforeCutoff = result.dailySeries[CSP_MAX_DAYS - 1];
    const afterCutoff = result.dailySeries[CSP_MAX_DAYS + 30];
    expect(beforeCutoff?.csp.are).toBe(0);
    expect(afterCutoff?.csp.are).toBeGreaterThan(0);

    const exhaustionDay = Math.round(result.cspAreAfterCspExhaustionDay ?? 0);
    expectDayClose(exhaustionDay, CSP_MAX_DAYS + 183, 1);
    const atExhaustion = result.dailySeries[Math.min(result.dailySeries.length - 1, exhaustionDay + 2)];
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, exhaustionDay + 60)];
    if (atExhaustion && wellAfter) expectMoneyClose(atExhaustion.csp.are, wellAfter.csp.are, 0.01);
  });
});

describe('Reliquat ARE après CSP — aucun reliquat quand les droits totaux valent 365 jours', () => {
  it('pays ASP for 365 days and no ARE-after-CSP at all', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      age: 45,
      currentEmployerSeniorityMonths: 12, // -> ~365 jours de droits ARE
      monthsBeforeNewJob: null,
    });
    expectDayClose(result.areEntitlement.totalAREEntitlementDays, 365, 1);
    expect(result.cspAspEndDay).toBe(365);
    expect(result.remainingAreDaysAfterCsp).toBe(0);
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, CSP_MAX_DAYS + 60)];
    expect(wellAfter?.csp.are ?? -1).toBe(0);
  });
});

describe('Reliquat ARE après CSP — reprise d’emploi avant la fin du CSP', () => {
  it('stops ASP at resumption and never starts ARE-after-CSP, while keeping the reclassement prime unaffected', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      age: 45,
      currentEmployerSeniorityMonths: 36, // -> 548 jours de droits, un reliquat existe en théorie
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
      newJobContractType: 'CDI',
    });
    expect(result.cspAspStoppedByNewJob).toBe(true);
    expect(result.cspAreAfterCspApplicable).toBe(false);
    const last = result.dailySeries[result.dailySeries.length - 1];
    expect(last?.csp.are ?? -1).toBe(0);

    // La prime de reclassement reste calculée normalement, indépendamment du reliquat ARE.
    expect(result.reclassementPrime.eligible).toBe(true);
    expectMoneyClose(result.reclassementPrime.primeTotal, 9000, 5);
  });
});

describe('Reliquat ARE après CSP — reprise d’emploi après la fin du CSP', () => {
  it('pays ASP up to month 12, then ARE-after-CSP from month 12 until the resumption, then stops', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      age: 45,
      currentEmployerSeniorityMonths: 36, // -> 548 jours de droits
      monthsBeforeNewJob: 15,
      newMonthlyGrossSalary: 3500,
      newJobContractType: 'CDI',
    });
    expect(result.cspAspEndDay).toBe(365);
    expect(result.cspAspStoppedByNewJob).toBe(false);
    expect(result.cspAreAfterCspApplicable).toBe(true);

    const newJobStartDay = result.newJobStartDay ?? 0;
    expectDayClose(newJobStartDay / DAYS_PER_MONTH, 15, 0.1);
    expectDayClose(result.cspAreAfterCspExhaustionDay ?? 0, newJobStartDay, 1);

    const midway = result.dailySeries[Math.round((CSP_MAX_DAYS + newJobStartDay) / 2)];
    expect(midway?.csp.are ?? -1).toBeGreaterThan(0);

    const atCutoff = result.dailySeries[Math.min(result.dailySeries.length - 1, Math.round(newJobStartDay) + 2)];
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, Math.round(newJobStartDay) + 60)];
    if (atCutoff && wellAfter) expectMoneyClose(atCutoff.csp.are, wellAfter.csp.are, 0.01); // arrêtée à la reprise
  });
});

describe('Reliquat ARE après CSP — cohérence de l’agrégation mensuelle', () => {
  it('shows ASP in months 1-12, ARE-after-CSP from month 13 onward, and a rising cumulative total until the remainder is exhausted', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      age: 45,
      currentEmployerSeniorityMonths: 36, // -> 548 jours de droits, reliquat de 183 jours (~6 mois)
      monthsBeforeNewJob: null,
    });

    const totalAspPaid = result.monthlySeries.reduce((sum, m) => sum + m.csp.asp, 0);
    const totalAreAfterCspPaid = result.monthlySeries.reduce((sum, m) => sum + m.csp.are, 0);
    expectMoneyClose(totalAspPaid, result.aspDaily * CSP_MAX_DAYS, 5);
    const areRestanteRate = result.areDailyAfterDegressivityAfterCsp ?? result.baseAreDaily;
    expectMoneyClose(totalAreAfterCspPaid, areRestanteRate * result.remainingAreDaysAfterCsp, 5);

    // Le cumul CSP continue à monter après le mois 12, tant que le reliquat n'est pas épuisé.
    const monthAt12 = result.monthlySeries[11]; // Mois 12
    const monthAt17 = result.monthlySeries[16]; // Mois 17, dans la fenêtre du reliquat (~18 mois)
    expect(monthAt12).toBeDefined();
    expect(monthAt17).toBeDefined();
    if (monthAt12 && monthAt17) {
      expect(monthAt17.csp.benefitsOnlyCumulativeTotal).toBeGreaterThan(monthAt12.csp.benefitsOnlyCumulativeTotal + 1);
    }

    // Une fois le reliquat épuisé (~mois 18), les mois suivants n'ajoutent plus rien.
    const lastMonth = result.monthlySeries[result.monthlySeries.length - 1]; // Mois 23
    expect(lastMonth).toBeDefined();
    if (lastMonth) expectMoneyClose(lastMonth.csp.benefitsOnlyMonthlyTotal, 0, 0.01);
  });
});

describe('Salaire de référence — le salaire mensuel renseigné sert de proxy à la moyenne des 12 derniers mois', () => {
  it('computes annualReferenceSalary and sjr from the single monthly salary input, unchanged', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 3000 });
    expect(result.annualReferenceSalary).toBe(36000);
    expectMoneyClose(result.sjr, 98.63, 0.01);
  });

  it('documents the 12-month-average approximation in the SJR tooltip and the salary field tooltip', () => {
    expect(resultExplanations.estimatedSjr).toMatch(/12 derniers mois/);
    expect(inputExplanations.currentMonthlyGrossSalary).toMatch(/12 derniers mois/);
  });
});
