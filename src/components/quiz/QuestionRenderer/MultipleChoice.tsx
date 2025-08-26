export default function MultipleChoice({
    choices, value, onChange
}: {
    choices: string[];
    value?: { kind?: "multiple"; indices?: number[] };
    onChange: (v: any) => void;
}) {
    const set = new Set(value?.indices ?? []);
    const toggle = (i: number) => {
    const next = new Set(set);
    next.has(i) ? next.delete(i) : next.add(i);
    onChange({ kind: "multiple", indices: Array.from(next).sort((a,b)=>a-b) });
    };
    return (
    <div className="grid gap-2">
        {choices.map((c, i) => (
        <label key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input
            type="checkbox"
            checked={set.has(i)}
            onChange={() => toggle(i)}
            />
            <span>{c}</span>
        </label>
        ))}
    </div>
    );
}
