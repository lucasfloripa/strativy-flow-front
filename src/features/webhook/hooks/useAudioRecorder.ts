import { useEffect, useRef, useState } from 'react'

const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/aac',
  'audio/amr',
  'audio/mpeg'
]

const resolveSupportedMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }

  for (const mimeType of SUPPORTED_AUDIO_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }

  return null
}

const stopMediaStreamTracks = (stream: MediaStream | null): void => {
  if (!stream) {
    return
  }

  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

type UseAudioRecorderResult = {
  isSupported: boolean
  isRecording: boolean
  recordingDurationInMs: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => Promise<void>
}

export const useAudioRecorder = (): UseAudioRecorderResult => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordingDurationInMs, setRecordingDurationInMs] = useState<number>(0)

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'

  const clearTimer = () => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  const resetRecordingClock = () => {
    clearTimer()
    recordingStartedAtRef.current = null
    setRecordingDurationInMs(0)
  }

  const updateRecordingDuration = () => {
    const startedAt = recordingStartedAtRef.current

    if (startedAt === null) {
      setRecordingDurationInMs(0)
      return
    }

    setRecordingDurationInMs(Date.now() - startedAt)
  }

  const startRecordingClock = () => {
    recordingStartedAtRef.current = Date.now()
    setRecordingDurationInMs(0)
    clearTimer()
    timerIntervalRef.current = window.setInterval(updateRecordingDuration, 250)
  }

  const releaseRecorderResources = () => {
    stopMediaStreamTracks(mediaStreamRef.current)
    mediaStreamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    resetRecordingClock()
  }

  const finalizeRecording = async (discard: boolean): Promise<Blob | null> => {
    const mediaRecorder = mediaRecorderRef.current

    if (!mediaRecorder) {
      releaseRecorderResources()
      return null
    }

    if (mediaRecorder.state === 'inactive') {
      const recordedBlob = chunksRef.current.length
        ? new Blob(chunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm'
          })
        : null

      releaseRecorderResources()
      return discard ? null : recordedBlob
    }

    return new Promise<Blob | null>((resolve) => {
      mediaRecorder.addEventListener(
        'stop',
        () => {
          const recordedBlob = chunksRef.current.length
            ? new Blob(chunksRef.current, {
                type: mediaRecorder.mimeType || 'audio/webm'
              })
            : null

          releaseRecorderResources()
          resolve(discard ? null : recordedBlob)
        },
        { once: true }
      )

      mediaRecorder.stop()
    })
  }

  const startRecording = async (): Promise<void> => {
    if (!isSupported) {
      throw new Error('Seu navegador nao suporta gravacao de audio.')
    }

    if (isRecording) {
      return
    }

    let stream: MediaStream | null = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedMimeType = resolveSupportedMimeType()

      if (!supportedMimeType) {
        throw new Error('Formato de audio nao suportado neste navegador.')
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType
      })

      chunksRef.current = []
      mediaStreamRef.current = stream
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      })

      mediaRecorder.addEventListener('start', () => {
        setIsRecording(true)
        startRecordingClock()
      })

      mediaRecorder.start()
    } catch (error) {
      stopMediaStreamTracks(stream)
      releaseRecorderResources()

      if (error instanceof Error) {
        throw error
      }

      throw new Error('Nao foi possivel iniciar a gravacao de audio.')
    }
  }

  const stopRecording = async (): Promise<Blob | null> => {
    return finalizeRecording(false)
  }

  const cancelRecording = async (): Promise<void> => {
    await finalizeRecording(true)
  }

  useEffect(() => {
    return () => {
      releaseRecorderResources()
    }
  }, [])

  return {
    isSupported,
    isRecording,
    recordingDurationInMs,
    startRecording,
    stopRecording,
    cancelRecording
  }
}
