function move<T>(arr:T[], from:number, to:number) {
    const a = arr.slice(); const [x] = a.splice(from,1); a.splice(to,0,x); return a;
}

export default function OrderingInput({
    items, value, onChange
}: {
    items: string[];
    value?: { kind?: "ordering"; order?: number[] };
    onChange: (v:any)=>void;
}) {
    const order = value?.order ?? items.map((_,i)=>i);
    const up = (i:number) => onChange({ kind:"ordering", order: move(order, i, Math.max(0,i-1)) });
    const down = (i:number) => onChange({ kind:"ordering", order: move(order, i, Math.min(order.length-1,i+1)) });

    return (
    <ol className="grid gap-2">
        {order.map((idx, i) => (
        <li key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-white">
            <span className="min-w-6 text-center">{i+1}.</span>
            <span className="flex-1">{items[idx]}</span>
            <div className="flex gap-1">
            <button type="button" className="rounded border px-2 py-1" onClick={()=>up(i)} disabled={i===0}>↑</button>
            <button type="button" className="rounded border px-2 py-1" onClick={()=>down(i)} disabled={i===order.length-1}>↓</button>
            </div>
        </li>
        ))}
    </ol>
    );
}
