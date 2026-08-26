import React from 'react';
import { useModalFocus } from '../lib/useModalFocus';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

// Shared bottom-sheet shell.
export const Sheet: React.FC<SheetProps> = ({ open, onClose, children, label = 'Prism preview' }) => {
  const dialogRef = useModalFocus(open, onClose);

  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 500 }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          animation: 'fade-in 200ms var(--ease) both',
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#141416', border: '1px solid var(--border)', borderBottom: 'none',
        borderRadius: '24px 24px 0 0', padding: '10px 18px 28px',
        animation: 'sheet-up 320ms var(--ease) both',
        maxHeight: '88%', overflowY: 'auto', scrollbarWidth: 'none',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  );
};

export const sheetPress = (s = 0.97) => ({
  onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = `scale(${s})`; },
  onPointerUp: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; },
  onPointerLeave: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; },
});
