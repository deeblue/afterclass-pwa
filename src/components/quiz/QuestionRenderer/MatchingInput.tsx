// 允許 left/right 既可以是字串，也可以是物件（例如 {left, right} 或 {text}）
type Choice = string | Record<string, any>;

function toLabel(x: Choice): string {
  if (typeof x === "string") return x;
  // 常見形狀的容錯：{text}、{label}、{left}、{right}
  if (typeof x.text === "string") return x.text;
  if (typeof x.label === "string") return x.label;
  if (typeof x.left === "string" && typeof x.right === "string") return `${x.left} ↔ ${x.right}`;
  if (typeof x.left === "string") return x.left;
  if (typeof x.right === "string") return x.right;
  // 最後備援：序列化
  try { return JSON.stringify(x); } catch { return String(x); }
}

function toKey(x: Choice, fallbackIndex: number): string {
  // select 的 value 需要可比較的穩定鍵；優先用可讀字串
  const label = toLabel(x);
  if (label && label !== "[object Object]") return label;
  return `CHOICE_${fallbackIndex}`;
}

export default function MatchingInput({
  left, right, value, onChange
}: {
  left: Choice[];   // 左列題目
  right: Choice[];  // 右列可選答案
  value?: { kind?: "matching"; pairs?: [string, string][] };
  onChange: (v:any)=>void;
}) {
  // 內部用 Map 以左側「可讀鍵」對應右側「可讀鍵」
  const pairs = new Map((value?.pairs ?? []).map(([l,r])=>[l,r]));

  const set = (lKey: string, rKey: string) => {
    const next = new Map(pairs);
    next.set(lKey, rKey);
    onChange({ kind:"matching", pairs: Array.from(next.entries()) as [string,string][] });
  };

  return (
    <div className="grid gap-3">
      {left.map((l,i)=>{
        const lLabel = toLabel(l);
        const lKey   = toKey(l, i);
        return (
          <div key={lKey} className="flex items-center gap-2">
            <div className="flex-1 rounded border px-3 py-2 bg-gray-50">{lLabel}</div>
            <span className="text-gray-500">→</span>
            <select
              className="rounded border px-2 py-2"
              value={pairs.get(lKey) ?? ""}
              onChange={(e)=>set(lKey, e.target.value)}
            >
              <option value="" disabled>請選擇</option>
              {right.map((r,j)=>{
                const rLabel = toLabel(r);
                const rKey   = toKey(r, j);
                return <option key={rKey} value={rKey}>{rLabel}</option>;
              })}
            </select>
          </div>
        );
      })}
    </div>
  );
}
