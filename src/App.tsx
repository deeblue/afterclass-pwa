import { Link, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Settings from './pages/Settings'
import Review from './pages/Review'

export default function App() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <nav className="max-w-5xl mx-auto px-4 py-3 flex gap-4">
          <Link to="/" className="font-bold">AfterClass</Link>
          <Link to="/quiz" className="text-sky-700">測驗</Link>
          <Link to="/review">複習</Link>
          <Link to="/settings">設定</Link>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/review" element={<Review />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}