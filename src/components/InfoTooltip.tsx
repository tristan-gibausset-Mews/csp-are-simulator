import { useEffect, useId, useRef, useState } from 'react';

interface InfoTooltipProps {
  text: string;
  label?: string;
}

/**
 * Petit bouton rond "i" affichant une info-bulle explicative.
 * Accessible : hover souris, focus clavier, tap mobile, fermeture Escape.
 */
export default function InfoTooltip({ text, label = 'Plus d’informations' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-mews-grey-300 bg-white text-[10px] font-semibold leading-none text-mews-grey-500 transition hover:border-mews-accent hover:text-mews-accent focus:outline-none focus:ring-2 focus:ring-mews-accent/30"
      >
        i
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 max-w-[280px] -translate-x-1/2 rounded-lg border border-mews-grey-100 bg-white p-2.5 text-xs leading-snug text-mews-grey-900 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
