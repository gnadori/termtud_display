import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from './components/admin/AdminPage';
import { DisplayPage } from './components/display/DisplayPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DisplayPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
