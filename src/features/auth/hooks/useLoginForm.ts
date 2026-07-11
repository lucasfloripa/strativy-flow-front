import { useState } from 'react'
import { useSetAtom } from 'jotai'

import axios from 'axios'

import { authUserEmailAtom } from '../../../core/state/authUserEmailAtom'
import { AuthService } from '../services/AuthService'

type UseLoginFormResult = {
  email: string
  password: string
  isSubmitting: boolean
  error: string | null
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  submit: () => Promise<boolean>
}

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Nao foi possivel entrar.'
  }

  const responseMessage = error.response?.data?.message

  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return String(responseMessage[0])
  }

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return 'Nao foi possivel entrar.'
}

export function useLoginForm(): UseLoginFormResult {
  const setAuthUserEmail = useSetAtom(authUserEmailAtom)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (): Promise<boolean> => {
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Preencha email e senha para continuar.')
      return false
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await AuthService.login({
        email: trimmedEmail,
        password: password
      })

      setAuthUserEmail(trimmedEmail)
      localStorage.setItem('accessToken', response.accessToken)
      return true
    } catch (exception: unknown) {
      setError(getLoginErrorMessage(exception))
      setAuthUserEmail(null)
      localStorage.removeItem('accessToken')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    email,
    password,
    isSubmitting,
    error,
    setEmail,
    setPassword,
    submit
  }
}
