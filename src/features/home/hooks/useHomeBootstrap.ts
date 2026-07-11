import { useEffect, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'

import { authUserEmailAtom } from '../../../core/state/authUserEmailAtom'
import { AuthService } from '../../auth/services/AuthService'

type UseHomeBootstrapResult = {
  email: string | null
  isLoading: boolean
  error: string | null
}

export function useHomeBootstrap(): UseHomeBootstrapResult {
  const email = useAtomValue(authUserEmailAtom)
  const setEmail = useSetAtom(authUserEmailAtom)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (email) {
      setIsLoading(false)
      setError(null)
      return
    }

    const run = async () => {
      try {
        const profile = await AuthService.getMe()
        setEmail(profile.email)
      } catch (exception: unknown) {
        const message =
          exception instanceof Error ? exception.message : 'Falha ao carregar usuario'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [email, setEmail])

  return {
    email,
    isLoading,
    error
  }
}
