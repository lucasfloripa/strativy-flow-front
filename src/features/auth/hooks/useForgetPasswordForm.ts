import { useState } from 'react'
import axios from 'axios'

import { AuthService } from '../services/AuthService'

type UseForgetPasswordFormResult = {
  email: string
  isSubmitting: boolean
  error: string | null
  successMessage: string | null
  setEmail: (value: string) => void
  submit: () => Promise<void>
}

const getForgetPasswordErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Não foi possível enviar o link de redefinição.'
  }

  const responseMessage = error.response?.data?.message

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }

  return 'Não foi possível enviar o link de redefinição.'
}

export function useForgetPasswordForm(): UseForgetPasswordFormResult {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const submit = async (): Promise<void> => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Informe seu e-mail para continuar.')
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      const response = await AuthService.forgetPassword({
        email: trimmedEmail
      })

      setSuccessMessage(response.message)
    } catch (exception: unknown) {
      setError(getForgetPasswordErrorMessage(exception))
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    email,
    isSubmitting,
    error,
    successMessage,
    setEmail,
    submit
  }
}