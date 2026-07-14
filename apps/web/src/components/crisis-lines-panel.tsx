import type { CrisisLines } from '../lib/crisis-lines';
import { formatPhoneDisplay } from '../lib/validation';

/**
 * Always-visible crisis lines (non-negotiable principle). Presentational: it
 * renders whatever lines it is given — the data layer guarantees a fallback so
 * this never shows empty for a person in crisis.
 */
export function CrisisLinesPanel({ lines }: { lines: CrisisLines }) {
  const all = [lines.active, ...lines.backups].filter(
    (line): line is { name: string; phone: string } => line !== null,
  );

  return (
    <section aria-label="Líneas de crisis" className="rounded-lg border border-risk-high/40 bg-red-50 p-4">
      <h2 className="text-lg font-semibold text-risk-high">
        Si estás en peligro, llama ahora
      </h2>
      <ul className="mt-3 space-y-2">
        {all.map((line) => (
          <li key={line.phone}>
            <a
              href={`tel:${line.phone.replace(/\s+/g, '')}`}
              className="flex items-center justify-between rounded-md bg-white px-3 py-2 font-medium shadow-sm"
            >
              <span>{line.name}</span>
              <span className="text-risk-high">{formatPhoneDisplay(line.phone)}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-600">
        Estas líneas están disponibles aunque no haya un voluntario en este momento.
      </p>
    </section>
  );
}
