import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type SettingsLoadingSkeletonProps = {
  isMobile: boolean
}

export function NotificationTogglesSkeleton({ isMobile }: SettingsLoadingSkeletonProps) {
  return (
    <div aria-label="Carregando preferências de notificações" style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40% 20% 20% 20%',
          alignItems: 'center',
          padding: '12px 16px'
        }}
      >
        <span />
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} style={{ display: 'flex', justifyContent: 'center' }}>
            <Skeleton width={isMobile ? 42 : 52} height={12} borderRadius={5} />
          </span>
        ))}
      </div>

      {Array.from({ length: 6 }, (_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: '40% 20% 20% 20%',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: rowIndex === 5 ? 'none' : '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {!isMobile ? <Skeleton circle width={20} height={20} /> : null}
            <span style={{ display: 'block', width: rowIndex % 2 === 0 ? '72%' : '88%' }}>
              <Skeleton height={14} borderRadius={6} />
            </span>
          </div>
          {Array.from({ length: 3 }, (_, columnIndex) => (
            <span key={columnIndex} style={{ display: 'flex', justifyContent: 'center' }}>
              <Skeleton width={34} height={20} borderRadius={999} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function MessageShortcutsSkeleton() {
  return (
    <div aria-label="Carregando atalhos do chat" style={{ padding: '12px 16px' }}>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr auto auto',
              alignItems: 'center',
              gap: 8,
              padding: '12px 0'
            }}
          >
            <Skeleton width="64%" height={14} borderRadius={6} />
            <Skeleton width={index % 2 === 0 ? '88%' : '70%'} height={14} borderRadius={6} />
            <Skeleton circle width={18} height={18} />
            <Skeleton circle width={18} height={18} />
          </div>
          {index < 2 ? <div style={{ height: 1, background: '#e5e7eb' }} /> : null}
        </div>
      ))}
    </div>
  )
}
