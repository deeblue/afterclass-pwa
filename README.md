AfterClass PWA (Tailwind v4)

React + TypeScript + Vite + Tailwind v4 + PWA。前端部署在 Cloudflare Pages，後端為 Cloudflare Workers（D1/KV）。
串接 API：

GET /api/health

GET /api/items?n=4&random=1

POST /api/attempts/bulk

POST /api/process/eval

1) 開發需求

Node.js 18+（建議 LTS 20）

npm
-（可選）Git：用於推到 GitHub，讓 Pages 自動建置

2) 安裝與本機開發
npm i
cp .env.example .env
# 編輯 .env 指向你的後端 Worker，範例：
# VITE_API_BASE=http://127.0.0.1:8787
# VITE_API_BEARER=dev-secret-123  # 若後端有啟用 Bearer
npm run dev
# → http://localhost:5173


CORS：請在後端 Workers（本機 .dev.vars 或 wrangler.jsonc 中的 vars）將
ALLOW_ORIGIN=http://localhost:5173 加入白名單，否則會被擋。

3) Tailwind v4 說明

已使用 @tailwindcss/vite 外掛（不用 PostCSS/autoprefixer）。

CSS 以 @import "tailwindcss" 引入（不需要 tailwind.config.js）。

若要自訂主題，改寫在 CSS 的 @theme { ... } 中。

檔案重點：

vite.config.ts：已加入 @tailwindcss/vite 與 vite-plugin-pwa

src/index.css：@import "tailwindcss"

4) 打包
npm run build
# 產出 dist/

5) 部署到 Cloudflare Pages
5.1 連接 Repo

將本專案推到 GitHub（或你的 Git 平台）：

git init
git add .
git commit -m "feat: afterclass-pwa v4 init"
git branch -M main
git remote add origin https://github.com/<你的帳號>/afterclass-pwa.git
git push -u origin main


Cloudflare Pages → Create project → 連結此 Repo

5.2 Build 設定

Build command：npm ci && npm run build

Output directory：dist

5.3 Pages 環境變數（Frontend → Backend）

在 Pages 專案「Settings → Environment variables」設定（Build time）：

VITE_API_BASE → 你的 Workers API 網址
例：https://<your-worker>.workers.dev 或自訂網域 https://api.yourdomain.com

VITE_API_BEARER（可選，若後端啟用 Bearer）→ 與 Workers 相同 token

小提醒：Vite 的 import.meta.env.* 變數必須以 VITE_ 開頭才會注入前端程式碼。

5.4 Workers 端 CORS 白名單

在 Workers（production 環境）設定 ALLOW_ORIGIN 包含 Pages 網域，例如：

https://<project>.pages.dev
-（若有自訂前端網域）https://learn.yourdomain.com

部署後端：

wrangler deploy

6) PWA（iPad 安裝）

iPad Safari 開啟你的 Pages 網址 → Share → Add to Home Screen

之後從桌面 Icon 啟動，會以全螢幕（standalone）模式開啟

7) 前後端環境對齊建議

開發（本機）

前端 .env：
VITE_API_BASE=http://127.0.0.1:8787

Workers .dev.vars：
ALLOW_ORIGIN=http://localhost:5173

雲端（Production）

Pages 環境變數：
VITE_API_BASE=https://<your-worker>.workers.dev
VITE_API_BEARER=<若啟用>

Workers vars/secrets：
ALLOW_ORIGIN=https://<project>.pages.dev,https://learn.yourdomain.com

注意：localhost 與 127.0.0.1 是不同 Origin。請與實際前端開發網址完全一致。

8) 測試清單（快速自評）

首頁顯示「後端健康檢查時間」→ /api/health OK

Quiz 看到 4 題（或你設定的題數）→ /api/items OK

交卷成功（或離線提示）→ /api/attempts/bulk OK

PWA 能加入主畫面啟動

9) 常見錯誤與排查

CORS 相關：
確認 Workers ALLOW_ORIGIN 是否包含你的前端 Origin（大小寫/協定/子網域需完全相同）。

VITE_API_BASE 錯誤：
Console 看到 404/502，請檢查網址是否含 /api/...，以及是否指向對的環境（dev / prod）。

部署後 404：
Pages 的 Output directory 必須是 dist；若專案子路徑，請確認沒有多層 dist/dist。

PWA 看不到更新：
vite-plugin-pwa 預設 registerType: 'autoUpdate'，但瀏覽器仍可能有快取。請嘗試重新整理或清除站點資料。

10) 後續擴充（建議）

題型元件補齊（cloze / ordering / matching / tablefill）

InkPad（筆跡 → JSON）並串 /api/process/eval

IndexedDB 佇列（離線補送 attempts）
→ 可加入到 src/store/useQueue.ts（目前範本未內建，若需要可以合併前次版本）

版本化環境（Pages 的 Preview/Production 雙環境），Workers 使用 --env 區分 staging/production

授權

MIT（或依你需要調整）