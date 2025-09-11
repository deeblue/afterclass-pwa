// src/pages/AdminTools.tsx
import { useState } from "react";
import { api } from "../api/client";

export default function AdminTools() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<"items"|"all">("items");

  async function doBackup() {
    setBusy(true); setMsg("");
    try {
      const r = await api.postAdminBackup(scope);
      setMsg(`備份完成（${scope}）：items=${r.counts?.items ?? 0}, attempts=${r.counts?.attempts ?? 0}`);
    } catch (e:any) {
      setMsg("備份失敗：" + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function downloadLatest() {
    setBusy(true); setMsg("");
    try {
      const blob = await api.getAdminBackupLatestBlob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "afterclass-backup-latest.json";
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg("已下載最新備份");
    } catch (e:any) {
      setMsg("下載失敗：" + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function purge() {
    const today = new Date().toISOString().slice(0,10);
    const confirmInput = prompt(`輸入今天的日期以確認清除（${today}）。系統會先自動備份：`);
    if (confirmInput !== today) { setMsg("已取消"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await api.postAdminPurge(today, scope);
      setMsg(`已清空 ${r.cleared?.join(", ")}，已自動備份 key=${r.backup?.key}`);
    } catch (e:any) {
      setMsg("清除失敗：" + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">管理工具</h1>
      <div className="flex items-center gap-3">
        <label className="text-sm">範圍
          <select className="ml-2 border rounded px-2 py-1" value={scope} onChange={(e)=>setScope(e.target.value as any)}>
            <option value="items">items（題目）</option>
            <option value="all">all（含 attempts / kc_stats）</option>
          </select>
        </label>

        <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50" onClick={doBackup} disabled={busy}>
          {busy ? "處理中…" : "建立備份"}
        </button>
        <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50" onClick={downloadLatest} disabled={busy}>
          下載最新備份
        </button>
        <button className="px-3 py-1 border rounded bg-white hover:bg-rose-50 text-rose-600" onClick={purge} disabled={busy}>
          清空題庫（會先備份）
        </button>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
      <p className="text-xs text-slate-500">
        注意：清空僅限管理員操作；Cloudflare Worker 端已做 Bearer 驗證與日期二次確認。
      </p>
    </div>
  );
}
