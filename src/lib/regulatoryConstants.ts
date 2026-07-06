/**
 * Constantes réglementaires utilisées par le moteur de calcul.
 *
 * IMPORTANT : ces valeurs évoluent régulièrement (revalorisations, conventions
 * Unédic). Elles doivent être vérifiées périodiquement auprès de France Travail
 * et de l'Unédic avant toute utilisation autre qu'indicative. Voir le README.
 */

export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 365 / 12;

// ARE — allocation de retour à l'emploi
export const ARE_FIXED_PART = 13.18;
export const ARE_MIN_DAILY = 32.13;
export const ARE_RATE_OPTION_1 = 0.404;
export const ARE_RATE_OPTION_2 = 0.57;
export const ARE_MAX_RATE = 0.75;

// ASP — allocation de sécurisation professionnelle (CSP)
export const ASP_RATE = 0.75;
export const CSP_MAX_DAYS = 365;

// Différés et délai d'attente (scénario ARE classique)
export const WAITING_PERIOD_DAYS = 7;
export const PAID_LEAVE_DEFERRAL_CAP_DAYS = 30;

// Préavis
export const NOTICE_CONTRIBUTION_CAP_MONTHS = 3;

// Prime de reclassement (CSP)
export const PRIME_RECLASSEMENT_RATE = 0.5;
export const PRIME_RECLASSEMENT_ELIGIBILITY_LIMIT_MONTH = 10;
export const PRIME_RECLASSEMENT_PAYMENT_2_DELAY_DAYS = 91;

// Durée des droits ARE selon l'âge
export const ARE_DURATION_DAYS_UNDER_55 = 548;
export const ARE_DURATION_DAYS_55_TO_56 = 685;
export const ARE_DURATION_DAYS_57_PLUS = 822;

// Dégressivité ARE
export const DEGRESSIVE_ARE_MONTHLY_SALARY_THRESHOLD = 4939.67;
export const DEGRESSIVE_ARE_SJR_THRESHOLD = 162.4;
export const DEGRESSIVE_ARE_START_DAY_CLASSIC_ARE = 183;
export const DEGRESSIVE_ARE_START_DAY_AFTER_CSP_TOTAL_INDEMNIZED = 243;
export const DEGRESSIVE_ARE_REDUCTION_RATE = 0.3;
export const DEGRESSIVE_ARE_FLOOR_DAILY = 92.57;

// IDR — indemnité différentielle de reclassement
export const IDR_MAX_DURATION_MONTHS = 12;

// Horizon automatique d'affichage de la simulation
export const DEFAULT_MAX_SIMULATION_MONTHS_UNDER_55 = 23;
export const DEFAULT_MAX_SIMULATION_MONTHS_55_TO_56 = 28;
export const DEFAULT_MAX_SIMULATION_MONTHS_57_PLUS = 32;
export const ABSOLUTE_MAX_SIMULATION_MONTHS = 36;
