import { useEffect, useState } from 'react'

import { AuthService } from '../services/AuthService'
import type { MeResponse } from '../types/auth.types'

type UseLoginBootstrapResult = {
  me: MeResponse | null
  isLoading: boolean
  error: string | null
}

export function useLoginBootstrap(): UseLoginBootstrapResult {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      return
    }

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const profile = await AuthService.getMe()
        setMe(profile)
      } catch (exception: unknown) {
        const message =
          exception instanceof Error ? exception.message : 'Falha ao validar sessão'
        setError(message)
        setMe(null)
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [])

  return {
    me,
    isLoading,
    error
  }
}
