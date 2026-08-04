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
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/book-setup" element={<BookSetupPage />} />
          <Route path="/quote-calculator" element={<QuoteCalculatorPage />} />
          <Route path="/royalty-dashboard" element={<RoyaltyDashboardPage />} />
          <Route path="/lulu-integration" element={<LuluIntegrationPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);
