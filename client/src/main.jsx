import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookSetupPage from './pages/BookSetupPage';
import QuoteCalculatorPage from './pages/QuoteCalculatorPage';
import RoyaltyDashboardPage from './pages/RoyaltyDashboardPage';
import NotFoundPage from './pages/NotFoundPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/book-setup" element={<BookSetupPage />} />
        <Route path="/quote-calculator" element={<QuoteCalculatorPage />} />
        <Route path="/royalty-dashboard" element={<RoyaltyDashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
