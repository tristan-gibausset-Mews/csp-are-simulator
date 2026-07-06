import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { runSimulation } from '../lib/calculationEngine';
import { inputExplanations, resultExplanations } from '../lib/resultExplanations';
import { DEFAULT_INPUT } from '../lib/types';

/**
 * Garde-fou : l'indemnité supra-légale (et tout ce qui en découlait -
 * différé spécifique, specificDeferralDays...) a été entièrement retirée du
 * simulateur. Ces tests scannent le code source et le README pour garantir
 * qu'aucune référence ne peut être réintroduite par erreur.
 */

const SRC_DIR = resolve(__dirname, '..');
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const README_PATH = join(PROJECT_ROOT, 'README.md');
const SELF_FILENAME = 'noDeprecatedTerms.test.ts';

const FORBIDDEN_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'supra', regex: /supra/i },
  { name: 'specific deferral / specificDeferral', regex: /specific[ _-]?deferral/i },
  { name: 'severance', regex: /severance/i },
  { name: 'différé spécifique', regex: /diff[ée]r[ée]\s*sp[ée]cifique/i },
  { name: 'differe specifique (sans accents)', regex: /differe\s*specifique/i },
  { name: 'indemnité / indemnite supra', regex: /indemnit[ée]\s*supra/i },
];

function collectFiles(dir: string, extensions: string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const info = statSync(fullPath);
    if (info.isDirectory()) {
      collectFiles(fullPath, extensions, acc);
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function findViolations(files: string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(content)) {
        violations.push(`${file} — motif interdit : "${pattern.name}"`);
      }
    }
  }
  return violations;
}

describe('Absence totale de références à l’indemnité supra-légale (variable supprimée)', () => {
  it('ne contient aucune référence interdite dans src/', () => {
    const files = collectFiles(SRC_DIR, ['.ts', '.tsx']).filter((f) => !f.endsWith(SELF_FILENAME));
    expect(files.length).toBeGreaterThan(0);
    expect(findViolations(files)).toEqual([]);
  });

  it('ne contient aucune référence interdite dans README.md', () => {
    expect(findViolations([README_PATH])).toEqual([]);
  });

  it('n’expose plus aucun champ ou libellé lié à la variable supprimée dans le résultat de simulation', () => {
    const result = runSimulation({ ...DEFAULT_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });

    const runtimeStrings: string[] = [
      ...result.events.map((e) => `${e.label} | ${e.explanation}`),
      ...result.paymentPeriods.map((p) => `${p.label} | ${p.explanation}`),
      ...result.keyDates.map((k) => `${k.label} | ${k.explanation}`),
      ...result.warnings,
    ];

    const violations = runtimeStrings.flatMap((text) =>
      FORBIDDEN_PATTERNS.filter((pattern) => pattern.regex.test(text)).map((pattern) => `"${text}" — motif "${pattern.name}"`),
    );
    expect(violations).toEqual([]);

    // Aucune clé de type SimulationEvent ne doit plus être 'supra_legal'.
    expect(result.events.every((e) => (e.type as string) !== 'supra_legal')).toBe(true);

    // Le résultat ne doit plus exposer les champs supprimés.
    expect('supraLegalSeveranceAmount' in result).toBe(false);
    expect('specificDeferralDays' in result).toBe(false);
    expect('supraLegalSeveranceMonths' in result.input).toBe(false);
  });

  it('n’expose plus aucune référence interdite dans les dictionnaires de tooltips', () => {
    const allTexts = [...Object.values(resultExplanations), ...Object.values(inputExplanations)];
    const violations = allTexts.flatMap((text) =>
      FORBIDDEN_PATTERNS.filter((pattern) => pattern.regex.test(text)).map((pattern) => `"${text}" — motif "${pattern.name}"`),
    );
    expect(violations).toEqual([]);
    expect(Object.keys(resultExplanations)).not.toContain('supraLegalSeveranceAmount');
    expect(Object.keys(resultExplanations)).not.toContain('specificDeferralDays');
    expect(Object.keys(inputExplanations)).not.toContain('supraLegalSeveranceMonthsInput');
  });
});
