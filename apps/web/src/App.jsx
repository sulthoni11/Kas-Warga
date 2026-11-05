import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Admin from './pages/Admin.jsx';
import PublicDashboard from './pages/PublicDashboard.jsx';
import CaraBayar from './pages/CaraBayar.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/s/:token" element={<PublicDashboard />} />
      <Route path="/s" element={<CaraBayar />} />
      <Route path="/bayar" element={<CaraBayar />} />
      <Route path="*" element={<Landing note="Halaman tidak ditemukan." />} />
    </Routes>
  );
}
