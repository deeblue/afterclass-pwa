import { Routes, Route } from "react-router-dom";
import AppHeader from "./components/layout/AppHeader";
import Container from "./components/layout/Container";
import Footer from './components/layout/Footer'
import AdminImport from "./pages/AdminImport";

import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Review from "./pages/Review";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <AppHeader />
      <main className="py-6 md:py-8">
        <Container>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/review" element={<Review />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/import" element={<AdminImport />} />
          </Routes>
        </Container>
      </main>
      <Footer />
    </div>
  );
}


