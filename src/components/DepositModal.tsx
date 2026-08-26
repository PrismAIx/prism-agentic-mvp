import React from 'react';
import { Sheet, sheetPress } from './Sheet';

interface DepositModalProps { open: boolean; onClose: () => void; }

export const DepositModal: React.FC<DepositModalProps> = ({ open, onClose }) => (
  <Sheet open={open} onClose={onClose}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 600 }}>Public preview</div>
      <button type="button" aria-label="Close funding preview" onClick={onClose} {...sheetPress(0.92)} style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>×</button>
    </div>
    <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 14, padding: '16px 14px', color: 'var(--text-2)', lineHeight: 1.5 }}>
      <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Funding disabled</div>
      This static demonstration does not accept deposits or connect to payment services.
    </div>
  </Sheet>
);
