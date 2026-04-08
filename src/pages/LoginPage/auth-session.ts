import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig
} from 'axios'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _skipAuthRefresh?: boolean
}

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:1000/api'

let refreshRequest: Promise<string> | null = null

export function getStoredAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

export function applyStoredAccessToken(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  const token = getStoredAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}

export async function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = axios
      .get<{ accessToken: string }>(`${AUTH_BASE_URL}/auth/refresh`, {
        withCredentials: true
      })
      .then(({ data }) => {
        localStorage.setItem('accessToken', data.accessToken)
        return data.accessToken
      })
      .catch((error: unknown) => {
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        throw error
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

function shouldSkipRefresh(config?: RetryableRequestConfig): boolean {
  const url = config?.url ?? ''

  return (
    Boolean(config?._skipAuthRefresh) ||
    /\/auth\/(login|logout|refresh)$/.test(url)
  )
}

export function createRefreshResponseErrorHandler(client: AxiosInstance) {
  return async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest)
    ) {
      return Promise.reject(error)
    }

    const latestToken = getStoredAccessToken()
    const latestAuthorization = latestToken ? `Bearer ${latestToken}` : null
    const originalAuthorization = originalRequest.headers.Authorization

    if (latestAuthorization && originalAuthorization !== latestAuthorization) {
      originalRequest._retry = true
      originalRequest.headers.Authorization = latestAuthorization
      return client(originalRequest)
    }

    originalRequest._retry = true

    try {
      const accessToken = await refreshAccessTokenOnce()
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return client(originalRequest)
    } catch {
      return Promise.reject(error)
    }
  }
}