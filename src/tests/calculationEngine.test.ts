import { describe, expect, it } from 'vitest';
import {
  aggregateDailySeriesByMonth,
  calculateASPDaily,
  calculateAREDailyForIndemnizedDay,
  calculateAREEntitlementDays,
  calculateBaseAREDaily,
  calculateIDR,
  calculateReclassementPrime,
  calculateRecommendedSimulationHorizonMonths,
  getAREEntitlementDays,
  getDefaultMaxHorizonByAge,
  runSimulation,
} from '../lib/calculationEngine';
import { DAYS_PER_MONTH } from '../lib/regulatoryConstants';
import { inputExplanations, resultExplanations } from '../lib/resultExplanations';
import type { SimulationInput } from '../lib/types';

function closeTo(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

const baseInput: SimulationInput = {
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
  supraLegalSeveranceMonths: 1,

  simulationHorizonMode: 'manual',
  simulationHorizonMonths: 24,
};

// ---------------------------------------------------------------------------
// Fonctions unitaires de base
// ---------------------------------------------------------------------------

describe('getAREEntitlementDays', () => {
  it('retourne 548 jours sous 55 ans', () => {
    expect(getAREEntitlementDays(45)).toBe(548);
  });
  it('retourne 685 jours entre 55 et 56 ans', () => {
    expect(getAREEntitlementDays(55)).toBe(685);
    expect(getAREEntitlementDays(56)).toBe(685);
  });
  it('retourne 822 jours à partir de 57 ans', () => {
    expect(getAREEntitlementDays(57)).toBe(822);
  });
});

describe('calculateBaseAREDaily', () => {
  it('applique la formule option1/option2/minimum/plafond', () => {
    closeTo(calculateBaseAREDaily(98.63), 56.22, 0.05);
  });

  it('applique le minimum journalier de 32,13 € quand le plafond de 75% du SJR le permet', () => {
    closeTo(calculateBaseAREDaily(45), 32.13, 0.01);
  });

  it('peut être plafonnée sous le minimum si 75% du SJR est très faible', () => {
    closeTo(calculateBaseAREDaily(10), 0.75 * 10, 0.01);
  });
});

describe('calculateASPDaily', () => {
  it("utilise 75% du SJR si supérieur à l'ARE de base et ancienneté >= 1 an", () => {
    closeTo(calculateASPDaily(98.63, 56.22, true), 73.97, 0.05);
  });

  it("retombe sur l'ARE de base si ancienneté < 1 an", () => {
    closeTo(calculateASPDaily(98.63, 56.22, false), 56.22, 0.05);
  });
});

describe('calculateAREDailyForIndemnizedDay', () => {
  const baseAREDaily = 112.44;
  const sjr = 197.26;

  it("n'applique pas la dégressivité avant le seuil de 183 jours (ARE classique)", () => {
    closeTo(
      calculateAREDailyForIndemnizedDay({ baseAREDaily, sjr, age: 45, areIndemnizedDay: 182, scenario: 'classic_are' }),
      baseAREDaily,
      0.01,
    );
  });

  it('applique la dégressivité à partir du 183e jour (ARE classique)', () => {
    closeTo(
      calculateAREDailyForIndemnizedDay({ baseAREDaily, sjr, age: 45, areIndemnizedDay: 183, scenario: 'classic_are' }),
      Math.max(baseAREDaily * 0.7, 92.57),
      0.01,
    );
  });

  it('ne dégresse jamais si le salarié a 55 ans ou plus', () => {
    closeTo(
      calculateAREDailyForIndemnizedDay({ baseAREDaily, sjr, age: 55, areIndemnizedDay: 400, scenario: 'classic_are' }),
      baseAREDaily,
      0.01,
    );
  });

  it("applique la dégressivité sur l'ARE après CSP uniquement à partir de 243 jours cumulés", () => {
    const before = calculateAREDailyForIndemnizedDay({
      baseAREDaily, sjr, age: 45, areIndemnizedDay: 10, scenario: 'after_csp', totalCspAndAreIndemnizedDay: 242,
    });
    const after = calculateAREDailyForIndemnizedDay({
      baseAREDaily, sjr, age: 45, areIndemnizedDay: 10, scenario: 'after_csp', totalCspAndAreIndemnizedDay: 243,
    });
    closeTo(before, baseAREDaily, 0.01);
    closeTo(after, Math.max(baseAREDaily * 0.7, 92.57), 0.01);
  });
});

describe('calculateAREEntitlementDays', () => {
  // Test 6 — seulement 8 mois d'affiliation
  it('estime la durée ARE à partir de l’affiliation déclarée (8 mois)', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 8,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    closeTo(result.totalAREEntitlementDays, 8 * DAYS_PER_MONTH, 1);
    expect(result.totalAREEntitlementDays).not.toBe(548);
  });

  // Test 7 — durée plafonnée à 548 jours sous 55 ans
  it('plafonne la durée ARE à 548 jours sous 55 ans', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 36,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.totalAREEntitlementDays).toBe(548);
  });

  // Test 8 — durée plafonnée à 685 jours entre 55 et 56 ans
  it('plafonne la durée ARE à 685 jours entre 55 et 56 ans', () => {
    const result = calculateAREEntitlementDays({
      age: 55,
      currentEmployerSeniorityMonths: 36,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.totalAREEntitlementDays).toBe(685);
  });

  // Test 9 — durée plafonnée à 822 jours à partir de 57 ans
  it('plafonne la durée ARE à 822 jours à partir de 57 ans', () => {
    const result = calculateAREEntitlementDays({
      age: 57,
      currentEmployerSeniorityMonths: 36,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.totalAREEntitlementDays).toBe(822);
  });

  // Test 10 — override officiel
  it('utilise exactement la durée officielle renseignée si présente', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 12,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: 300,
    });
    expect(result.totalAREEntitlementDays).toBe(300);
    expect(result.usedOfficialOverride).toBe(true);
  });

  it('signale une affiliation insuffisante sous 6 mois et ignore les nouveaux droits', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 3,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.affiliationInsufficient).toBe(true);
    expect(result.totalAREEntitlementDays).toBe(0);
  });

  it('utilise le reliquat existant si l’affiliation est insuffisante mais qu’un reliquat existe', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 3,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 120,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.affiliationInsufficient).toBe(true);
    expect(result.totalAREEntitlementDays).toBe(120);
  });
});

describe('calculateReclassementPrime', () => {
  it('est inéligible sans reprise d’emploi', () => {
    expect(
      calculateReclassementPrime({
        seniorityAtLeastOneYear: true, newJobStartDay: null, newJobContractType: 'CDI',
        newJobContractDurationMonths: null, aspDaily: 73.97,
      }).eligible,
    ).toBe(false);
  });

  // Test 12 — prime de reclassement
  it('est éligible pour une reprise en CDI avant le 10e mois de CSP, versée en deux fois', () => {
    const newJobStartDay = 4 * DAYS_PER_MONTH;
    const result = calculateReclassementPrime({
      seniorityAtLeastOneYear: true, newJobStartDay, newJobContractType: 'CDI',
      newJobContractDurationMonths: null, aspDaily: 73.97,
    });
    expect(result.eligible).toBe(true);
    expect(result.primeTotal).toBeGreaterThan(0);
    closeTo(result.firstPaymentDay ?? 0, newJobStartDay, 0.01);
    closeTo((result.secondPaymentDay ?? 0) - newJobStartDay, 91, 0.01);
    expect(result.secondPaymentPaid).toBe(true);
  });

  // Test 13 — CDD trop court
  it('est inéligible pour un CDD de moins de 6 mois', () => {
    const result = calculateReclassementPrime({
      seniorityAtLeastOneYear: true, newJobStartDay: 4 * DAYS_PER_MONTH, newJobContractType: 'CDD',
      newJobContractDurationMonths: 3, aspDaily: 73.97,
    });
    expect(result.eligible).toBe(false);
    expect(result.primeTotal).toBe(0);
  });
});

describe('calculateIDR', () => {
  it('est éligible si le nouveau salaire est inférieur et la quotité identique', () => {
    const result = calculateIDR({
      currentMonthlyGrossSalary: 3000, newMonthlyGrossSalary: 2500, newJobStartDay: 4 * DAYS_PER_MONTH,
      sameWorkingTime: true, newJobContractType: 'CDI', newJobContractDurationMonths: null,
      remainingAspRightsAtNewJob: 18000,
    });
    expect(result.eligible).toBe(true);
    closeTo(result.idrDaily, 16.44, 0.1);
  });

  it('est inéligible si le nouveau salaire est supérieur ou égal', () => {
    const result = calculateIDR({
      currentMonthlyGrossSalary: 3000, newMonthlyGrossSalary: 3500, newJobStartDay: 4 * DAYS_PER_MONTH,
      sameWorkingTime: true, newJobContractType: 'CDI', newJobContractDurationMonths: null,
      remainingAspRightsAtNewJob: 18000,
    });
    expect(result.eligible).toBe(false);
  });
});

describe('getDefaultMaxHorizonByAge / calculateRecommendedSimulationHorizonMonths', () => {
  it('retourne les plafonds par âge attendus', () => {
    expect(getDefaultMaxHorizonByAge(45)).toBe(23);
    expect(getDefaultMaxHorizonByAge(55)).toBe(28);
    expect(getDefaultMaxHorizonByAge(57)).toBe(32);
  });

  it('ne dépasse jamais le plafond absolu de 36 mois', () => {
    const months = calculateRecommendedSimulationHorizonMonths({
      age: 57,
      classicAreStartDay: 10000,
      classicAreExhaustionDay: 20000,
      cspAspEndDay: null,
      cspAreAfterCspStartDay: null,
      cspAreAfterCspExhaustionDay: null,
      newJobStartDay: null,
      reclassementPrimeFirstPaymentDay: null,
      reclassementPrimeSecondPaymentDay: null,
      idrEndDay: null,
      crossingDay: null,
    });
    expect(months).toBeLessThanOrEqual(36);
  });
});

// ---------------------------------------------------------------------------
// Simulation complète — cas obligatoires
// ---------------------------------------------------------------------------

describe('runSimulation — Test 1 : les cumuls ne baissent jamais', () => {
  it('csp et classicAre sont monotones croissants (benefits only et avec salaire)', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    for (let i = 1; i < result.dailySeries.length; i += 1) {
      const prev = result.dailySeries[i - 1];
      const curr = result.dailySeries[i];
      if (!prev || !curr) continue;
      expect(curr.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(prev.csp.benefitsOnlyTotal - 1e-9);
      expect(curr.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(prev.classicAre.benefitsOnlyTotal - 1e-9);
      expect(curr.csp.withNewSalaryTotal).toBeGreaterThanOrEqual(prev.csp.withNewSalaryTotal - 1e-9);
      expect(curr.classicAre.withNewSalaryTotal).toBeGreaterThanOrEqual(prev.classicAre.withNewSalaryTotal - 1e-9);
    }
  });
});

describe('runSimulation — Test 2 : le dernier mois affiché ne peut pas être inférieur à M20', () => {
  it('totaux au dernier mois >= totaux à M20', () => {
    const result = runSimulation({
      ...baseInput,
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
      simulationHorizonMode: 'manual',
      simulationHorizonMonths: 24,
    });
    const m20 = result.comparisonTable.find((row) => row.label === 'M20');
    const last = result.comparisonTable[result.comparisonTable.length - 1];
    expect(m20).toBeDefined();
    expect(last).toBeDefined();
    if (m20 && last) {
      expect(last.totalCsp).toBeGreaterThanOrEqual(m20.totalCsp - 1e-6);
      expect(last.totalAre).toBeGreaterThanOrEqual(m20.totalAre - 1e-6);
    }
  });
});

describe('runSimulation — Test 3 : les courbes évoluent sans reprise d’emploi', () => {
  const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null, newMonthlyGrossSalary: null });

  it('les écarts cumulés à M6, M9, M12, M15 ne sont pas tous identiques', () => {
    const diffs = [6, 9, 12, 15].map((m) => {
      const day = m * DAYS_PER_MONTH;
      const idx = Math.min(result.dailySeries.length - 1, Math.round(day));
      const point = result.dailySeries[idx];
      return point ? point.csp.benefitsOnlyTotal - point.classicAre.benefitsOnlyTotal : 0;
    });
    const allEqual = diffs.every((d) => Math.abs(d - diffs[0]!) < 1);
    expect(allEqual).toBe(false);
  });
});

describe('runSimulation — Test 4 : les courbes peuvent devenir parallèles après reprise (avec salaire)', () => {
  it('l’écart avec nouveau salaire reste stable après le 2e versement de prime', () => {
    const result = runSimulation({
      ...baseInput,
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
      simulationHorizonMode: 'manual',
      simulationHorizonMonths: 24,
    });
    expect(result.chosenAid).toBe('RECLASSEMENT_PRIME');
    const secondPaymentDay = result.reclassementPrime.secondPaymentDay ?? 0;
    const dayA = Math.min(result.dailySeries.length - 1, Math.round(secondPaymentDay + 10));
    const dayB = Math.min(result.dailySeries.length - 1, Math.round(secondPaymentDay + 60));
    const pointA = result.dailySeries[dayA];
    const pointB = result.dailySeries[dayB];
    expect(pointA).toBeDefined();
    expect(pointB).toBeDefined();
    if (pointA && pointB) {
      const diffA = pointA.csp.withNewSalaryTotal - pointA.classicAre.withNewSalaryTotal;
      const diffB = pointB.csp.withNewSalaryTotal - pointB.classicAre.withNewSalaryTotal;
      closeTo(diffA, diffB, 0.5);
    }
  });
});

describe('runSimulation — Test 5 : le mode indemnités uniquement exclut le nouveau salaire', () => {
  it('benefitsOnlyTotal n’inclut pas newSalary, withNewSalaryTotal l’inclut', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const newJobStartDay = result.newJobStartDay ?? 0;
    const day = Math.min(result.dailySeries.length - 1, Math.round(newJobStartDay + 30));
    const point = result.dailySeries[day];
    expect(point).toBeDefined();
    if (point) {
      expect(point.csp.newSalary).toBeGreaterThan(0);
      closeTo(point.csp.benefitsOnlyTotal + point.csp.newSalary, point.csp.withNewSalaryTotal, 0.01);
    }
  });
});

describe('runSimulation — Test 11 : dégressivité haut revenu', () => {
  const result = runSimulation({ ...baseInput, currentMonthlyGrossSalary: 6000, monthsBeforeNewJob: null });

  it('applique la dégressivité en ARE classique après 182 jours indemnisés', () => {
    expect(result.sjr).toBeGreaterThan(162.4);
    expect(result.areDegressiveApplicableClassic).toBe(true);
  });

  it("n'applique jamais de dégressivité à l'ASP", () => {
    const dayInAsp = 200;
    const point = result.dailySeries[dayInAsp];
    const prevPoint = result.dailySeries[dayInAsp - 1];
    expect(point).toBeDefined();
    expect(prevPoint).toBeDefined();
    if (point && prevPoint) {
      closeTo(point.csp.asp - prevPoint.csp.asp, result.aspDaily, 0.01);
    }
  });
});

describe('runSimulation — Test 18 : ASP arrêtée après reprise', () => {
  const result = runSimulation({
    ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500,
  });

  it('ASP > 0 avant la reprise et arrêtée après', () => {
    expect(result.cspAspStoppedByNewJob).toBe(true);
    const newJobStartDay = result.newJobStartDay ?? 0;
    const before = result.dailySeries[Math.round(newJobStartDay) - 5];
    const afterA = result.dailySeries[Math.round(newJobStartDay) + 5];
    const afterB = result.dailySeries[Math.round(newJobStartDay) + 35];
    expect(before).toBeDefined();
    expect(afterA).toBeDefined();
    expect(afterB).toBeDefined();
    if (before && afterA && afterB) {
      expect(before.csp.asp).toBeGreaterThan(0);
      closeTo(afterA.csp.asp, afterB.csp.asp, 0.01);
    }
  });

  it('déclenche l’événement d’arrêt ASP', () => {
    const event = result.events.find((e) => e.type === 'asp_stop' && e.label === 'Arrêt ASP');
    expect(event).toBeDefined();
  });
});

describe('runSimulation — Test 19 : ARE non démarrée si reprise avant début ARE', () => {
  const result = runSimulation({
    ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500,
    noticePeriodMonths: 3, remainingPaidLeaveDays: 28, supraLegalSeveranceMonths: 1,
  });

  it('l’ARE classique ne démarre jamais', () => {
    expect(result.classicAreStartDay).toBeGreaterThan((result.newJobStartDay ?? 0));
    expect(result.classicAreNeverStarted).toBe(true);
    const last = result.dailySeries[result.dailySeries.length - 1];
    expect(last?.classicAre.are ?? -1).toBe(0);
  });

  it('déclenche l’événement "ARE non démarrée"', () => {
    const event = result.events.find((e) => e.id === 'classic_are_never_started');
    expect(event).toBeDefined();
  });
});

describe('runSimulation — Test 20 : ARE arrêtée si reprise après le début de l’ARE', () => {
  const result = runSimulation({
    ...baseInput, monthsBeforeNewJob: 8, newMonthlyGrossSalary: 3500,
    noticePeriodMonths: 3, remainingPaidLeaveDays: 0, supraLegalSeveranceMonths: 0,
  });

  it('l’ARE classique est versée puis stoppée à la reprise', () => {
    expect(result.classicAreNeverStarted).toBe(false);
    expect(result.classicAreStoppedByNewJob).toBe(true);
    const newJobStartDay = result.newJobStartDay ?? 0;
    const before = result.dailySeries[Math.round(newJobStartDay) - 5];
    const afterA = result.dailySeries[Math.round(newJobStartDay) + 5];
    const afterB = result.dailySeries[Math.round(newJobStartDay) + 35];
    expect(before).toBeDefined();
    expect(afterA).toBeDefined();
    expect(afterB).toBeDefined();
    if (before && afterA && afterB) {
      expect(before.classicAre.are).toBeGreaterThan(0);
      closeTo(afterA.classicAre.are, afterB.classicAre.are, 0.01);
    }
  });

  it('déclenche l’événement d’arrêt ARE', () => {
    const event = result.events.find((e) => e.id === 'classic_are_stopped');
    expect(event).toBeDefined();
  });
});

describe('runSimulation — Test 14 : horizon automatique sous 55 ans', () => {
  it('reste dans la limite de 23 mois', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null, simulationHorizonMode: 'auto' });
    expect(result.horizon.displayedMonths).toBeLessThanOrEqual(23);
    expect(result.horizon.displayedMonths).toBeGreaterThanOrEqual(6);
  });
});

describe('runSimulation — Test 15 : horizon automatique 55-56 ans', () => {
  it('peut dépasser 23 mois mais reste sous 28 mois', () => {
    const result = runSimulation({
      ...baseInput, age: 55, currentEmployerSeniorityMonths: 36, monthsBeforeNewJob: null, simulationHorizonMode: 'auto',
    });
    expect(result.horizon.displayedMonths).toBeLessThanOrEqual(28);
  });
});

describe('runSimulation — Test 16 : horizon automatique 57 ans et plus', () => {
  it('peut dépasser 28 mois mais reste sous 32 mois', () => {
    const result = runSimulation({
      ...baseInput, age: 57, currentEmployerSeniorityMonths: 36, monthsBeforeNewJob: null, simulationHorizonMode: 'auto',
    });
    expect(result.horizon.displayedMonths).toBeLessThanOrEqual(32);
  });
});

describe('runSimulation — Test 17 : horizon manuel', () => {
  it('utilise exactement la durée manuelle demandée', () => {
    const result = runSimulation({
      ...baseInput, monthsBeforeNewJob: null, simulationHorizonMode: 'manual', simulationHorizonMonths: 18,
    });
    expect(result.horizon.displayedMonths).toBe(18);
  });
});

describe('runSimulation — cohérence générale', () => {
  it('ne produit jamais de valeurs négatives dans les totaux cumulés', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null });
    for (const point of result.dailySeries) {
      expect(point.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
      expect(point.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
    }
  });

  it('signale une ancienneté inférieure à 1 an', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null, seniorityAtLeastOneYear: false });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('choisit automatiquement l’aide la plus favorable quand les deux sont éligibles', () => {
    const result = runSimulation({
      ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 2500,
    });
    expect(result.reclassementPrime.eligible).toBe(true);
    expect(result.idr.eligible).toBe(true);
    expect(['RECLASSEMENT_PRIME', 'IDR']).toContain(result.chosenAid);
  });

  it('produit un tableau de comparaison sans ligne "Épuisement complet des droits"', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null, simulationHorizonMode: 'manual', simulationHorizonMonths: 24 });
    const hasExhaustionRow = result.comparisonTable.some((row) => row.label.includes('Épuisement complet'));
    expect(hasExhaustionRow).toBe(false);
  });
});

describe('aggregateDailySeriesByMonth', () => {
  it('produit des mois cohérents avec la série journalière (cumul de fin de mois = total du jour correspondant)', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null, simulationHorizonMode: 'manual', simulationHorizonMonths: 12 });
    const months = aggregateDailySeriesByMonth(result.dailySeries);
    expect(months.length).toBeGreaterThan(0);
    const firstMonth = months[0];
    expect(firstMonth).toBeDefined();
    if (firstMonth) {
      expect(firstMonth.csp.benefitsOnlyCumulativeTotal).toBeGreaterThan(0);
    }
  });

  it('n’inclut jamais le nouveau salaire dans les totaux "indemnités uniquement"', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const months = aggregateDailySeriesByMonth(result.dailySeries);
    const monthAfterReprise = months.find((m) => m.csp.newSalary > 0);
    expect(monthAfterReprise).toBeDefined();
    if (monthAfterReprise) {
      const reconstructed =
        monthAfterReprise.csp.paidLeave +
        monthAfterReprise.csp.notice +
        monthAfterReprise.csp.supraLegalSeverance +
        monthAfterReprise.csp.asp +
        monthAfterReprise.csp.are +
        monthAfterReprise.csp.reclassementPrime +
        monthAfterReprise.csp.idr;
      closeTo(reconstructed, monthAfterReprise.csp.benefitsOnlyMonthlyTotal, 0.01);
    }
  });

  it('capture les versements en un seul coup du jour 0 dans le mois 1 (non-régression)', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null });
    const months = aggregateDailySeriesByMonth(result.dailySeries);
    const firstMonth = months[0];
    expect(firstMonth).toBeDefined();
    if (firstMonth) {
      closeTo(firstMonth.csp.paidLeave, result.paidLeaveAmount, 0.01);
      closeTo(firstMonth.csp.supraLegalSeverance, result.supraLegalSeveranceAmount, 0.01);
      // Ces montants ne doivent pas être comptés une seconde fois au mois 2.
      const secondMonth = months[1];
      expect(secondMonth).toBeDefined();
      if (secondMonth) {
        closeTo(secondMonth.csp.paidLeave, 0, 0.01);
        closeTo(secondMonth.csp.supraLegalSeverance, 0, 0.01);
      }
    }
  });
});

describe('runSimulation — result.monthlySeries couvre toujours 23 mois', () => {
  it('affiche 23 mois même quand la reprise d’emploi résout tout en quelques mois', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    expect(result.monthlySeries).toHaveLength(23);
  });

  it('affiche 23 mois même en horizon manuel très court', () => {
    const result = runSimulation({
      ...baseInput,
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
      simulationHorizonMode: 'manual',
      simulationHorizonMonths: 6,
    });
    expect(result.monthlySeries).toHaveLength(23);
    expect(result.horizon.displayedMonths).toBe(6);
  });

  it('affiche 23 mois même sans reprise d’emploi (horizon auto plus long)', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: null });
    expect(result.monthlySeries).toHaveLength(23);
  });

  it('les mois au-delà de la fin des droits (sans nouveau salaire) restent à 0 €, jamais inventés', () => {
    const result = runSimulation({ ...baseInput, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const lastMonth = result.monthlySeries[result.monthlySeries.length - 1];
    expect(lastMonth).toBeDefined();
    if (lastMonth) {
      closeTo(lastMonth.csp.benefitsOnlyMonthlyTotal, 0, 0.01);
      closeTo(lastMonth.classicAre.benefitsOnlyMonthlyTotal, 0, 0.01);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 21 — dictionnaire des explications (tooltips)
// ---------------------------------------------------------------------------

describe('resultExplanations / inputExplanations', () => {
  it('ne contient aucun texte vide pour les résultats', () => {
    Object.values(resultExplanations).forEach((text) => {
      expect(typeof text).toBe('string');
      expect(text.trim().length).toBeGreaterThan(10);
    });
  });

  it('ne contient aucun texte vide pour les champs de saisie', () => {
    Object.values(inputExplanations).forEach((text) => {
      expect(typeof text).toBe('string');
      expect(text.trim().length).toBeGreaterThan(10);
    });
  });
});
