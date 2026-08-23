import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type TotalCountProps = {
  isLoading: boolean
  total: number
}

export function TotalCount({ isLoading, total }: TotalCountProps) {
  if (isLoading) {
    return (
      <span style={{ display: 'inline-block', width: 48, lineHeight: 1 }}>
        <Skeleton height={12} borderRadius={5} />
      </span>
    )
  }

  return <span style={{ whiteSpace: 'nowrap' }}>Total {total}</span>
}
