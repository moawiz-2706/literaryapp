import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/UI';
import BookSetupPage from './pages/BookSetupPage';
import QuoteCalculatorPage from './pages/QuoteCalculatorPage';
import RoyaltyDashboardPage from './pages/RoyaltyDashboardPage';
import LuluIntegrationPage from './pages/LuluIntegrationPage';
import OrdersPage from './pages/OrdersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CRMPipelinesPage from './pages/CRMPipelinesPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import AppInstalledGate from './components/AppInstalledGate';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Every Literary App page validates installation for the
              subaccount/location ID in the URL before rendering. */}
          <Route path="/book-setup" element={<AppInstalledGate><BookSetupPage /></AppInstalledGate>} />
          <Route path="/quote-calculator" element={<AppInstalledGate><QuoteCalculatorPage /></AppInstalledGate>} />
          <Route path="/royalty-dashboard" element={<AppInstalledGate><RoyaltyDashboardPage /></AppInstalledGate>} />
          <Route path="/lulu-integration" element={<AppInstalledGate><LuluIntegrationPage /></AppInstalledGate>} />
          <Route path="/orders" element={<AppInstalledGate><OrdersPage /></AppInstalledGate>} />
          <Route path="/analytics" element={<AppInstalledGate><AnalyticsPage /></AppInstalledGate>} />
          <Route path="/crm-pipelines" element={<AppInstalledGate><CRMPipelinesPage /></AppInstalledGate>} />
          <Route path="/settings" element={<AppInstalledGate><SettingsPage /></AppInstalledGate>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);
