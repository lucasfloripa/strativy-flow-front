import { useRef } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

type MediaPickerRenderProps = {
  openPicker: () => void
}

type MediaPickerProps = {
  accept?: string
  disabled?: boolean
  onFileSelected: (file: File) => void | Promise<void>
  children: (props: MediaPickerRenderProps) => ReactNode
}

export function MediaPicker({
  accept,
  disabled = false,
  onFileSelected,
  children
}: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const openPicker = () => {
    if (disabled) {
      return
    }

    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.click()
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    await onFileSelected(selectedFile)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <>
      {children({ openPicker })}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => {
          void handleFileChange(event)
        }}
        style={{ display: 'none' }}
      />
    </>
  )
}
