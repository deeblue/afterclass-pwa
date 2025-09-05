// src/pages/Ingest.tsx
import { useMemo, useState } from "react";
import { api } from "../api/client";

type DraftItem = {
  id?: string;
  subject: string;
  grade: string;
  unit: string;
  item_type: string;
  stem: string;
  choices?: any[] | null;
  answer?: any | null;
  solution?: string | null;
  difficulty?: number;
  tags?: string[];
  source?: string | null;
  status?: string;
  _skip?: boolean; // 前端用，匯入時會剔除
};

type IngestResp = {
  count?: number;
  items?: DraftItem[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  raw?: any;
  raw_text?: string;
  meta?: any;
  errors?: string[];
  duration_ms?: number;
};

export default function Ingest() {
  const [imgDataUrl, setImgDataUrl] = useState<string>("");

  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("g7");
  const [unit, setUnit] = useState("unsorted");

  const [useStrong, setUseStrong] = useState(false); // ✅ 是否用強模型

  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 額外：顯示「辨識過程 / 原始回應」
  const [phase, setPhase] = useState<"idle"|"upload"|"model"|"parse"|"done">("idle");
  const [resp, setResp] = useState<IngestResp | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);

  // ✅ 題庫管理用的 loading 狀態
  const [adminBusy, setAdminBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // ✅ 上傳前等比縮圖（最長邊 1600px），壓成 jpeg
    const dataUrl = await fileToDataUrlResized(f, 1600, 0.9);
    setImgDataUrl(dataUrl);
    setItems([]);
    setResp(null);
    setMsg("");
    setPhase("idle");
  }

  async function runIngest() {
    if (!imgDataUrl) return;
    setLoading(true);
    setMsg("");
    setPhase("upload");
    setStartedAt(Date.now());
    setResp(null);
    setItems([]);

    try {
      // 1) payload：把 useStrong 傳進去
      const payload = {
        image_data_url: imgDataUrl,
        subject,
        grade,
        unit,
        strong: useStrong, // ✅ 傳給 API（client.ts 會把它轉成 ?strong=1）
      };

      // 2) call API
      setPhase("model");
      const res: IngestResp = await api.postIngestVision(payload as any);

      // 3) parse
      setPhase("parse");
      const outItems: DraftItem[] = Array.isArray(res?.items) ? res.items : [];
      setItems(outItems.map((it) => ({ ...it, _skip: false })));
      setResp({
        ...res,
        duration_ms:
          typeof res?.duration_ms === "number"
            ? res.duration_ms
            : Date.now() - startedAt,
      });
      setMsg(`辨識完成，共 ${res?.count ?? outItems.length} 題。請檢查後匯入。`);

      // 4) done
      setPhase("done");
    } catch (e: any) {
      setMsg("辨識失敗：" + String(e?.message || e));
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }

  async function saveSelected() {
    const selected = items.filter((it) => !it._skip);
    if (!selected.length) {
      setMsg("沒有勾選要匯入的題目");
      return;
    }
    setLoading(true);
    setMsg("");

    try {
      const res = await api.postItemsUpsert({
        items: selected.map(stripClientFields),
        mode: "upsert",
      });
      const ok = (res as any)?.upserted ?? selected.length;
      setMsg(`已匯入 ${ok} 題`);
    } catch (e: any) {
      setMsg("匯入失敗：" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ✅ 先備份再清除題庫
  async function backupThenClear() {
    if (adminBusy) return;
    setAdminBusy(true);
    try {
      // 1) 先下載備份（/api/items/backup）
      const blob = await api.getItemsBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "_");
      a.href = url;
      a.download = `items-backup-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // 2) 確認後清除（/api/items/clear）
      const ok = window.confirm("已下載備份。是否確定要清除整個題庫？此動作不可還原。");
      if (!ok) return;

      const res = await api.deleteItems();
      alert(`清除完成：刪除了 ${res.deleted ?? 0} 題。`);

      // 若目前頁面上有預覽清單，清掉避免誤會
      setItems([]);
    } catch (e: any) {
      alert("操作失敗：" + String(e?.message || e));
    } finally {
      setAdminBusy(false);
    }
  }

  const phaseText = useMemo(() => {
    switch (phase) {
      case "upload": return "Uploading image…";
      case "model":  return "Calling model…";
      case "parse":  return "Parsing response…";
      case "done":   return "Done.";
      default:       return "";
    }
  }, [phase]);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">題目上傳（GPT 影像）</h1>

      {/* 操作列 */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="file" accept="image/*" onChange={onFile} />
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="math">math</option>
        </select>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="g7">g7</option>
          <option value="g8">g8</option>
          <option value="g9">g9</option>
        </select>
        <input
          className="border px-2 py-1 rounded"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="unit"
        />

        {/* ✅ 使用強模型 */}
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useStrong}
            onChange={(e) => setUseStrong(e.target.checked)}
          />
          <span>使用強模型（gpt-4o）</span>
        </label>

        <button
          className="px-3 py-1 border rounded bg-white hover:bg-slate-50"
          onClick={runIngest}
          disabled={!imgDataUrl || loading}
        >
          {loading ? "辨識中…" : "辨識圖片"}
        </button>
      </div>

      {/* 預覽圖 & 進度 */}
      {(imgDataUrl || phase !== "idle") && (
        <div className="flex flex-col gap-3">
          {imgDataUrl && (
            <div className="flex gap-6">
              <img
                src={imgDataUrl}
                alt="preview"
                className="max-h-64 border rounded"
              />
            </div>
          )}

          {phase !== "idle" && (
            <div className="text-sm">
              <span className="inline-flex items-center gap-2">
                {loading && (
                  <span className="inline-block h-3 w-3 rounded-full animate-pulse bg-sky-500" />
                )}
                <span className="text-slate-600">{phaseText}</span>
                {resp?.duration_ms != null && phase === "done" && (
                  <span className="text-slate-500">
                    （{Math.round(resp.duration_ms)} ms）
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 訊息 */}
      {msg && <div className="text-sm text-slate-700">{msg}</div>}

      {/* 模型摘要（如後端有提供） */}
      {resp && (resp.model || resp.usage || resp.errors?.length) && (
        <div className="text-xs text-slate-600 bg-slate-50 rounded p-3 border">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {resp.model && <div>model: <b>{resp.model}</b></div>}
            {!!resp.usage?.prompt_tokens && <div>prompt: {resp.usage.prompt_tokens}</div>}
            {!!resp.usage?.completion_tokens && <div>completion: {resp.usage.completion_tokens}</div>}
            {!!resp.usage?.total_tokens && <div>total: {resp.usage.total_tokens}</div>}
          </div>
          {!!resp.errors?.length && (
            <ul className="list-disc ml-5 mt-2">
              {resp.errors.map((e, i) => <li key={i} className="text-red-600">{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* 原始回應（raw） */}
      {resp && (
        <details className="group border rounded bg-white">
          <summary className="cursor-pointer select-none py-2 px-3 text-sm text-slate-700 group-open:border-b">
            顯示模型原始回應（raw）
          </summary>
          <div className="p-3">
            <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-[40vh]">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </div>
        </details>
      )}

      {/* 預覽題目清單 */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm">
            預覽結果（取消勾選可排除不想匯入的題目）
          </div>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={it.id ?? i} className="border rounded p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!it._skip}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[i] = { ...prev[i], _skip: !e.target.checked };
                        return copy;
                      })
                    }
                  />
                  <div>
                    <div className="text-sm font-semibold">
                      [{it.item_type}] {String(it.stem ?? "").slice(0, 140)}
                    </div>
                    {Array.isArray(it.choices) && it.choices.length > 0 && (
                      <ol className="list-decimal ml-6 text-sm">
                        {it.choices.map((c: any, idx: number) => (
                          <li key={idx}>{String(c)}</li>
                        ))}
                      </ol>
                    )}
                    {it.answer != null && (
                      <pre className="text-xs bg-slate-50 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(it.answer, null, 2)}
                      </pre>
                    )}
                    {it.solution && (
                      <div className="text-xs mt-1 text-slate-600">
                        解析：{String(it.solution).slice(0, 140)}
                      </div>
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <button
            className="px-4 py-2 border rounded bg-white hover:bg-slate-50"
            onClick={saveSelected}
            disabled={loading}
          >
            {loading ? "匯入中…" : "匯入選取題目"}
          </button>
        </div>
      )}

      {/* ✅ 題庫管理工具：先備份再清除 */}
      <div className="mt-8 border-t pt-4 space-y-3">
        <h2 className="text-sm font-bold text-red-700">⚠️ 題庫管理</h2>
        <p className="text-xs text-slate-600">清除前會先下載備份，請小心操作。</p>
        <button
          className="px-4 py-2 border rounded bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
          onClick={backupThenClear}
          disabled={adminBusy}
        >
          {adminBusy ? "處理中…" : "備份並清除全部題庫"}
        </button>
      </div>
    </div>
  );
}

function stripClientFields(it: DraftItem) {
  const { _skip, ...rest } = it;
  return rest;
}

// ✅ 等比縮圖（最長邊 maxSide），輸出 JPEG dataURL
async function fileToDataUrlResized(file: File, maxSide = 1600, quality = 0.9): Promise<string> {
  const imgBitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(imgBitmap.width, imgBitmap.height));
  const w = Math.round(imgBitmap.width * scale);
  const h = Math.round(imgBitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgBitmap, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}
