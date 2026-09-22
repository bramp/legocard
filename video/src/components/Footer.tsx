import React from 'react';
import { SITE_CONFIG } from '../types';

export const Footer: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 50,
        left: 60,
        right: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 24px',
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <span style={{ fontSize: 22 }}>🧱</span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#e2e8f0',
          }}
        >
          {SITE_CONFIG.domain}
        </span>
      </div>
    </div>
  );
};
