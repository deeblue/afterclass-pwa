// src/pages/AdminIssues.tsx
import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AdminIssues() {
  const [status, setStatus] = useState<"open"|"resolved"|"dismissed"|"all">("open");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [editing, setEditing] = useState<any|null>(null); // { issue, item, patch }

  async function load() {
    setLoading(true); setMsg("");
    try {
      const res = await api.getIssues(status);
      setRows(res.issues || []);
    } catch (e:any) {
      setMsg("讀取失敗：" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, [status]);

  async function act(issueId: string, action: "resolve"|"dismiss") {
    setLoading(true); setMsg("");
    try {
      await api.resolveIssue(issueId, action);
      await load();
    } catch (e:any) {
      setMsg("處理失敗：" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function openEdit(r: any) {
    try {
      const item = await api.getItem(r.item_id, true);
      setEditing({ issue: r, item, patch: { stem: item.stem, solution: item.solution, choices: item.choices, answer: item.answer }});
    } catch (e:any) {
      setMsg("讀取題目失敗：" + String(e?.message || e));
    }
  }

  async function savePatch() {
    if (!editing) return;
    const { item, patch, issue } = editing;
    setLoading(true); setMsg("");
    try {
      await api.patchItem(item.id, patch);
      await api.resolveIssue(issue.id, "resolve");
      setEditing(null);
      await load();
      setMsg("已套用修正並結案");
    } catch (e:any) {
      setMsg("儲存失敗：" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">題目問題審核</h1>

      <div className="flex items-center gap-3">
        <select className="border rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
          <option value="open">open</option>
          <option value="resolved">resolved</option>
          <option value="dismissed">dismissed</option>
          <option value="all">all</option>
        </select>
        <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50" onClick={load} disabled={loading}>
          {loading ? "讀取中…" : "重新整理"}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="border rounded p-3">
            <div className="text-sm">
              <b>{r.issue_type}</b> / {r.severity} / {r.status}
              <span className="ml-2 text-slate-500">#{r.id} · item: {r.item_id}</span>
            </div>
            <div className="text-sm mt-1 whitespace-pre-wrap">{r.detail}</div>
            {!!r.proposed && (
              <details className="text-xs mt-1">
                <summary className="cursor-pointer">proposed patch</summary>
                <pre className="bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(r.proposed, null, 2)}</pre>
              </details>
            )}
            <div className="mt-2 flex gap-2">
              <button className="text-xs px-2 py-1 border rounded" onClick={()=>openEdit(r)}>檢視/修正題目</button>
              <button className="text-xs px-2 py-1 border rounded" onClick={()=>act(r.id, "resolve")}>直接結案</button>
              <button className="text-xs px-2 py-1 border rounded" onClick={()=>act(r.id, "dismiss")}>駁回</button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="w-[900px] max-w-[95vw] bg-white rounded-lg shadow-xl p-4 space-y-3">
            <div className="font-semibold">修正題目 · {editing.item.id}</div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>題幹（stem）
                <textarea className="w-full border rounded px-2 py-1 mt-1" rows={4}
                  value={editing.patch.stem ?? ""}
                  onChange={e=>setEditing((s:any)=>({...s, patch: {...s.patch, stem: e.target.value}}))}
                />
              </label>
              <label>解析（solution）
                <textarea className="w-full border rounded px-2 py-1 mt-1" rows={4}
                  value={editing.patch.solution ?? ""}
                  onChange={e=>setEditing((s:any)=>({...s, patch: {...s.patch, solution: e.target.value}}))}
                />
              </label>
              <label>選項（choices / JSON）
                <textarea className="w-full border rounded px-2 py-1 mt-1" rows={6}
                  value={JSON.stringify(editing.patch.choices ?? null, null, 2)}
                  onChange={e=>setEditing((s:any)=>({...s, patch: {...s.patch, choices: JSON.parse(e.target.value || "null")}}))}
                />
              </label>
              <label>標準答案（answer / JSON）
                <textarea className="w-full border rounded px-2 py-1 mt-1" rows={6}
                  value={JSON.stringify(editing.patch.answer ?? null, null, 2)}
                  onChange={e=>setEditing((s:any)=>({...s, patch: {...s.patch, answer: JSON.parse(e.target.value || "null")}}))}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 text-sm" onClick={()=>setEditing(null)}>取消</button>
              <button className="px-3 py-1 text-sm border rounded bg-white hover:bg-slate-50" onClick={savePatch}>
                套用修正並結案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
