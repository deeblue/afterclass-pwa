export default function SingleChoice({
    choices, value, onChange
}: {
    choices: string[];
    value?: { kind?: "single"; index?: number };
    onChange: (v: any) => void;
}) {
    const idx = value?.index ?? -1;
    return (
    <div className="grid gap-2">
        {choices.map((c, i) => (
        <button
            key={i}
            type="button"
            onClick={() => onChange({ kind: "single", index: i })}
            className={`rounded-lg border px-3 py-2 text-left ${idx===i ? "border-sky-600 ring-1 ring-sky-300" : "hover:bg-gray-50"}`}
        >
            {c}
        </button>
        ))}
    </div>
    );
}
