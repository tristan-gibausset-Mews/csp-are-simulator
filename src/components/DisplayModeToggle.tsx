import type { DisplayMode } from '../lib/types';

interface DisplayModeToggleProps {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

/**
 * Bascule discrète partagée entre le tableau mensuel et le graphique.
 * Volontairement peu visible : le mode par défaut ("Sans le nouveau
 * salaire") suffit à la grande majorité des lectures.
 */
export default function DisplayModeToggle({ displayMode, onChange }: DisplayModeToggleProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex w-fit gap-0.5 rounded-lg border border-mews-grey-300/30 bg-background-card-muted p-1 text-xs">
        <button
          type="button"
          onClick={() => onChange('benefits_only')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            displayMode === 'benefits_only'
              ? 'bg-mews-accent text-background-page'
              : 'text-mews-grey-500 hover:text-mews-grey-900'
          }`}
        >
          Sans le nouveau salaire
        </button>
        <button
          type="button"
          onClick={() => onChange('with_new_salary')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            displayMode === 'with_new_salary'
              ? 'bg-mews-accent text-background-page'
              : 'text-mews-grey-500 hover:text-mews-grey-900'
          }`}
        >
          Avec le nouveau salaire
        </button>
      </div>
      <p className="text-xs leading-relaxed text-mews-grey-500 sm:max-w-xs sm:text-right">
        Par défaut, le nouveau salaire est exclu pour comparer uniquement CSP, préavis, ARE et primes.
      </p>
    </div>
  );
}
