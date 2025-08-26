import { useState } from "react";
import type { Item } from "../../types";
import { api } from "../../api/client";

type EvalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: { model: string; result: any } }
  | { status: "error"; message: string };

export default function ProcessEvaluate({
  item,
  answerValue
}: {
  item: Item;
  /** QuestionCard 收集到的答案物件（可能含 work: { json, png } 與你自定的步驟） */
  answerValue: any;
}) {
  const [notes, setNotes] = useState<string>(""); // 使用者自行輸入的步驟說明（每行一個）
  const [prefStrong, setPrefStrong] = useState(false);
  const [state, setState] = useState<EvalState>({ status: "idle" });

  const handleSend = async () => {
    try {
      setState({ status: "loading" });

      // 從答案物件抓手寫 JSON（若已按過「儲存筆跡」）
      const sketchJson = (() => {
        try {
          const raw = answerValue?.work?.json;
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();

      // 將多行 notes 轉成字串陣列
      const noteLines = notes
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);

      // 準備 steps 給後端（後端不限制格式，我們給清楚的欄位）
      const steps = {
        notes: noteLines,          // 你手動描述的計算步驟
        sketch_paths: sketchJson,  // 手寫筆跡（含時間戳）
        // 也可以附上你輸入元件的過程，例如中間草稿，每步一筆
        meta: {
          item_type: item.item_type,
          has_work_png: !!answerValue?.work?.png
        }
      };

      const payload = {
        stem: item.stem,
        solution: item.solution ?? "",
        steps,
        policy: { strong: prefStrong } // true = 先試 gpt-4o；false = 先 4o-mini
      };

      const resp = await api.postEval(payload);
      setState({ status: "done", data: resp });
    } catch (e: any) {
      setState({ status: "error", message: String(e?.message || e) });
    }
  };

  return (
    <div className="mt-6 rounded-2xl border p-4 bg-slate-50 space-y-3">
      <div className="font-semibold">計算過程評估（可選）</div>
      <p className="text-sm text-slate-600">
        先在上面的手寫板按「儲存筆跡」，再於此輸入每一步的說明（每行一個步驟）。點「送出評估」後，系統會用 GPT 檢查並依 rubric 給分。
      </p>

      <textarea
        className="w-full min-h-28 rounded-lg border px-3 py-2"
        placeholder={"例：\n1) 通分為 6\n2) 1/2 = 3/6\n3) 1/3 = 2/6\n4) 相加為 5/6"}
        value={notes}
        onChange={(e)=>setNotes(e.target.value)}
      />

      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={prefStrong} onChange={(e)=>setPrefStrong(e.target.checked)} />
        <span className="text-sm">偏好較強模型（gpt-4o，費用較高）</span>
      </label>

      <div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-100"
          onClick={handleSend}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? "送出中…" : "送出評估"}
        </button>
      </div>

      {state.status === "done" && (
        <div className="rounded-lg border bg-white p-3">
          <div className="text-sm text-slate-600">Model: {state.data.model}</div>
          <pre className="mt-2 text-sm whitespace-pre-wrap break-words">
{JSON.stringify(state.data.result, null, 2)}
          </pre>
        </div>
      )}
      {state.status === "error" && (
        <div className="text-red-600 text-sm">評估失敗：{state.message}</div>
      )}
    </div>
  );
}