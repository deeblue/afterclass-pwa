import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { useRef, useState } from "react"; 

export default function Workpad({
  onExport
}: {
  onExport: (json: string, png: string) => void;
}) {
  const ref = useRef<ReactSketchCanvasRef>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [erase, setErase] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (paths: any[]) => {
    setHasStrokes(Array.isArray(paths) && paths.length > 0);
  };

  async function save() {
    if (!ref.current) return;
    if (!hasStrokes) {
      // 沒有筆劃就不要匯出，避免 "No stroke found!" 訊息
      onExport(JSON.stringify([]), "");
      return;
    }
    try {
      setSaving(true);
      const paths = await ref.current.exportPaths();  // 帶時間戳（withTimestamp=true）
      let png = "";
      try {
        png = await ref.current.exportImage("png");
      } catch {
        // 沒有筆劃或其他原因時，exportImage 會丟錯；忽略即可
        png = "";
      }
      onExport(JSON.stringify(paths ?? []), png ?? "");
    } finally {
      setSaving(false);
    }
  }

  function toggleErase() {
    const next = !erase;
    setErase(next);
    // 部分版本需要手動切換 eraseMode
    ref.current?.eraseMode(next);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border">
        <ReactSketchCanvas
          ref={ref}
          className="w-full h-64"
          strokeWidth={3}
          strokeColor="#111"
          canvasColor="#fff"
          withTimestamp
          onChange={handleChange}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={`px-3 py-1 rounded border ${erase ? "bg-amber-50" : "bg-white"}`}
          onClick={toggleErase}
        >
          {erase ? "正在橡皮擦" : "橡皮擦"}
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded border"
          onClick={() => ref.current?.resetCanvas()}
        >
          清除
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded border disabled:opacity-50"
          disabled={!hasStrokes || saving}
          onClick={save}
          title={!hasStrokes ? "目前沒有筆跡可儲存" : "儲存筆跡"}
        >
          {saving ? "儲存中…" : "儲存筆跡"}
        </button>
      </div>
      {!hasStrokes && (
        <div className="text-xs text-gray-500">（提示）先在畫布上寫點東西，才能儲存與評估計算過程。</div>
      )}
    </div>
  );
}