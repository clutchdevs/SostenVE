import { TAG_CATALOG, type TagSeverity } from './tag-catalog';

const SEVERITY_STYLES: Record<TagSeverity, { off: string; on: string }> = {
  red: { off: 'border-risk-high/40 text-risk-high', on: 'bg-risk-high text-white' },
  orange: { off: 'border-risk-moderate/40 text-risk-moderate', on: 'bg-risk-moderate text-white' },
  yellow: { off: 'border-amber-300 text-amber-700', on: 'bg-amber-500 text-white' },
};

// Clinical severity groups (PRD RF-1.3), most severe first. The labels are gentle
// so the picker stays humane while still surfacing life-risk signals.
const GROUPS: { severity: TagSeverity; heading: string }[] = [
  { severity: 'red', heading: 'Señales que necesitan ayuda urgente' },
  { severity: 'orange', heading: 'Crisis aguda o angustia intensa' },
  { severity: 'yellow', heading: 'Malestar y estrés por la situación' },
];

/** Tactile tag selector for the green branch, grouped by clinical severity. */
export function TagPicker({
  selected,
  onToggle,
}: {
  selected: readonly string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="space-y-4" role="group" aria-label="Síntomas">
      {GROUPS.map((group) => {
        const tags = TAG_CATALOG.filter((t) => t.severity === group.severity);
        if (tags.length === 0) return null;
        return (
          <div key={group.severity}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group.heading}
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
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
          </div>
        );
      })}
    </div>
  );
}
