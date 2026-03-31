import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LogsPage from './pages/LogsPage';
import AlertsPage from './pages/AlertsPage';
import IngestPage from './pages/IngestPage';
import AnalysisPage from './pages/AnalysisPage';
import './styles.css';

export default function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/ingest" element={<IngestPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
