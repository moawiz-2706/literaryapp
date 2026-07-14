import React from 'react';
import { colors, Card, Alert } from '../components/UI';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: colors.gray50, fontFamily: colors.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <Card style={{ maxWidth: '480px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '700', color: colors.gray200, margin: '0 0 8px' }}>404</h1>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.gray900, margin: '0 0 12px' }}>Page Not Found</h2>
        <p style={{ color: colors.gray500, fontSize: '14px', margin: '0 0 20px' }}>
          This page does not exist. Open this app from your GoHighLevel navigation menu.
        </p>
        <Alert variant="info">
          Available pages: <code>/book-setup</code>, <code>/quote-calculator</code>, <code>/royalty-dashboard</code>
        </Alert>
      </Card>
    </div>
  );
}
