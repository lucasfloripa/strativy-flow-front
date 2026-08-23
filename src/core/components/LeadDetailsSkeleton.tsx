import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type LeadDetailsSkeletonProps = {
  isMobile: boolean
}

export function LeadHeaderSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'block', width: isMobile ? 176 : 240 }}>
        <Skeleton height={22} borderRadius={6} />
      </span>
      <Skeleton circle width={24} height={24} />
    </span>
  )
}

export function LeadActionsSkeleton() {
  return <Skeleton circle width={28} height={28} />
}

export function LeadTabsSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  const tabWidths = isMobile ? [66, 82, 88, 58, 62] : [54, 72, 78, 48, 52]

  return tabWidths.map((width, index) => (
    <span key={index} style={{ display: 'block', width }}>
      <Skeleton height={isMobile ? 38 : 30} borderRadius={isMobile ? 8 : 6} />
    </span>
  ))
}

export function BusinessTabsSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  const tabWidths = isMobile ? [96, 82, 76, 62] : [88, 78, 70, 56]

  return tabWidths.map((width, index) => (
    <span key={index} style={{ display: 'block', width }}>
      <Skeleton height={isMobile ? 38 : 30} borderRadius={isMobile ? 8 : 6} />
    </span>
  ))
}

export function LeadGeneralTabSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  return (
    <section
      aria-label="Carregando informações do lead"
      style={{
        display: 'grid',
        alignContent: 'start',
        gap: 10,
        width: '100%',
        minWidth: 0
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 18,
          padding: isMobile ? '0 4px' : '4px 0'
        }}
      >
        <Skeleton width={isMobile ? 152 : 184} height={18} borderRadius={6} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'minmax(0, 1fr)'
              : 'repeat(2, minmax(0, 1fr))',
            columnGap: 28,
            rowGap: 18
          }}
        >
          {Array.from({ length: isMobile ? 6 : 8 }, (_, index) => (
            <div key={index} style={{ display: 'grid', gap: 7, minWidth: 0 }}>
              <Skeleton width="34%" height={11} borderRadius={6} />
              <Skeleton width={index % 3 === 0 ? '78%' : '58%'} height={15} borderRadius={6} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function BusinessInformationSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  const renderSection = (rows: number, key: string) => (
    <section key={key} style={{ display: 'grid', gap: 8, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Skeleton circle width={15} height={15} />
        <Skeleton width={isMobile ? 112 : 128} height={15} borderRadius={6} />
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb' }}>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: 12,
              minHeight: 42,
              padding: '0 2px',
              borderBottom: index === rows - 1 ? 'none' : '1px solid #f1f5f9'
            }}
          >
            <Skeleton width={index % 2 === 0 ? 82 : 104} height={13} borderRadius={6} />
            <Skeleton width={index % 3 === 0 ? 92 : 68} height={16} borderRadius={6} />
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div
      aria-label="Carregando informações do negócio"
      style={{
        display: 'grid',
        alignContent: 'start',
        gap: 18,
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        padding: isMobile ? '6px 0 24px' : '6px 6px 24px 0'
      }}
    >
      {renderSection(7, 'overview')}
      {renderSection(3, 'history')}
    </div>
  )
}

export function LeadChatTabSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  const messageWidths = isMobile ? ['72%', '58%', '80%', '52%'] : ['42%', '34%', '48%', '30%']

  return (
    <section
      aria-label="Carregando chat do lead"
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dde3ee',
          borderRadius: 12,
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: 16,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 16
          }}
        >
          {messageWidths.map((width, index) => (
            <div
              key={width}
              style={{
                width,
                alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end',
                display: 'grid',
                gap: 5
              }}
            >
              <Skeleton width={54} height={9} borderRadius={5} />
              <Skeleton height={index === 2 ? 62 : 44} borderRadius={12} />
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '36px minmax(0, 1fr) 36px 36px',
            alignItems: 'center',
            gap: isMobile ? 6 : 10,
            padding: 12,
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <Skeleton width={36} height={36} borderRadius={8} />
          <Skeleton height={40} borderRadius={8} />
          <Skeleton circle width={34} height={34} />
          <Skeleton circle width={34} height={34} />
        </div>
      </div>
    </section>
  )
}

export function LeadFollowUpTabSkeleton({ isMobile }: LeadDetailsSkeletonProps) {
  return (
    <section
      aria-label="Carregando follow-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: isMobile ? '6px 6px 18px' : '0 0 18px',
          flexShrink: 0
        }}
      >
        <span style={{ display: 'block', width: 132 }}>
          <Skeleton height={isMobile ? 24 : 26} borderRadius={6} />
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Skeleton circle width={30} height={30} />
          <Skeleton circle width={30} height={30} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          padding: isMobile ? '0 6px 28px' : '0 6px 28px 0',
          overflow: 'hidden'
        }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} style={{ display: 'grid', gap: 8 }}>
            <Skeleton width={index === 2 ? 72 : 58} height={12} borderRadius={6} />
            <Skeleton height={isMobile ? 46 : 42} borderRadius={10} />
          </div>
        ))}
      </div>
    </section>
  )
}