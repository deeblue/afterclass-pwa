import { useEffect, useMemo, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import { api } from "../api/client";
import type { Item } from "../types";

type ItemType =
  | "single" | "multiple" | "numeric" | "text"
  | "cloze" | "ordering" | "matching" | "tablefill" | "truefalse";

export default function AdminImport() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ocrText, setOcrText] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // 基本欄位
  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("g7");
  const [unit, setUnit] = useState("");
  const [kcs, setKcs] = useState<string>(""); // 以逗號或空白分隔，送出前會轉陣列
  const [tags, setTags] = useState<string>("");
  const [difficulty, setDifficulty] = useState(0.5);
  const [itemType, setItemType] = useState<ItemType>("single");
  const [stem, setStem] = useState("");
  const [solution, setSolution] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");

  // 題型專屬欄位（簡化 UI）
  const [choices, setChoices] = useState<string[]>(["", "", "", ""]); // single/multiple
  const [answerSingle, setAnswerSingle] = useState<number>(0);
  const [answerMultiple, setAnswerMultiple] = useState<number[]>([]);
  const [answerNumeric, setAnswerNumeric] = useState<string>(""); // 可輸入 3/4 或 0.75
  const [answerNumericTol, setAnswerNumericTol] = useState<string>("0");
  const [answerText, setAnswerText] = useState<string>(""); // 多個同義以 ; 分隔
  const [answerTrueFalse, setAnswerTrueFalse] = useState<boolean>(true);

  // matching：左、右清單文字（用換行分隔）
  const [matchLeft, setMatchLeft] = useState<string>("");
  const [matchRight, setMatchRight] = useState<string>("");
  // tablefill：用 JSON 直接貼（或用簡單表格編輯器，這裡先用 JSON）
  const [tableCellsJson, setTableCellsJson] = useState<string>("[[\"\",\"\"],[\"\",\"\"]]");

  // 當上傳圖片時，產生預覽
  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ""));
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  async function doOCR() {
    if (!imageFile) return;
    setBusy(true);
    setMsg("OCR 進行中…");
    try {
      const worker = await createWorker({
        // 你也可以指定 lang 路徑、workerPath 等；預設 CDN 亦可
        logger: m => { /* console.log(m) */ }
      });

        await worker.loadLanguage("chi_tra+eng");
        await worker.initialize("chi_tra+eng");
      // 如果你要中英文：await worker.loadLanguages("chi_tra+eng"); await worker.initialize("chi_tra+eng");

      const { data } = await worker.recognize(imageFile);
      await worker.terminate();

      setOcrText(data.text || "");
      setMsg("OCR 完成，請檢查文字並填寫題目欄位。");
    } catch (e:any) {
      console.error(e);
      setMsg(`OCR 失敗：${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  // 組裝 choices / answer（依題型）
  const computedPayload = useMemo(() => {
    let choicesJson: any = null;
    let answerJson: any = null;

    switch (itemType) {
      case "single":
        choicesJson = { kind: "single", options: choices };
        answerJson  = { kind: "single", index: answerSingle };
        break;
      case "multiple":
        choicesJson = { kind: "multiple", options: choices };
        answerJson  = { kind: "multiple", indices: answerMultiple };
        break;
      case "numeric":
        choicesJson = null;
        answerJson  = { kind: "numeric", value: String(answerNumeric), tolerance: String(answerNumericTol || "0") };
        break;
      case "text":
        choicesJson = null;
        answerJson  = { kind: "text", accept: String(answerText || "").split(";").map(s=>s.trim()).filter(Boolean) };
        break;
      case "truefalse":
        choicesJson = { kind: "truefalse", options: ["True","False"] };
        answerJson  = { kind: "single", index: answerTrueFalse ? 0 : 1 };
        break;
      case "matching": {
        const leftArr = matchLeft.split("\n").map(s=>s.trim()).filter(Boolean);
        const rightArr = matchRight.split("\n").map(s=>s.trim()).filter(Boolean);
        choicesJson = { kind: "matching", left: leftArr, right: rightArr };
        // 預設「1 對 1 同索引」
        const pairs = leftArr.map((l, i) => [l, rightArr[i] ?? ""] as [string,string]);
        answerJson  = { kind: "matching", pairs };
        break;
      }
      case "ordering":
        choicesJson = { kind: "ordering", options: choices };
        answerJson  = { kind: "ordering", order: choices.map((_,i)=>i) };
        break;
      case "cloze":
        // 先以全手動：在 stem 使用 [____] 當空格，答案以 ; 分隔
        choicesJson = null;
        answerJson  = { kind: "cloze", blanks: (answerText || "").split(";").map(s=>s.trim()).filter(Boolean) };
        break;
      case "tablefill":
        try {
          const cells = JSON.parse(tableCellsJson);
          choicesJson = { kind: "tablefill", shape: [cells.length, cells[0]?.length ?? 0] };
          answerJson  = { kind: "tablefill", cells };
        } catch {
          choicesJson = null;
          answerJson = null;
        }
        break;
    }

    const payload = {
      item_type: itemType,
      stem,
      subject,
      grade,
      unit,
      difficulty,
      kcs: (kcs || "").split(/[, \n]/).map(s=>s.trim()).filter(Boolean),
      tags: (tags || "").split(/[, \n]/).map(s=>s.trim()).filter(Boolean),
      choices: choicesJson,
      answer: answerJson,
      solution,
      status
    };

    return payload;
  }, [
    itemType, stem, subject, grade, unit, difficulty,
    kcs, tags, choices, answerSingle, answerMultiple,
    answerNumeric, answerNumericTol, answerText,
    matchLeft, matchRight, tableCellsJson, solution, status
  ]);

  async function handleSubmit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await api.postItem(computedPayload as any);
      setMsg(`建立成功：${res.id}`);
      // 清理最基本內容（可選）
      // setStem(""); setOcrText(""); ...
    } catch (e:any) {
      setMsg(`建立失敗：${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">題目匯入（截圖→OCR→校正→送出）</h1>

      {/* 截圖上傳 + 預覽 + OCR */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="p-3 border rounded">
          <div className="text-sm font-medium mb-2">上傳截圖（僅用於本機 OCR，不會上傳保存）</div>
          <input
            type="file"
            accept="image/*"
            onChange={e=>setImageFile(e.target.files?.[0] ?? null)}
          />
          {imagePreview && (
            <div className="mt-3">
              <img src={imagePreview} alt="preview" className="max-h-64 rounded border" />
            </div>
          )}
          <button
            className="mt-3 px-3 py-1 rounded border disabled:opacity-50"
            disabled={!imageFile || busy}
            onClick={doOCR}
          >
            執行 OCR
          </button>
          {ocrText && (
            <textarea
              className="mt-3 w-full h-40 p-2 border rounded font-mono text-sm"
              value={ocrText}
              onChange={e=>setOcrText(e.target.value)}
              placeholder="OCR 結果文字（可手動修改）"
            />
          )}
        </div>

        <div className="p-3 border rounded space-y-2">
          <div className="text-sm font-medium">題幹（可貼上 OCR 結果）</div>
          <textarea
            className="w-full h-40 p-2 border rounded"
            value={stem}
            onChange={e=>setStem(e.target.value)}
            placeholder="輸入題幹（可從左側 OCR 結果複製貼上）"
          />
          <div className="text-xs text-slate-500">
            若是填空題（cloze），可在題幹以 [____] 表示一個空格。
          </div>
        </div>
      </section>

      {/* 基本欄位 */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="p-3 border rounded space-y-2">
          <label className="block text-sm">科目</label>
          <input className="w-full border rounded p-1" value={subject} onChange={e=>setSubject(e.target.value)} />
          <label className="block text-sm">年級</label>
          <input className="w-full border rounded p-1" value={grade} onChange={e=>setGrade(e.target.value)} />
          <label className="block text-sm">單元</label>
          <input className="w-full border rounded p-1" value={unit} onChange={e=>setUnit(e.target.value)} />
        </div>

        <div className="p-3 border rounded space-y-2">
          <label className="block text-sm">知識點 (kcs)（以逗號或空白分隔）</label>
          <input className="w-full border rounded p-1" value={kcs} onChange={e=>setKcs(e.target.value)} />
          <label className="block text-sm">Tags（以逗號或空白分隔）</label>
          <input className="w-full border rounded p-1" value={tags} onChange={e=>setTags(e.target.value)} />
          <label className="block text-sm">難度（0~1）</label>
          <input type="number" step="0.1" min="0" max="1" className="w-full border rounded p-1"
            value={difficulty} onChange={e=>setDifficulty(parseFloat(e.target.value || "0.5"))} />
        </div>

        <div className="p-3 border rounded space-y-2">
          <label className="block text-sm">題型</label>
          <select className="w-full border rounded p-1" value={itemType} onChange={e=>setItemType(e.target.value as ItemType)}>
            <option value="single">單選</option>
            <option value="multiple">複選</option>
            <option value="truefalse">判斷</option>
            <option value="numeric">數值</option>
            <option value="text">簡答（文字）</option>
            <option value="cloze">填空（cloze）</option>
            <option value="ordering">排序</option>
            <option value="matching">配對</option>
            <option value="tablefill">表格填空</option>
          </select>

          <label className="block text-sm">狀態</label>
          <select className="w-full border rounded p-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
        </div>
      </section>

      {/* 題型專區 */}
      <section className="p-3 border rounded space-y-3">
        <div className="text-sm font-medium">題型細節</div>

        {["single","multiple","ordering"].includes(itemType) && (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">選項</div>
              {choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <input
                    className="flex-1 border rounded p-1"
                    placeholder={`選項 ${i+1}`}
                    value={c}
                    onChange={e=>{
                      const cp = [...choices];
                      cp[i] = e.target.value;
                      setChoices(cp);
                    }}
                  />
                </div>
              ))}
              <button className="mt-1 px-2 py-1 border rounded" onClick={()=>setChoices([...choices,""])}>
                + 新增選項
              </button>
            </div>

            <div>
              {itemType === "single" && (
                <>
                  <div className="text-xs text-slate-500 mb-1">正解（單選）</div>
                  <select className="border rounded p-1" value={answerSingle} onChange={e=>setAnswerSingle(parseInt(e.target.value))}>
                    {choices.map((_,i)=><option key={i} value={i}>選項 {i+1}</option>)}
                  </select>
                </>
              )}
              {itemType === "multiple" && (
                <>
                  <div className="text-xs text-slate-500 mb-1">正解（複選，按住 Ctrl/⌘ 多選）</div>
                  <select multiple className="border rounded p-1 w-full h-28"
                    value={answerMultiple.map(String)}
                    onChange={e=>{
                      const arr = Array.from(e.target.selectedOptions).map(opt=>parseInt(opt.value));
                      setAnswerMultiple(arr);
                    }}>
                    {choices.map((_,i)=><option key={i} value={i}>選項 {i+1}</option>)}
                  </select>
                </>
              )}
              {itemType === "ordering" && (
                <div className="text-xs text-slate-500">
                  預設正解為原順序（0..n-1）。若需客製，稍後可在維護頁再改。
                </div>
              )}
            </div>
          </div>
        )}

        {itemType === "truefalse" && (
          <div className="space-x-3">
            <label className="inline-flex items-center gap-1">
              <input type="radio" checked={answerTrueFalse === true} onChange={()=>setAnswerTrueFalse(true)} />
              <span>True</span>
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="radio" checked={answerTrueFalse === false} onChange={()=>setAnswerTrueFalse(false)} />
              <span>False</span>
            </label>
          </div>
        )}

        {itemType === "numeric" && (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">正解（可用分數 3/4 或小數 0.75）</div>
              <input className="w-full border rounded p-1" value={answerNumeric} onChange={e=>setAnswerNumeric(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">容差（Tolerance）</div>
              <input type="number" className="w-full border rounded p-1" value={answerNumericTol}
                onChange={e=>setAnswerNumericTol(e.target.value)} />
            </div>
          </div>
        )}

        {itemType === "text" && (
          <div>
            <div className="text-xs text-slate-500 mb-1">可接受答案（以 ; 分隔同義字）</div>
            <input className="w-full border rounded p-1" value={answerText} onChange={e=>setAnswerText(e.target.value)} />
          </div>
        )}

        {itemType === "matching" && (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">左側選項（每行一個）</div>
              <textarea className="w-full h-28 border rounded p-1" value={matchLeft} onChange={e=>setMatchLeft(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">右側選項（每行一個）</div>
              <textarea className="w-full h-28 border rounded p-1" value={matchRight} onChange={e=>setMatchRight(e.target.value)} />
            </div>
          </div>
        )}

        {itemType === "cloze" && (
          <div>
            <div className="text-xs text-slate-500 mb-1">填空正解（以 ; 分隔，依題幹 [____] 順序）</div>
            <input className="w-full border rounded p-1" value={answerText} onChange={e=>setAnswerText(e.target.value)} />
          </div>
        )}

        {itemType === "tablefill" && (
          <div>
            <div className="text-xs text-slate-500 mb-1">表格答案 cells（JSON，例如 [[\"1\",\"2\"],[\"3\",\"4\"]]）</div>
            <textarea className="w-full h-28 border rounded p-1 font-mono"
              value={tableCellsJson} onChange={e=>setTableCellsJson(e.target.value)} />
          </div>
        )}
      </section>

      {/* 解析/解答 */}
      <section className="p-3 border rounded space-y-2">
        <div className="text-sm font-medium">參考解</div>
        <textarea className="w-full h-28 border rounded p-2" value={solution} onChange={e=>setSolution(e.target.value)} />
      </section>

      {/* 預覽 + 送出 */}
      <section className="p-3 border rounded space-y-3">
        <div className="text-sm font-medium">送出預覽 Payload</div>
        <pre className="text-xs bg-slate-50 border rounded p-2 overflow-auto">
{JSON.stringify(computedPayload, null, 2)}
        </pre>
        <button
          className="px-4 py-2 rounded border bg-white hover:bg-slate-100 disabled:opacity-50"
          disabled={busy || !stem}
          onClick={handleSubmit}
        >
          {busy ? "建立中…" : "建立題目"}
        </button>
        {msg && <div className="text-sm mt-1">{msg}</div>}
      </section>
    </div>
  );
}
