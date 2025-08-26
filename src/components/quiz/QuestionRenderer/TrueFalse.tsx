export default function TrueFalse({
  value, onChange, labels = ["正確", "錯誤"]
}: {
  value?: { kind?: "truefalse"|"single"; index?: 0|1 };
  onChange: (v:any)=>void;
  labels?: [string, string] | string[];
}) {
  const idx = (value?.index ?? -1) as number;
  const btn = (i: 0|1, text: string) => (
    <button
      type="button"
      onClick={() => onChange({ kind: "truefalse", index: i })}
      className={`rounded-lg border px-3 py-2 ${idx===i ? "border-sky-600 ring-1 ring-sky-300" : "hover:bg-gray-50"}`}
    >{text}</button>
  );
  return <div className="flex gap-2">{btn(0, String(labels[0]))}{btn(1, String(labels[1]))}</div>;
}
