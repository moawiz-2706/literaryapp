import React from 'react';

// ── Design Tokens ─────────────────────────────────────────────────────────────
export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
};

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: colors.fontFamily, fontWeight: '500', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: '8px', transition: 'all 0.15s ease',
    opacity: disabled ? 0.6 : 1, textDecoration: 'none'
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '15px' }
  };
  const variants = {
    primary: { background: colors.primary, color: colors.white },
    secondary: { background: colors.gray100, color: colors.gray700, border: `1px solid ${colors.gray200}` },
    danger: { background: colors.error, color: colors.white },
    ghost: { background: 'transparent', color: colors.primary },
    success: { background: colors.success, color: colors.white }
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: colors.white, borderRadius: '12px',
      border: `1px solid ${colors.gray200}`, padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', ...style
    }}>
      {children}
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ children, variant = 'info', title }) {
  const variantStyles = {
    info: { bg: colors.primaryLight, border: colors.primary, text: colors.primaryDark },
    success: { bg: colors.successLight, border: colors.success, text: colors.success },
    warning: { bg: colors.warningLight, border: colors.warning, text: colors.warning },
    error: { bg: colors.errorLight, border: colors.error, text: colors.error }
  };
  const s = variantStyles[variant] || variantStyles.info;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px',
      padding: '12px 16px', color: s.text, fontSize: '14px'
    }}>
      {title && <div style={{ fontWeight: '600', marginBottom: '4px' }}>{title}</div>}
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: { bg: colors.gray100, color: colors.gray700 },
    success: { bg: colors.successLight, color: colors.success },
    warning: { bg: colors.warningLight, color: colors.warning },
    error: { bg: colors.errorLight, color: colors.error },
    info: { bg: colors.primaryLight, color: colors.primary }
  };
  const s = variants[variant] || variants.default;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '500', background: s.bg, color: s.color
    }}>
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
      animation: 'spin 0.8s linear infinite', display: 'inline-block'
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, hint, style = {}, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: colors.gray700, marginBottom: '6px' }}>{label}</label>}
      <input
        style={{
          width: '100%', padding: '9px 12px', fontSize: '14px', borderRadius: '8px',
          border: `1px solid ${error ? colors.error : colors.gray300}`,
          outline: 'none', fontFamily: colors.fontFamily, background: colors.white,
          color: colors.gray900, ...style
        }}
        {...props}
      />
      {hint && !error && <p style={{ fontSize: '12px', color: colors.gray500, marginTop: '4px' }}>{hint}</p>}
      {error && <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, style = {}, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: colors.gray700, marginBottom: '6px' }}>{label}</label>}
      <select
        style={{
          width: '100%', padding: '9px 12px', fontSize: '14px', borderRadius: '8px',
          border: `1px solid ${error ? colors.error : colors.gray300}`,
          outline: 'none', fontFamily: colors.fontFamily, background: colors.white,
          color: colors.gray900, ...style
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      background: colors.white, borderBottom: `1px solid ${colors.gray200}`,
      padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px'
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: colors.gray900 }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '14px', color: colors.gray500 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = colors.primary }) {
  return (
    <Card style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '28px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: '500', color: colors.gray700, marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: colors.gray500, marginTop: '2px' }}>{sub}</div>}
    </Card>
  );
}

// ── File Upload ───────────────────────────────────────────────────────────────
export function FileUpload({ label, accept, onChange, file, error }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: colors.gray700, marginBottom: '6px' }}>{label}</label>}
      <div style={{
        border: `2px dashed ${error ? colors.error : colors.gray300}`, borderRadius: '8px',
        padding: '20px', textAlign: 'center', cursor: 'pointer',
        background: file ? colors.successLight : colors.gray50
      }}>
        <input type="file" accept={accept} onChange={onChange}
          style={{ display: 'none' }} id={`file-${label}`} />
        <label htmlFor={`file-${label}`} style={{ cursor: 'pointer', fontSize: '14px', color: colors.gray500 }}>
          {file ? (
            <span style={{ color: colors.success, fontWeight: '500' }}>
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </span>
          ) : (
            <span>Click to upload PDF <span style={{ color: colors.gray300 }}>(max 200MB)</span></span>
          )}
        </label>
      </div>
      {error && <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

// ── Status Badge Helper ───────────────────────────────────────────────────────
export function statusBadge(status) {
  const map = {
    'Ready': 'success', 'Validating': 'info', 'Setup': 'default',
    'Error': 'error', 'Sent to Print': 'info', 'In Production': 'info',
    'Shipped': 'success', 'Delivered': 'success', 'Fulfillment Error': 'error',
    'Cancelled': 'default', 'Pending': 'warning',
    'Sample Ordered': 'warning', 'Sample Shipped': 'info',
    'Sample Delivered': 'success', 'Approved': 'success',
    'Validated': 'info', 'Pending Approval': 'warning'
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
}
