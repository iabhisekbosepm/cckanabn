import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import GlobalBoardPage from './pages/GlobalBoardPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import TodayPage from './pages/TodayPage';
import SettingsPage from './pages/SettingsPage';
import HeatmapPage from './pages/HeatmapPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/global" element={<GlobalBoardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/weekly-report" element={<WeeklyReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/project/:projectId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
