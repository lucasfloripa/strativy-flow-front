import { useRef, useState } from 'react'

import { WebhookService } from '../services/WebhookService'

export type ChatUploadMediaType = 'audio' | 'image' | 'video' | 'document'

type UseChatMediaUploadResult = {
  isUploading: boolean
  uploadingType: ChatUploadMediaType | null
  uploadMedia: (params: {
    leadId: string
    file: File
    type: ChatUploadMediaType
    caption?: string
    metadata?: Record<string, unknown>
  }) => Promise<boolean>
  cancelUpload: () => void
}

const resolveFriendlyMediaType = (type: ChatUploadMediaType): string => {
  if (type === 'audio') return 'audio'
  if (type === 'document') return 'documento'
  if (type === 'image') return 'imagem'
  return 'video'
}

const mapUploadErrorMessage = (
  exception: unknown,
  type: ChatUploadMediaType
): string => {
  const friendlyMediaType = resolveFriendlyMediaType(type)

  if (
    typeof exception === 'object' &&
    exception !== null &&
    'response' in exception
  ) {
    const response = (exception as { response?: { data?: unknown } }).response
    const responseData = response?.data

    if (typeof responseData === 'object' && responseData !== null) {
      const responseMessage = (responseData as { message?: unknown }).message

      if (
        Array.isArray(responseMessage) &&
        responseMessage.length > 0 &&
        typeof responseMessage[0] === 'string'
      ) {
        return responseMessage[0]
      }

      if (typeof responseMessage === 'string') {
        if (responseMessage.includes('Unsupported file type')) {
          return `Formato de ${friendlyMediaType} nao suportado.`
        }

        if (responseMessage.includes('File size exceeds')) {
          return `O arquivo de ${friendlyMediaType} excede o tamanho maximo permitido.`
        }

        return responseMessage
      }
    }
  }

  if (exception instanceof Error && exception.message.trim().length > 0) {
    if (exception.name === 'CanceledError' || exception.message.includes('canceled')) {
      return 'Upload cancelado.'
    }

    if (exception.message.includes('Unsupported file type')) {
      return `Formato de ${friendlyMediaType} nao suportado.`
    }

    if (exception.message.includes('File size exceeds')) {
      return `O arquivo de ${friendlyMediaType} excede o tamanho maximo permitido.`
    }

    return exception.message
  }

  return `Nao foi possivel enviar ${friendlyMediaType}. Tente novamente.`
}

export const useChatMediaUpload = (): UseChatMediaUploadResult => {
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadingType, setUploadingType] = useState<ChatUploadMediaType | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelUpload = () => {
    abortControllerRef.current?.abort()
  }

  const uploadMedia = async (params: {
    leadId: string
    file: File
    type: ChatUploadMediaType
    caption?: string
    metadata?: Record<string, unknown>
  }): Promise<boolean> => {
    if (isUploading) {
      return false
    }

    const nextAbortController = new AbortController()
    abortControllerRef.current = nextAbortController

    setIsUploading(true)
    setUploadingType(params.type)

    try {
      await WebhookService.sendMediaMessage(params.leadId, {
        file: params.file,
        type: params.type,
        caption: params.caption,
        metadata: params.metadata,
        signal: nextAbortController.signal
      })

      return true
    } catch (exception: unknown) {
      throw new Error(mapUploadErrorMessage(exception, params.type))
    } finally {
      if (abortControllerRef.current === nextAbortController) {
        abortControllerRef.current = null
      }

      setIsUploading(false)
      setUploadingType(null)
    }
  }

  return {
    isUploading,
    uploadingType,
    uploadMedia,
    cancelUpload
  }
}
