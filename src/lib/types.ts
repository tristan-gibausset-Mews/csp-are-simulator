/**
 * Types partagés du simulateur CSP vs ARE.
 * Toutes les valeurs monétaires sont en euros bruts.
 * Toutes les durées exprimées en "jours" sont des jours calendaires (365/an).
 */

export type ContractType = 'CDI' | 'CDD' | 'INTERIM' | 'OTHER';

/** Mode d'affichage des courbes / tableaux : avec ou sans le nouveau salaire. */
export type DisplayMode = 'benefits_only' | 'with_new_salary';

/** Mode de calcul de la durée d'affichage de la simulation. */
export type SimulationHorizonMode = 'auto' | 'manual';

/** Nom de scénario utilisé pour les libellés (périodes, événements). */
export type ScenarioLabel = 'CSP' | 'ARE + préavis';

/** Résultat d'une comparaison entre les deux scénarios à un instant donné. */
export type WinningScenario = ScenarioLabel | 'Égalité';

export interface SimulationInput {
  currentMonthlyGrossSalary: number;
  remainingPaidLeaveDays: number;
  monthsBeforeNewJob: number | null;
  newMonthlyGrossSalary: number | null;
  age: number;
  seniorityAtLeastOneYear: boolean;

  currentEmployerSeniorityMonths: number;
  previousEmployerAffiliationMonths: number;
  existingARERemainingDays: number;
  officialAREEntitlementDaysOverride: number | null;

  noticePeriodMonths: number;
  newJobContractType: ContractType;
  newJobContractDurationMonths: number | null;
  sameWorkingTime: boolean;

  simulationHorizonMode: SimulationHorizonMode;
  simulationHorizonMonths: number;
}

export const DEFAULT_INPUT: SimulationInput = {
  currentMonthlyGrossSalary: 3000,
  remainingPaidLeaveDays: 28,
  monthsBeforeNewJob: 4,
  newMonthlyGrossSalary: 3500,
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

  simulationHorizonMode: 'auto',
  simulationHorizonMonths: 23,
};

/**
 * Détail des flux d'un scénario à un jour donné, en CUMULÉ depuis le jour 0.
 * Structure partagée entre CSP et ARE + préavis : les champs non pertinents
 * pour un scénario donné (ex. `asp` pour l'ARE classique) restent à 0.
 */
export interface DailyScenarioCashflow {
  paidLeave: number;
  notice: number;
  asp: number;
  are: number;
  reclassementPrime: number;
  idr: number;
  newSalary: number;
  /** Total cumulé hors nouveau salaire (indemnités liées à la rupture / au chômage). */
  benefitsOnlyTotal: number;
  /** Total cumulé incluant le nouveau salaire perçu depuis la reprise d'emploi. */
  withNewSalaryTotal: number;
}

export interface DailySimulationPoint {
  day: number;
  month: number;
  csp: DailyScenarioCashflow;
  classicAre: DailyScenarioCashflow;
}

/**
 * Détail des flux d'un scénario sur UN mois donné (montants touchés ce mois,
 * pas des cumuls) ainsi que les cumuls à la fin de ce mois.
 */
export interface MonthlyScenarioCashflow {
  paidLeave: number;
  notice: number;
  asp: number;
  are: number;
  reclassementPrime: number;
  idr: number;
  newSalary: number;

  benefitsOnlyMonthlyTotal: number;
  withNewSalaryMonthlyTotal: number;

  benefitsOnlyCumulativeTotal: number;
  withNewSalaryCumulativeTotal: number;
}

export interface MonthlyCashflow {
  monthIndex: number;
  monthLabel: string;

  csp: MonthlyScenarioCashflow;
  classicAre: MonthlyScenarioCashflow;

  /** Écart du mois et écart cumulé, calculés sur la base "indemnités uniquement". */
  monthlyDifference: number;
  cumulativeDifference: number;
  winningScenario: WinningScenario;
}

export interface PaymentPeriod {
  scenario: ScenarioLabel;
  label: string;
  startDay: number | null;
  endDay: number | null;
  status: 'paid' | 'stopped' | 'not_started' | 'not_applicable';
  explanation: string;
}

export type SimulationEventType =
  | 'notice'
  | 'paid_leave'
  | 'are_start'
  | 'are_stop'
  | 'asp_stop'
  | 'new_job'
  | 'prime'
  | 'idr'
  | 'exhaustion'
  | 'crossing'
  | 'degressivity';

export interface SimulationEvent {
  id: string;
  day: number;
  month: number;
  label: string;
  scenario: ScenarioLabel | 'both';
  explanation: string;
  type: SimulationEventType;
}

export interface ComparisonRow {
  label: string;
  day: number;
  totalCsp: number;
  totalAre: number;
  diff: number;
  winner: WinningScenario;
}

/** Point de décision affiché dans le "Verdict" (DecisionSummary). */
export interface DecisionPoint {
  label: string;
  day: number;
  winner: WinningScenario;
  diffBenefitsOnly: number;
  diffWithNewSalary: number;
  reason: string;
}

/** Entrée affichée dans le panneau des dates clés. */
export interface KeyDateEntry {
  id: string;
  label: string;
  day: number | null;
  scenario: ScenarioLabel | 'both';
  explanation: string;
}

export interface ReclassementPrimeResult {
  eligible: boolean;
  remainingAspRightsAtNewJob: number;
  primeTotal: number;
  firstPaymentDay: number | null;
  firstPaymentAmount: number;
  secondPaymentDay: number | null;
  secondPaymentAmount: number;
  secondPaymentPaid: boolean;
}

export interface IdrResult {
  eligible: boolean;
  idrDaily: number;
  idrTotalCap: number;
  startDay: number | null;
  endDay: number | null;
  idrTotal: number;
}

export type ChosenAid = 'RECLASSEMENT_PRIME' | 'IDR' | 'NONE';

/** Résultat de l'estimation de la durée des droits ARE. */
export interface AREEntitlementResult {
  totalAREEntitlementDays: number;
  usedOfficialOverride: boolean;
  affiliationInsufficient: boolean;
  estimatedAffiliationMonths: number;
  cappedAffiliationMonths: number;
  referencePeriodMonths: number;
  maxEntitlementDaysByAge: number;
  estimatedEntitlementDays: number;
  newEntitlementDays: number;
}

export interface HorizonInfo {
  mode: SimulationHorizonMode;
  autoRecommendedMonths: number;
  displayedMonths: number;
  defaultMaxForAge: number;
  cappedByAgeMax: boolean;
}

export interface CurveInterpretation {
  message: string;
  parallelAfterNewJob: boolean;
}

export interface SimulationResult {
  input: SimulationInput;

  sjr: number;
  annualReferenceSalary: number;
  baseAreDaily: number;
  aspDaily: number;

  areEntitlement: AREEntitlementResult;

  paidLeaveAmount: number;

  areNoticePaidToEmployee: number;
  cspNoticePaidToEmployee: number;
  noticePaidToFranceTravail: number;

  paidLeaveDeferralDays: number;
  waitingPeriodDays: number;
  classicAreStartDay: number;

  areDegressiveApplicableClassic: boolean;
  areDailyAfterDegressivityClassic: number | null;
  degressivityStartDayClassic: number | null;

  hasNewJob: boolean;
  newJobStartDay: number | null;

  cspAspEndDay: number;
  cspAspStoppedByNewJob: boolean;
  cspAreAfterCspApplicable: boolean;
  cspAreAfterCspStartDay: number | null;
  cspAreAfterCspExhaustionDay: number | null;
  /** Reliquat de droits ARE restant après les 365 jours de CSP (totalAREEntitlementDays - 365, jamais négatif). */
  remainingAreDaysAfterCsp: number;
  areDegressiveApplicableAfterCsp: boolean;
  areDailyAfterDegressivityAfterCsp: number | null;

  classicAreNeverStarted: boolean;
  classicAreStoppedByNewJob: boolean;
  classicAreExhaustionDay: number | null;

  reclassementPrime: ReclassementPrimeResult;
  idr: IdrResult;
  chosenAid: ChosenAid;

  warnings: string[];

  events: SimulationEvent[];
  paymentPeriods: PaymentPeriod[];

  dailySeries: DailySimulationPoint[];
  monthlySeries: MonthlyCashflow[];

  comparisonTable: ComparisonRow[];
  decisionPoints: DecisionPoint[];
  keyDates: KeyDateEntry[];

  crossoverDay: number | null;

  horizon: HorizonInfo;
}
