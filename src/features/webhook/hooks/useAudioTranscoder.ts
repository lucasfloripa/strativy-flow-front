import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const FFMPEG_CORE_VERSION = '0.12.10'
const FFMPEG_BASE_URLS = [
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`
]

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

const resolveInputExtension = (mimeType: string): string => {
  const normalizedMimeType = mimeType.split(';')[0]?.trim().toLowerCase() || ''

  if (normalizedMimeType === 'audio/webm') return 'webm'
  if (normalizedMimeType === 'audio/ogg') return 'ogg'
  if (normalizedMimeType === 'audio/mp4') return 'm4a'
  if (normalizedMimeType === 'audio/mpeg') return 'mp3'
  if (normalizedMimeType === 'audio/aac') return 'aac'
  if (normalizedMimeType === 'audio/amr') return 'amr'

  return 'bin'
}

const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg()

      try {
        for (const baseURL of FFMPEG_BASE_URLS) {
          try {
            const coreURL = await toBlobURL(
              `${baseURL}/ffmpeg-core.js`,
              'text/javascript'
            )
            const wasmURL = await toBlobURL(
              `${baseURL}/ffmpeg-core.wasm`,
              'application/wasm'
            )

            await ffmpeg.load({ coreURL, wasmURL })
            ffmpegInstance = ffmpeg

            console.debug('[audio-debug] FFmpeg initialized', { baseURL })

            return ffmpeg
          } catch (baseError) {
            console.warn('[audio-debug] FFmpeg load attempt failed', {
              baseURL,
              errorMessage:
                baseError instanceof Error
                  ? baseError.message
                  : String(baseError)
            })
          }
        }

        throw new Error('All FFmpeg CDN load attempts failed.')
      } catch (error) {
        ffmpegLoadPromise = null

        console.error('[audio-debug] Failed to initialize FFmpeg', {
          errorMessage: error instanceof Error ? error.message : String(error)
        })

        throw new Error('Nao foi possivel inicializar a conversao de audio.')
      }
    })()
  }

  return ffmpegLoadPromise
}

export const transcodeRecordedAudioToMp3 = async (params: {
  audioBlob: Blob
  fileNamePrefix?: string
}): Promise<File> => {
  const { audioBlob, fileNamePrefix = 'audio' } = params

  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Audio gravado invalido para conversao.')
  }

  const ffmpeg = await getFFmpeg()

  const inputExtension = resolveInputExtension(audioBlob.type)
  const inputFileName = `input-${Date.now()}.${inputExtension}`
  const outputFileName = `output-${Date.now()}.mp3`

  await ffmpeg.writeFile(inputFileName, await fetchFile(audioBlob))

  await ffmpeg.exec([
    '-i',
    inputFileName,
    '-vn',
    '-acodec',
    'libmp3lame',
    '-ar',
    '44100',
    '-ac',
    '1',
    '-b:a',
    '128k',
    outputFileName
  ])

  const outputData = await ffmpeg.readFile(outputFileName)

  if (!(outputData instanceof Uint8Array) || outputData.byteLength === 0) {
    throw new Error('Falha ao converter audio para MP3.')
  }

  const copiedOutputData = new Uint8Array(outputData.byteLength)
  copiedOutputData.set(outputData)

  const transcodedFile = new File(
    [copiedOutputData],
    `${fileNamePrefix}-${Date.now()}.mp3`,
    { type: 'audio/mpeg' }
  )

  console.debug('[audio-debug] Transcoded MP3 metadata', {
    sourceBlobType: audioBlob.type,
    sourceBlobSize: audioBlob.size,
    fileName: transcodedFile.name,
    fileType: transcodedFile.type,
    fileSize: transcodedFile.size
  })

  return transcodedFile
}
