export default function ClozeInput({
    blanks=1, value, onChange
}: {
    blanks?: number;
    value?: { kind?: "cloze"; blanks?: string[] };
    onChange: (v:any)=>void;
}) {
    const arr = value?.blanks ?? Array.from({ length: blanks }, ()=>"");
    const set = (i:number, val:string) => {
    const next = [...arr]; next[i] = val;
    onChange({ kind: "cloze", blanks: next });
    };
    return (
    <div className="grid gap-2">
        {arr.map((v,i)=>(
        <input key={i}
            className="rounded-lg border px-3 py-2"
            value={v}
            onChange={(e)=>set(i,e.target.value)}
            placeholder={`第 ${i+1} 空`}
        />
        ))}
    </div>
    );
}
