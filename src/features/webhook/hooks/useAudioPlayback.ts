import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getActiveAudioPlayback,
  setActiveAudioPlayback,
  subscribeToAudioPlayback
} from './audioPlaybackCoordinator'

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainderSeconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainderSeconds).padStart(2, '0')}`
}

type UseAudioPlaybackParams = {
  playbackId: string
}

type UseAudioPlaybackResult = {
  audioRef: React.RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string | null
  currentTimeInSeconds: number
  durationInSeconds: number
  progressValue: number
  currentTimeLabel: string
  durationLabel: string
  togglePlayPause: () => Promise<void>
  handleSeekChange: (nextProgressValue: number) => void
}

export const useAudioPlayback = ({ playbackId }: UseAudioPlaybackParams): UseAudioPlaybackResult => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [hasError, setHasError] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentTimeInSeconds, setCurrentTimeInSeconds] = useState<number>(0)
  const [durationInSeconds, setDurationInSeconds] = useState<number>(0)

  useEffect(() => {
    const unsubscribe = subscribeToAudioPlayback((activePlaybackId) => {
      const audioElement = audioRef.current
      if (!audioElement) {
        return
      }

      if (activePlaybackId !== playbackId && !audioElement.paused) {
        audioElement.pause()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [playbackId])

  useEffect(() => {
    const audioElement = audioRef.current

    if (!audioElement) {
      return
    }

    const handleLoadedMetadata = () => {
      setDurationInSeconds(audioElement.duration || 0)
      setHasError(false)
      setErrorMessage(null)
    }

    const handleTimeUpdate = () => {
      setCurrentTimeInSeconds(audioElement.currentTime || 0)
    }

    const handleDurationChange = () => {
      setDurationInSeconds(audioElement.duration || 0)
    }

    const handlePlay = () => {
      setActiveAudioPlayback(playbackId)
      setIsPlaying(true)
      setIsLoading(false)
      setHasError(false)
      setErrorMessage(null)
    }

    const handlePause = () => {
      setIsPlaying(false)
      setIsLoading(false)

      if (getActiveAudioPlayback() === playbackId) {
        setActiveAudioPlayback(null)
      }
    }

    const handleWaiting = () => {
      if (!audioElement.paused) {
        setIsLoading(true)
      }
    }

    const handlePlaying = () => {
      setIsLoading(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setIsLoading(false)
      setCurrentTimeInSeconds(0)
      if (getActiveAudioPlayback() === playbackId) {
        setActiveAudioPlayback(null)
      }
    }

    const handleError = () => {
      setIsPlaying(false)
      setIsLoading(false)
      setHasError(true)
      setErrorMessage('Nao foi possivel carregar este audio.')

      if (getActiveAudioPlayback() === playbackId) {
        setActiveAudioPlayback(null)
      }
    }

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    audioElement.addEventListener('timeupdate', handleTimeUpdate)
    audioElement.addEventListener('durationchange', handleDurationChange)
    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('waiting', handleWaiting)
    audioElement.addEventListener('playing', handlePlaying)
    audioElement.addEventListener('ended', handleEnded)
    audioElement.addEventListener('error', handleError)

    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audioElement.removeEventListener('timeupdate', handleTimeUpdate)
      audioElement.removeEventListener('durationchange', handleDurationChange)
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('waiting', handleWaiting)
      audioElement.removeEventListener('playing', handlePlaying)
      audioElement.removeEventListener('ended', handleEnded)
      audioElement.removeEventListener('error', handleError)

      if (getActiveAudioPlayback() === playbackId) {
        setActiveAudioPlayback(null)
      }
    }
  }, [playbackId])

  const togglePlayPause = async (): Promise<void> => {
    const audioElement = audioRef.current

    if (!audioElement) {
      return
    }

    setHasError(false)
    setErrorMessage(null)

    if (audioElement.paused) {
      setIsLoading(true)
      setActiveAudioPlayback(playbackId)

      try {
        await audioElement.play()
      } catch {
        setIsLoading(false)
        setHasError(true)
        setErrorMessage('Nao foi possivel reproduzir este audio.')

        if (getActiveAudioPlayback() === playbackId) {
          setActiveAudioPlayback(null)
        }
      }

      return
    }

    audioElement.pause()
  }

  const handleSeekChange = (nextProgressValue: number): void => {
    const audioElement = audioRef.current

    if (!audioElement || !Number.isFinite(audioElement.duration) || audioElement.duration <= 0) {
      return
    }

    const nextProgress = Math.max(0, Math.min(100, nextProgressValue))
    const nextTimeInSeconds = (nextProgress / 100) * audioElement.duration

    audioElement.currentTime = nextTimeInSeconds
    setCurrentTimeInSeconds(nextTimeInSeconds)
  }

  const progressValue = useMemo(() => {
    if (!Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
      return 0
    }

    return Math.min(100, Math.max(0, (currentTimeInSeconds / durationInSeconds) * 100))
  }, [currentTimeInSeconds, durationInSeconds])

  return {
    audioRef,
    isPlaying,
    isLoading,
    hasError,
    errorMessage,
    currentTimeInSeconds,
    durationInSeconds,
    progressValue,
    currentTimeLabel: formatDuration(currentTimeInSeconds),
    durationLabel: formatDuration(durationInSeconds),
    togglePlayPause,
    handleSeekChange
  }
}
