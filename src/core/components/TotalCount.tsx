import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type TotalCountProps = {
  isLoading: boolean
  total: number
}

export function TotalCount({ isLoading, total }: TotalCountProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span>Total</span>
      {isLoading ? (
        <span style={{ display: 'inline-block', width: 18, lineHeight: 1 }}>
          <Skeleton height={12} borderRadius={5} />
        </span>
      ) : (
        <span>{total}</span>
      )}
    </span>
  )
}
