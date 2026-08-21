import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── Design Tokens ─────────────────────────────────────────────────────────────
export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryHover: '#1E40AF',
  success: '#16A34A',
  successLight: '#F0FDF4',
  successDark: '#15803D',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningDark: '#B45309',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  errorDark: '#B91C1C',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
  shadowLg: '0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)',
  radius: '8px',
  radiusLg: '12px',
};

// ── Toast Context ─────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, variant = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, variant, duration }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: colors.white, borderLeft: `4px solid ${variantColors[toast.variant] || colors.primary}`,
            borderRadius: colors.radius, boxShadow: colors.shadowLg, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: colors.gray800,
            animation: 'slideIn 0.2s ease-out',
          }}>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: colors.gray400, fontSize: 18, lineHeight: 1,
            }}>x</button>
          </div>
        ))}
        <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const variantColors = {
  success: colors.success, warning: colors.warning, error: colors.error, info: colors.primary,
};

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', style = {}, loading, icon, fullWidth }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontFamily: colors.fontFamily, fontWeight: 500, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: colors.radius, transition: 'all 0.15s ease',
    opacity: disabled ? 0.6 : 1, textDecoration: 'none', whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
  };
  const sizes = {
    sm: { padding: '5px 12px', fontSize: 13 },
    md: { padding: '9px 18px', fontSize: 14 },
    lg: { padding: '11px 24px', fontSize: 15 },
  };
  const variants = {
    primary: { background: colors.primary, color: colors.white },
    secondary: { background: colors.gray100, color: colors.gray700, border: `1px solid ${colors.gray200}` },
    danger: { background: colors.error, color: colors.white },
    ghost: { background: 'transparent', color: colors.primary },
    success: { background: colors.success, color: colors.white },
    outline: { background: 'transparent', color: colors.primary, border: `1.5px solid ${colors.primary}` },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...v, ...style }}
      onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.opacity = 0.85; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? 0.6 : 1; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {loading ? <Spinner size={14} /> : null}
      {icon ? <span>{icon}</span> : null}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export const Card = React.forwardRef(function Card({ children, style = {}, padding = '24px', hover = false, onClick }, ref) {
  return (
    <div ref={ref} onClick={onClick} style={{
      background: colors.white, borderRadius: colors.radiusLg,
      border: `1px solid ${colors.gray200}`, padding,
      boxShadow: hover ? colors.shadowMd : colors.shadow,
      transition: hover ? 'all 0.2s ease' : undefined,
      cursor: onClick ? 'pointer' : undefined,
      ...style
    }}
      onMouseEnter={hover ? e => { e.currentTarget.style.boxShadow = colors.shadowLg; e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
      onMouseLeave={hover ? e => { e.currentTarget.style.boxShadow = colors.shadow; e.currentTarget.style.transform = 'translateY(0)'; } : undefined}
    >
      {children}
    </div>
  );
});

// ── Alert ─────────────────────────────────────────────────────────────────────

export function Alert({ children, variant = 'info', title, style = {}, dismissible, onDismiss }) {
  const variantStyles = {
    info: { bg: colors.primaryLight, border: colors.primary, text: colors.primaryDark },
    success: { bg: colors.successLight, border: colors.success, text: colors.successDark },
    warning: { bg: colors.warningLight, border: colors.warning, text: colors.warningDark },
    error: { bg: colors.errorLight, border: colors.error, text: colors.errorDark },
  };
  const s = variantStyles[variant] || variantStyles.info;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: colors.radius,
      padding: '12px 16px', color: s.text, fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
      ...style
    }}>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>}
        {children}
      </div>
      {dismissible && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, fontSize: 18, lineHeight: 1, opacity: 0.6 }}>x</button>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({ children, variant = 'default', style = {}, dot = false }) {
  const variants = {
    default: { bg: colors.gray100, color: colors.gray700, dot: colors.gray400 },
    success: { bg: colors.successLight, color: colors.successDark, dot: colors.success },
    warning: { bg: colors.warningLight, color: colors.warningDark, dot: colors.warning },
    error: { bg: colors.errorLight, color: colors.errorDark, dot: colors.error },
    info: { bg: colors.primaryLight, color: colors.primaryDark, dot: colors.primary },
    purple: { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED' },
  };
  const s = variants[variant] || variants.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: dot ? 4 : 0,
      padding: dot ? '2px 10px' : '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500, background: s.bg, color: s.color,
      lineHeight: '1.5', ...style
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />}
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, color = colors.primary }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid ${colors.gray200}`,
      borderTop: `2px solid ${color}`, borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 16, style = {} }) {
  return (
    <div style={{
      width, height, background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
      backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite',
      ...style
    }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <div style={{ marginBottom: 16 }}><Skeleton height={20} width="60%" /></div>
      <Skeleton height={28} width="40%" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="30%" />
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div style={{ padding: '0 24px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: `1px solid ${colors.gray100}` }}>
          <Skeleton width={60} height={14} />
          <Skeleton width={120} height={14} />
          <Skeleton width={100} height={14} />
          <Skeleton width={80} height={20} />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ title, description, icon = '📭', action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: colors.gray500 }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, color: colors.gray700 }}>{title}</h3>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: colors.gray500, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>{description}</p>
      {action}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({ label, error, hint, style = {}, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.gray700, marginBottom: 6 }}>{label}</label>}
      <input
        style={{
          width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: colors.radius,
          border: `1px solid ${error ? colors.error : colors.gray300}`,
          outline: 'none', fontFamily: colors.fontFamily, background: colors.white,
          color: colors.gray900, boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
          ...style
        }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? colors.error : colors.primary; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? colors.error : colors.gray300; }}
        {...props}
      />
      {hint && !error && <p style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({ label, error, children, style = {}, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.gray700, marginBottom: 6 }}>{label}</label>}
      <select
        style={{
          width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: colors.radius,
          border: `1px solid ${error ? colors.error : colors.gray300}`,
          outline: 'none', fontFamily: colors.fontFamily, background: colors.white,
          color: colors.gray900, ...style
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export function Textarea({ label, error, hint, style = {}, rows = 4, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.gray700, marginBottom: 6 }}>{label}</label>}
      <textarea
        rows={rows}
        style={{
          width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: colors.radius,
          border: `1px solid ${error ? colors.error : colors.gray300}`,
          outline: 'none', fontFamily: colors.fontFamily, background: colors.white,
          color: colors.gray900, resize: 'vertical', boxSizing: 'border-box',
          ...style
        }}
        {...props}
      />
      {hint && !error && <p style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div style={{
      background: colors.white, borderBottom: `1px solid ${colors.gray200}`,
      padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        {breadcrumb && (
          <div style={{ fontSize: 13, color: colors.gray500, marginBottom: 4 }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i}>
                {i > 0 && <span style={{ margin: '0 6px', color: colors.gray300 }}>/</span>}
                <span style={crumb.active ? { color: colors.gray700, fontWeight: 500 } : undefined}>{crumb.label}</span>
              </span>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.gray900 }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 14, color: colors.gray500 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{action}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, color = colors.primary, icon, trend, loading }) {
  return (
    <Card style={{ textAlign: 'left', padding: '20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {icon && <div style={{ fontSize: 24, opacity: 0.8 }}>{icon}</div>}
        {trend !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 500, color: trend >= 0 ? colors.success : colors.error, background: trend >= 0 ? colors.successLight : colors.errorLight, padding: '2px 8px', borderRadius: 4 }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton height={28} width="50%" />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 500, color: colors.gray700 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: colors.gray500 }}>{sub}</div>}
    </Card>
  );
}

// ── File Upload ───────────────────────────────────────────────────────────────

export function FileUpload({ label, accept, onChange, file, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.gray700, marginBottom: 6 }}>{label}</label>}
      <div style={{
        border: `2px dashed ${error ? colors.error : colors.gray300}`, borderRadius: colors.radius,
        padding: '20px', textAlign: 'center', cursor: 'pointer',
        background: file ? colors.successLight : colors.gray50,
        transition: 'border-color 0.15s ease',
      }}>
        <input type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} id={`file-${label}`} />
        <label htmlFor={`file-${label}`} style={{ cursor: 'pointer', fontSize: 14, color: colors.gray500 }}>
          {file ? (
            <span style={{ color: colors.success, fontWeight: 500 }}>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
          ) : (
            <span>Click to upload PDF <span style={{ color: colors.gray300 }}>(max 200MB)</span></span>
          )}
        </label>
      </div>
      {error && <p style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Status Badge Helper ───────────────────────────────────────────────────────

export function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const map = {
    'ready': 'success', 'validated': 'info', 'setup': 'default',
    'error': 'error', 'failed': 'error', 'fulfillment error': 'error',
    'sent to print': 'info', 'submitted': 'info', 'created': 'info',
    'in production': 'info', 'shipped': 'success', 'delivered': 'success',
    'cancelled': 'default', 'pending': 'warning', 'pending approval': 'warning',
    'sample ordered': 'warning', 'sample shipped': 'info', 'sample delivered': 'success',
    'approved': 'success', 'normalizing': 'info',
  };
  return <Badge variant={map[s] || 'default'} dot>{status || 'Unknown'}</Badge>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 400, md: 560, lg: 720, xl: 900 };
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: colors.white, borderRadius: colors.radiusLg, width: '100%',
        maxWidth: sizes[size] || sizes.md, maxHeight: '85vh', overflow: 'auto',
        boxShadow: colors.shadowLg, animation: 'slideUp 0.2s ease-out',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: `1px solid ${colors.gray200}`,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: colors.gray900 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: colors.gray500, lineHeight: 1,
          }}>x</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

export function ProgressBar({ value, max = 100, color = colors.primary, height = 6, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>{label}</div>}
      <div style={{ background: colors.gray100, borderRadius: 999, height, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

export function Tooltip({ children, text }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={e => { const tip = e.currentTarget.querySelector('.tooltip-box'); if (tip) tip.style.opacity = 1; }}
      onMouseLeave={e => { const tip = e.currentTarget.querySelector('.tooltip-box'); if (tip) tip.style.opacity = 0; }}
    >
      {children}
      <span className="tooltip-box" style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6,
        background: colors.gray900, color: colors.white, fontSize: 12, padding: '6px 10px',
        borderRadius: 6, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 0.15s ease',
        pointerEvents: 'none', zIndex: 100,
      }}>{text}</span>
    </span>
  );
}

// ── Table Component ───────────────────────────────────────────────────────────

export function DataTable({ columns, data, emptyMessage = 'No data available', onRowClick, sortable, sortField, sortDir, onSort }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No data" description={emptyMessage} />;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} onClick={sortable && col.sortable !== false ? () => onSort?.(col.key) : undefined}
                style={{
                  textAlign: col.align || 'left', padding: '10px 16px', borderBottom: `2px solid ${colors.gray200}`,
                  color: colors.gray600, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: sortable && col.sortable !== false ? 'pointer' : undefined, whiteSpace: 'nowrap',
                  background: colors.gray50,
                }}
              >
                {col.label}
                {sortable && col.key === sortField && (
                  <span style={{ marginLeft: 4 }}>{sortDir === 'desc' ? '▼' : '▲'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: `1px solid ${colors.gray100}`, cursor: onRowClick ? 'pointer' : undefined,
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = colors.gray50; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {columns.map((col, j) => (
                <td key={j} style={{
                  padding: '12px 16px', color: colors.gray800, textAlign: col.align || 'left',
                  borderBottom: `1px solid ${colors.gray100}`,
                }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${colors.gray200}`, marginBottom: 24 }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={{
          padding: '10px 18px', fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400,
          color: activeTab === tab.key ? colors.primary : colors.gray500,
          background: 'none', border: 'none', borderBottom: activeTab === tab.key ? `2px solid ${colors.primary}` : '2px solid transparent',
          cursor: 'pointer', marginBottom: -2, fontFamily: colors.fontFamily,
          transition: 'all 0.15s ease',
        }}>{tab.label}</button>
      ))}
    </div>
  );
}
