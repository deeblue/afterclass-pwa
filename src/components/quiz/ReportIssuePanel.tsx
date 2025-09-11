// src/components/quiz/ReportIssuePanel.tsx
import { useState } from "react";
import { api } from "../../api/client";

type Props = {
  item: { id: string; stem?: string; choices?: any; answer?: any; solution?: string };
};

export default function ReportIssuePanel({ item }: Props) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState<"answer"|"wording"|"choice"|"format"|"other">("answer");
  const [severity, setSeverity] = useState<"low"|"mid"|"high">("low");
  const [detail, setDetail] = useState("");
  const [proposed, setProposed] = useState<{ stem?: string; choices?: string; answer?: string; solution?: string }>({});
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!item?.id) return;
    setSending(true); setMsg("");
    try {
      const payload: any = { item_id: item.id, issue_type: issueType, severity, detail };
      // 將提案字串（JSON）轉為物件
      const proposedPatch: any = {};
      if (proposed.stem?.trim()) proposedPatch.stem = proposed.stem;
      if (proposed.choices?.trim()) proposedPatch.choices = JSON.parse(proposed.choices);
      if (proposed.answer?.trim()) proposedPatch.answer = JSON.parse(proposed.answer);
      if (proposed.solution?.trim()) proposedPatch.solution = proposed.solution;
      if (Object.keys(proposedPatch).length) payload.proposed = proposedPatch;

      await api.postIssue(payload);
      setMsg("已送出，感謝你的回報！");
      setTimeout(()=> setOpen(false), 800);
    } catch (e:any) {
      setMsg("提交失敗：" + String(e?.message || e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
        onClick={()=>setOpen(true)}
      >
        回報問題
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-[680px] max-w-[92vw] bg-white rounded-lg shadow-xl p-4 space-y-3">
            <div className="font-semibold">回報題目問題</div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">類型
                <select className="w-full border rounded px-2 py-1"
                        value={issueType}
                        onChange={(e)=>setIssueType(e.target.value as any)}>
                  <option value="answer">標準答案可能有誤</option>
                  <option value="wording">敘述/題幹有誤</option>
                  <option value="choice">選項/配對有誤</option>
                  <option value="format">排版/格式</option>
                  <option value="other">其他</option>
                </select>
              </label>

              <label className="text-sm">嚴重度
                <select className="w-full border rounded px-2 py-1"
                        value={severity}
                        onChange={(e)=>setSeverity(e.target.value as any)}>
                  <option value="low">低</option>
                  <option value="mid">中</option>
                  <option value="high">高</option>
                </select>
              </label>
            </div>

            <label className="text-sm block">說明
              <textarea className="w-full border rounded px-2 py-1 mt-1" rows={3}
                        value={detail} onChange={(e)=>setDetail(e.target.value)}
                        placeholder="請描述遇到的問題、哪一小題、哪個選項或答案有疑慮…" />
            </label>

            <details className="text-sm">
              <summary className="cursor-pointer select-none">（可選）同時提交修正提案</summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <label>修正題幹（stem）
                  <textarea className="w-full border rounded px-2 py-1 mt-1" rows={2}
                            value={proposed.stem || ""} onChange={(e)=>setProposed(p=>({...p, stem: e.target.value}))} />
                </label>
                <label>修正解析（solution）
                  <textarea className="w-full border rounded px-2 py-1 mt-1" rows={2}
                            value={proposed.solution || ""} onChange={(e)=>setProposed(p=>({...p, solution: e.target.value}))} />
                </label>
                <label>修正選項（choices，JSON）
                  <textarea className="w-full border rounded px-2 py-1 mt-1" rows={3}
                            value={proposed.choices || ""} onChange={(e)=>setProposed(p=>({...p, choices: e.target.value}))}
                            placeholder='例如：["A","B","C","D"]' />
                </label>
                <label>修正答案（answer，JSON）
                  <textarea className="w-full border rounded px-2 py-1 mt-1" rows={3}
                            value={proposed.answer || ""} onChange={(e)=>setProposed(p=>({...p, answer: e.target.value}))}
                            placeholder='例如：{"kind":"single","index":2}' />
                </label>
              </div>
            </details>

            {msg && <div className="text-xs text-slate-600">{msg}</div>}

            <div className="flex justify-end gap-2 pt-1">
              <button className="px-3 py-1 text-xs" onClick={()=>setOpen(false)} disabled={sending}>取消</button>
              <button className="px-3 py-1 text-xs border rounded bg-white hover:bg-slate-50"
                      onClick={submit} disabled={sending || !detail.trim()}>
                {sending ? "送出中…" : "送出"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
