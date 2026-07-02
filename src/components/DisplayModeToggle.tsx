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
    <div className="flex flex-wrap items-center gap-2 text-xs text-mews-grey-500">
      <div className="flex rounded-md border border-mews-grey-300 p-0.5">
        <button
          type="button"
          onClick={() => onChange('benefits_only')}
          className={`rounded px-2 py-0.5 font-medium ${displayMode === 'benefits_only' ? 'bg-mews-grey-900 text-white' : 'text-mews-grey-500'}`}
        >
          Sans le nouveau salaire
        </button>
        <button
          type="button"
          onClick={() => onChange('with_new_salary')}
          className={`rounded px-2 py-0.5 font-medium ${displayMode === 'with_new_salary' ? 'bg-mews-grey-900 text-white' : 'text-mews-grey-500'}`}
        >
          Avec le nouveau salaire
        </button>
      </div>
      <span>Par défaut, le nouveau salaire est exclu pour comparer uniquement CSP, préavis, ARE et primes.</span>
    </div>
  );
}
