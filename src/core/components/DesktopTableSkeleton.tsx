import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

type DesktopTableSkeletonProps = {
  columns: Array<{
    width: number | string
    align?: 'left' | 'center' | 'right'
  }>
  rows?: number
}

export function DesktopTableSkeleton({
  columns,
  rows = 7
}: DesktopTableSkeletonProps) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr
      key={rowIndex}
      aria-hidden="true"
      style={{ borderBottom: '1px solid #f3f4f6', background: '#ffffff' }}
    >
      {columns.map((column, columnIndex) => (
        <td
          key={columnIndex}
          style={{
            padding: '14px 12px',
            textAlign: column.align ?? 'left'
          }}
        >
          <Skeleton width={column.width} height={14} borderRadius={6} />
        </td>
      ))}
    </tr>
  ))
}