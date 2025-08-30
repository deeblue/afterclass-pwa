import { useState } from "react";
import { api } from "../api/client"; // 這裡的 api 是函式集合

export default function Ingest() {
  const [imgDataUrl, setImgDataUrl] = useState<string>("");
  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("g7");
  const [unit, setUnit] = useState("unsorted");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    setImgDataUrl(dataUrl);
  }

  async function runIngest() {
    if (!imgDataUrl) return;
    setLoading(true); setMsg("");
    try {
      // 走我們定義的函式，不用 .post
      const res = await api.postIngestVision({
        image_data_url: imgDataUrl,
        subject, grade, unit
      });
      setItems(res.items || []);
      setMsg(`辨識完成，共 ${res.count ?? (res.items?.length ?? 0)} 題，請檢查後匯入。`);
    } catch (e: any) {
      setMsg("辨識失敗：" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function saveSelected() {
    const selected = items.filter((it) => !it._skip);
    if (!selected.length) { setMsg("沒有勾選要匯入的題目"); return; }
    setLoading(true); setMsg("");
    try {
      const res = await api.postItemsUpsert({ items: selected, mode: "upsert" });
      setMsg(`已匯入 ${res.upserted ?? selected.length} 題`);
    } catch (e: any) {
      setMsg("匯入失敗：" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">題目上傳（GPT 影像）</h1>

      <div className="flex gap-3 items-center">
        <input type="file" accept="image/*" onChange={onFile} />
        <select value={subject} onChange={e=>setSubject(e.target.value)} className="border px-2 py-1 rounded">
          <option value="math">math</option>
        </select>
        <select value={grade} onChange={e=>setGrade(e.target.value)} className="border px-2 py-1 rounded">
          <option value="g7">g7</option><option value="g8">g8</option><option value="g9">g9</option>
        </select>
        <input className="border px-2 py-1 rounded" value={unit} onChange={e=>setUnit(e.target.value)} placeholder="unit" />
        <button className="px-3 py-1 border rounded" onClick={runIngest} disabled={!imgDataUrl || loading}>
          {loading ? "辨識中…" : "辨識圖片"}
        </button>
      </div>

      {imgDataUrl && (
        <div className="flex gap-6">
          <img src={imgDataUrl} alt="preview" className="max-h-64 border rounded" />
        </div>
      )}

      {msg && <div className="text-sm text-slate-700">{msg}</div>}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm">預覽結果（可取消勾選不要匯入的題目）</div>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={it.id ?? i} className="border rounded p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!it._skip}
                    onChange={(e)=>setItems(prev=>{
                      const copy = [...prev]; copy[i] = { ...prev[i], _skip: !e.target.checked }; return copy;
                    })}
                  />
                  <div>
                    <div className="text-sm font-semibold">[{it.item_type}] {String(it.stem ?? "").slice(0, 120)}</div>
                    {Array.isArray(it.choices) && (
                      <ol className="list-disc ml-6 text-sm">
                        {it.choices.map((c: any, idx: number) => <li key={idx}>{String(c)}</li>)}
                      </ol>
                    )}
                    {it.answer != null && (
                      <pre className="text-xs bg-slate-50 p-2 rounded mt-2">{JSON.stringify(it.answer, null, 2)}</pre>
                    )}
                    {it.solution && <div className="text-xs mt-1 text-slate-600">解析：{String(it.solution).slice(0, 140)}</div>}
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <button className="px-4 py-2 border rounded bg-white hover:bg-slate-50" onClick={saveSelected} disabled={loading}>
            {loading ? "匯入中…" : "匯入選取題目"}
          </button>
        </div>
      )}
    </div>
  );
}

async function fileToDataUrl(f: File) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(f);
  });
}
