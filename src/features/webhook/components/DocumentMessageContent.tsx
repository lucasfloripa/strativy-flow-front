import {
  Download,
  Eye,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText
} from 'lucide-react'

type DocumentMessageContentProps = {
  mediaUrl: string
  fileName?: string | null
  mediaSize?: number | null
  mimeType?: string | null
  caption?: string | null
}

const formatFileSize = (sizeInBytes?: number | null): string | null => {
  if (typeof sizeInBytes !== 'number' || Number.isNaN(sizeInBytes) || sizeInBytes <= 0) {
    return null
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  const sizeInKb = sizeInBytes / 1024
  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`
  }

  const sizeInMb = sizeInKb / 1024
  if (sizeInMb < 1024) {
    return `${sizeInMb.toFixed(1)} MB`
  }

  const sizeInGb = sizeInMb / 1024
  return `${sizeInGb.toFixed(1)} GB`
}

const resolveDocumentTypeLabel = (params: {
  fileName?: string | null
  mimeType?: string | null
}): string => {
  const { fileName, mimeType } = params
  const normalizedMimeType = mimeType?.trim().toLowerCase() || ''

  if (normalizedMimeType === 'application/pdf') return 'PDF'
  if (normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX'
  if (normalizedMimeType === 'application/msword') return 'DOC'
  if (normalizedMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'XLSX'
  if (normalizedMimeType === 'application/vnd.ms-excel') return 'XLS'
  if (normalizedMimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'PPTX'
  if (normalizedMimeType === 'application/vnd.ms-powerpoint') return 'PPT'
  if (normalizedMimeType === 'text/plain') return 'TXT'
  if (normalizedMimeType === 'text/csv') return 'CSV'
  if (normalizedMimeType === 'application/zip') return 'ZIP'
  if (normalizedMimeType === 'application/x-rar-compressed') return 'RAR'

  const extension = fileName?.split('.').pop()?.trim().toUpperCase()
  if (extension) {
    return extension
  }

  return 'DOC'
}

const resolveDocumentIcon = (documentTypeLabel: string) => {
  if (documentTypeLabel === 'XLS' || documentTypeLabel === 'XLSX' || documentTypeLabel === 'CSV') {
    return <FileSpreadsheet size={18} />
  }

  if (documentTypeLabel === 'ZIP' || documentTypeLabel === 'RAR' || documentTypeLabel === '7Z') {
    return <FileArchive size={18} />
  }

  if (documentTypeLabel === 'JSON' || documentTypeLabel === 'XML') {
    return <FileCode size={18} />
  }

  return <FileText size={18} />
}

const supportsInlinePreview = (params: {
  fileName?: string | null
  mimeType?: string | null
}): boolean => {
  const { fileName, mimeType } = params
  const normalizedMimeType = mimeType?.trim().toLowerCase() || ''

  if (
    normalizedMimeType === 'application/pdf' ||
    normalizedMimeType === 'text/plain' ||
    normalizedMimeType === 'text/csv'
  ) {
    return true
  }

  const extension = fileName?.split('.').pop()?.trim().toLowerCase()
  return extension === 'pdf' || extension === 'txt' || extension === 'csv'
}

export function DocumentMessageContent({
  mediaUrl,
  fileName,
  mediaSize,
  mimeType,
  caption
}: DocumentMessageContentProps) {
  const normalizedFileName = fileName?.trim() || 'Documento'
  const documentTypeLabel = resolveDocumentTypeLabel({ fileName: normalizedFileName, mimeType })
  const formattedFileSize = formatFileSize(mediaSize)
  const canPreviewInline = supportsInlinePreview({ fileName: normalizedFileName, mimeType })

  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        minWidth: 230,
        width: 'min(340px, 100%)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'rgba(17, 24, 39, 0.08)'
          }}
        >
          {resolveDocumentIcon(documentTypeLabel)}
        </span>

        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <span
            style={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={normalizedFileName}
          >
            {normalizedFileName}
          </span>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>{documentTypeLabel}</span>
            {formattedFileSize ? <span style={{ fontSize: 12, opacity: 0.82 }}>{formattedFileSize}</span> : null}
          </div>
        </div>
      </div>

      {caption ? (
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{caption}</span>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canPreviewInline ? (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid currentColor',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              gap: 6
            }}
          >
            <Eye size={14} />
            Visualizar
          </a>
        ) : null}

        <a
          href={mediaUrl}
          download={normalizedFileName}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 34,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid currentColor',
            color: 'inherit',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            gap: 6
          }}
        >
          <Download size={14} />
          Download
        </a>
      </div>
    </div>
  )
}
