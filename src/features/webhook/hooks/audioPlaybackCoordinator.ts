const listeners = new Set<(activePlaybackId: string | null) => void>()

let activePlaybackId: string | null = null

const emit = (): void => {
  listeners.forEach((listener) => {
    listener(activePlaybackId)
  })
}

export const setActiveAudioPlayback = (playbackId: string | null): void => {
  if (activePlaybackId === playbackId) {
    return
  }

  activePlaybackId = playbackId
  emit()
}

export const getActiveAudioPlayback = (): string | null => {
  return activePlaybackId
}

export const subscribeToAudioPlayback = (
  listener: (activePlaybackId: string | null) => void
): (() => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
