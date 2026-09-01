import type { CSSProperties } from 'react'

export const getMoneyInputStyle = (isMobile: boolean): CSSProperties => ({
  width: '100%',
  height: isMobile ? 46 : 42,
  border: '1px solid #d7dce4',
  borderRadius: 10,
  padding: '0 14px',
  color: '#111827',
  fontSize: isMobile ? 17 / 1.2 : 14,
  boxSizing: 'border-box',
  background: '#ffffff',
})
