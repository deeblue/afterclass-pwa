import { useState } from "react";
import type { Item } from "../../types";
import { api, type RawAnswer, type PostAttemptSubmitResponse } from "../../api/client";

type EvalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: PostAttemptSubmitResponse }
  | { status: "error"; message: string };

/** 將 UI 的 truefalse 轉成後端的 single；其他型別原樣回傳 */
function toOutboundRawAnswer(item: Item, uiValue: any): RawAnswer | null {
  if (!uiValue) return null;
  // 若 UI 值是 truefalse（QuestionCard 以 true/false 呈現），轉成 single
  if ((item.item_type === "truefalse" || uiValue?.kind === "truefalse")) {
    const idx = typeof uiValue?.index === "number" ? uiValue.index : 0;
    return { kind: "single", index: idx } as RawAnswer;
  }
  return uiValue as RawAnswer;
}

export default function ProcessEvaluate({
  item,
  answerValue,
  userId = "anon",
}: {
  item: Item;
  /** QuestionCard 收集到的答案物件（可能含 work: { json, png } 與你自定的步驟） */
  answerValue: any;
  userId?: string;
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

      // 組成可讀的 process_json（若沒有圖片時會用它）
      const process_json = {
        notes: noteLines,          // 你手動描述的計算步驟
        sketch_paths: sketchJson,  // 手寫筆跡（含時間戳）
        meta: {
          item_type: item.item_type,
          has_work_png: !!answerValue?.work?.png,
        },
      };

      // 盡量把目前答案也帶上（讓後端一起落 attempt）
      const raw_answer = toOutboundRawAnswer(item, answerValue);

      // 若有白板圖，就走 vision；否則走文字 steps
      const payload: any = {
        item_id: item.id,
        user_id: userId || "anon",
        raw_answer,                          // 可為 null；後端允許
        evaluate_steps: true,                // 觸發「可選」步驟評估
        stem: item.stem,
        solution: item.solution ?? "",
        policy: { strong: prefStrong },
      };

      if (typeof answerValue?.work?.png === "string" && answerValue.work.png.startsWith("data:image/")) {
        payload.workpad_image_data_url = answerValue.work.png; // 影像評估
      } else {
        payload.process_json = process_json; // 文字評估
      }

      const resp = await api.postAttemptSubmit(payload);
      setState({ status: "done", data: resp });
    } catch (e: any) {
      setState({ status: "error", message: String(e?.message || e) });
    }
  };

  return (
    <div className="mt-6 rounded-2xl border p-4 bg-slate-50 space-y-3">
      <div className="font-semibold">計算過程評估（可選）</div>
      <p className="text-sm text-slate-600">
        先在上面的手寫板按「儲存筆跡」，再於此輸入每一步的說明（每行一個步驟）。點「送出評估」後，系統會以文字或白板影像進行評估。
      </p>

      <textarea
        className="w-full min-h-28 rounded-lg border px-3 py-2"
        placeholder={"例：\n1) 通分為 6\n2) 1/2 = 3/6\n3) 1/3 = 2/6\n4) 相加為 5/6"}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
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
        <div className="rounded-lg border bg-white p-3 space-y-2">
          {"correct" in state.data && (
            <div className="text-sm">
              答案判定：{state.data.correct ? "✅ 正確" : "❌ 錯誤"}
            </div>
          )}
          {state.data.step_eval ? (
            <>
              <div className="text-sm text-slate-600">步驟評估結果：</div>
              <pre className="mt-1 text-sm whitespace-pre-wrap break-words">
{JSON.stringify(state.data.step_eval, null, 2)}
              </pre>
            </>
          ) : (
            <div className="text-sm text-slate-600">已提交，但沒有回傳步驟評估結果。</div>
          )}
        </div>
      )}

      {state.status === "error" && (
        <div className="text-red-600 text-sm">評估失敗：{state.message}</div>
      )}
    </div>
  );
}
