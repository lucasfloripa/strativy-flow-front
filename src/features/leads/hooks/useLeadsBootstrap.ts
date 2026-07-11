import { useCallback, useEffect, useState } from 'react'

import { LeadsService } from '../services/LeadsService'
import type { LeadsBootstrapData } from '../types/leads.types'

type UseLeadsBootstrapResult = {
  data: LeadsBootstrapData
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
}

const INITIAL_DATA: LeadsBootstrapData = {
  leads: []
}

export function useLeadsBootstrap(): UseLeadsBootstrapResult {
  const [data, setData] = useState<LeadsBootstrapData>(INITIAL_DATA)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setData({
        leads: await LeadsService.getLeads()
      })
    } catch (exception: unknown) {
      const message =
        exception instanceof Error ? exception.message : 'Falha ao carregar leads'
      setError(message)
      setData(INITIAL_DATA)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    data,
    isLoading,
    error,
    reload
  }
}
