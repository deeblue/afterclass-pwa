export default function TableFillInput({
  shape, value, onChange, headers
}: {
  shape: { rows: number; cols: number };
  value?: { kind?: "tablefill"; cells?: string[][] };
  onChange: (v:any)=>void;
  headers?: { top?: string[]; left?: string[] };
}) {
  const cells = (value?.cells ?? Array.from({length:shape.rows},()=>Array.from({length:shape.cols},()=> ""))).map(r=>r.slice());
  const set = (r:number,c:number,val:string) => {
    const next = cells.map(row=>row.slice());
    next[r][c] = val;
    onChange({ kind:"tablefill", cells: next });
  };

  return (
    <div className="overflow-auto">
      <table className="border-collapse">
        {headers?.top && (
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-gray-50"></th>
              {headers.top.map((h,i)=><th key={i} className="border px-2 py-1 bg-gray-50">{h}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({length:shape.rows}).map((_,r)=>(
            <tr key={r}>
              {headers?.left && <th className="border px-2 py-1 bg-gray-50">{headers.left[r] ?? ""}</th>}
              {Array.from({length:shape.cols}).map((__,c)=>(
                <td key={c} className="border p-0">
                  <input
                    className="w-28 px-2 py-1 outline-none"
                    value={cells[r][c] ?? ""}
                    onChange={(e)=>set(r,c,e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
