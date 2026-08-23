import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type ContactDetailsSkeletonProps = {
  isMobile: boolean
}

export function ContactDetailsSkeleton({ isMobile }: ContactDetailsSkeletonProps) {
  return (
    <section
      aria-label="Carregando contato"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        padding: isMobile ? '22px 18px 28px' : 24,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <span style={{ display: 'block', width: isMobile ? '58%' : '48%' }}>
          <Skeleton height={isMobile ? 24 : 26} borderRadius={6} />
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Skeleton circle width={30} height={30} />
          <Skeleton circle width={30} height={30} />
          <Skeleton circle width={30} height={30} />
        </div>
      </header>

      {!isMobile ? <div style={{ borderBottom: '1px solid #e5e7eb' }} /> : null}

      <div style={{ display: 'grid', alignContent: 'start', gap: isMobile ? 16 : 18 }}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} style={{ display: 'grid', gap: 8 }}>
            <Skeleton width={index === 1 ? 64 : 54} height={12} borderRadius={6} />
            <Skeleton height={isMobile ? 46 : 42} borderRadius={10} />
          </div>
        ))}
      </div>
    </section>
  )
}
