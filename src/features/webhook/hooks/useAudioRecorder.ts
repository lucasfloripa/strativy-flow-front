import { useEffect, useRef, useState } from 'react'

type RecorderAudioFormat = {
  mimeType: string
  extension: string
}

const PREFERRED_RECORDER_AUDIO_FORMATS: RecorderAudioFormat[] = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
  { mimeType: 'audio/ogg', extension: 'ogg' },
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', extension: 'm4a' },
  { mimeType: 'audio/mpeg', extension: 'mp3' },
  { mimeType: 'audio/aac', extension: 'aac' },
  { mimeType: 'audio/amr', extension: 'amr' }
]

const resolveSupportedAudioFormat = (): RecorderAudioFormat | null => {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }

  for (const format of PREFERRED_RECORDER_AUDIO_FORMATS) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      return format
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
  const selectedMimeTypeRef = useRef<string | null>(null)
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
    selectedMimeTypeRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    resetRecordingClock()
  }

  const buildRecordedAudioBlob = (mediaRecorder: MediaRecorder): Blob | null => {
    if (!chunksRef.current.length) {
      return null
    }

    const recorderMimeType = mediaRecorder.mimeType || selectedMimeTypeRef.current || ''
    const recordedBlob = new Blob(chunksRef.current, {
      type: recorderMimeType
    })

    console.debug('[audio-debug] Recorder output blob metadata', {
      recorderMimeType,
      blobType: recordedBlob.type,
      blobSize: recordedBlob.size
    })

    return recordedBlob
  }

  const finalizeRecording = async (discard: boolean): Promise<Blob | null> => {
    const mediaRecorder = mediaRecorderRef.current

    if (!mediaRecorder) {
      releaseRecorderResources()
      return null
    }

    if (mediaRecorder.state === 'inactive') {
      const recordedBlob = buildRecordedAudioBlob(mediaRecorder)

      releaseRecorderResources()
      return discard ? null : recordedBlob
    }

    return new Promise<Blob | null>((resolve) => {
      mediaRecorder.addEventListener(
        'stop',
        () => {
          const recordedBlob = buildRecordedAudioBlob(mediaRecorder)

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
      const supportedFormat = resolveSupportedAudioFormat()

      const selectedMimeType = supportedFormat?.mimeType ?? null
      selectedMimeTypeRef.current = selectedMimeType

      console.debug('[audio-debug] Selected MediaRecorder MIME type', {
        selectedMimeType,
        extension: supportedFormat?.extension ?? null,
        usedDefaultRecorderConfig: !selectedMimeType
      })

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, {
            mimeType: selectedMimeType
          })
        : new MediaRecorder(stream)

      console.debug('[audio-debug] MediaRecorder runtime MIME type', {
        mediaRecorderMimeType: mediaRecorder.mimeType
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
