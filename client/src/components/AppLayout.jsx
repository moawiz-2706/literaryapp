import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { colors } from './UI';

const navItems = [
  { path: '/royalty-dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/orders', label: 'Orders', icon: '📦' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/book-setup', label: 'Book Setup', icon: '📚' },
  { path: '/quote-calculator', label: 'Quote Calculator', icon: '🧮' },
  { path: '/lulu-integration', label: 'Lulu Integration', icon: '🔗' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Extract locationId from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('locationId');
    if (id) setLocationId(id);
  }, [location.search]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Responsive check
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // On desktop, sidebar is always visible
  const sidebarVisible = isDesktop || sidebarOpen;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: colors.fontFamily, background: colors.gray50 }}>
      {/* Overlay for mobile */}
      {sidebarOpen && !isDesktop && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 900,
        }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 260, background: colors.gray900, color: colors.white,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 950,
        transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: isDesktop ? '2px 0 8px rgba(0,0,0,0.1)' : 'none',
      }}>
        {/* Logo / Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: colors.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
            }}>L</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>LiteraryApp</div>
              <div style={{ fontSize: 11, color: colors.gray400 }}>Print-on-Demand</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <Link key={item.path} to={`${item.path}?locationId=${locationId}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8, marginBottom: 2,
                fontSize: 14, fontWeight: isActive(item.path) ? 600 : 400,
                color: isActive(item.path) ? colors.white : colors.gray400,
                background: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { if (!isActive(item.path)) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = colors.gray200; } }}
                onMouseLeave={e => { if (!isActive(item.path)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.gray400; } }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: colors.gray500 }}>
          <div>LiteraryApp v2.0</div>
          <div style={{ marginTop: 2 }}>Powered by Lulu &amp; Literary App</div>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: sidebarVisible ? 260 : 0,
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
        width: '100%',
      }}>
        {/* Top Bar */}
        <header style={{
          background: colors.white, borderBottom: `1px solid ${colors.gray200}`,
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'none', border: `1px solid ${colors.gray200}`, borderRadius: 6,
            padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            fontSize: 18, color: colors.gray600,
          }}>
            ☰
          </button>

          <div style={{ flex: 1 }} />

          {locationId && (
            <div style={{ fontSize: 12, color: colors.gray500, background: colors.gray100, padding: '4px 10px', borderRadius: 6 }}>
              Location: {locationId.slice(0, 8)}...
            </div>
          )}
        </header>

        {/* Page Content */}
        <main style={{ padding: isDesktop ? 24 : 16, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
