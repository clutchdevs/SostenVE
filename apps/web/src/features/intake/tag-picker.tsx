import { TAG_CATALOG, type TagSeverity } from './tag-catalog';

const SEVERITY_STYLES: Record<TagSeverity, { off: string; on: string }> = {
  red: { off: 'border-risk-high/40 text-risk-high', on: 'bg-risk-high text-white' },
  orange: { off: 'border-risk-moderate/40 text-risk-moderate', on: 'bg-risk-moderate text-white' },
  yellow: { off: 'border-amber-300 text-amber-700', on: 'bg-amber-500 text-white' },
};

/** Tactile tag selector for the green branch (presentational). */
export function TagPicker({
  selected,
  onToggle,
}: {
  selected: readonly string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Síntomas">
      {TAG_CATALOG.map((tag) => {
        const isOn = selected.includes(tag.code);
        const styles = SEVERITY_STYLES[tag.severity];
        return (
          <button
            key={tag.code}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(tag.code)}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
              isOn ? styles.on : `bg-white ${styles.off}`
            }`}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
