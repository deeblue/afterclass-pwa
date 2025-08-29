import { NavLink } from "react-router-dom";
import Container from "./Container";
// 若專案已安裝 lucide-react，可打開圖示（沒有也可移除）
// import { PencilLine, FileSpreadsheet, Settings as SettingsIcon, Home as HomeIcon } from "lucide-react";

function navCx(isActive: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm md:text-base",
    isActive
      ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
      : "text-gray-700 hover:bg-gray-50"
  ].join(" ");
}

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <Container className="flex items-center gap-3 py-3">
        {/* 品牌區 */}
        <NavLink to="/" className="shrink-0 font-extrabold text-xl tracking-wide">
          AfterClass
        </NavLink>

        {/* 導覽 */}
        <nav className="ml-2 flex items-center gap-1 md:gap-2">
          <NavLink to="/" className={({ isActive }) => navCx(isActive)} end>
            {/* <HomeIcon className="mr-1 inline-block h-4 w-4" /> */}
            首頁
          </NavLink>
          <NavLink to="/quiz" className={({ isActive }) => navCx(isActive)}>
            {/* <PencilLine className="mr-1 inline-block h-4 w-4" /> */}
            測驗
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => navCx(isActive)}>
            {/* <FileSpreadsheet className="mr-1 inline-block h-4 w-4" /> */}
            複習
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => navCx(isActive)}>
            {/* <SettingsIcon className="mr-1 inline-block h-4 w-4" /> */}
            設定
          </NavLink>
          <NavLink to="/admin/import" className={({ isActive }) => navCx(isActive)}>
            {/* <SettingsIcon className="mr-1 inline-block h-4 w-4" /> */}
            題庫匯入（Admin）
          </NavLink>
        </nav>

        {/* 右側可放占位（登入、狀態、使用者） */}
        <div className="ml-auto text-xs text-gray-500 hidden sm:block">
          {/* 需要時可顯示版本/環境資訊 */}
        </div>
      </Container>
    </header>
  );
}
