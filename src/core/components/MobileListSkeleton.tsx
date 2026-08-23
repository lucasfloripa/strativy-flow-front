import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type MobileListSkeletonProps = {
  cards?: number
}

export function MobileListSkeleton({ cards = 3 }: MobileListSkeletonProps) {
  return Array.from({ length: cards }, (_, index) => (
    <article
      key={index}
      aria-hidden="true"
      style={{
        display: 'grid',
        gap: 12,
        padding: 14,
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        background: '#ffffff',
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ width: '58%' }}>
          <Skeleton height={16} borderRadius={6} />
        </div>
        <Skeleton width={58} height={24} borderRadius={6} />
      </div>

      <div style={{ display: 'grid', gap: 7 }}>
        <Skeleton width="84%" height={12} borderRadius={6} />
        <Skeleton width="66%" height={12} borderRadius={6} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={82} height={26} borderRadius={6} />
        <Skeleton width={104} height={26} borderRadius={6} />
      </div>
    </article>
  ))
}