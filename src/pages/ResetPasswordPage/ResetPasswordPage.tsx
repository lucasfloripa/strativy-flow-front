import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { useResetPasswordForm } from '../../features/auth/hooks/useResetPasswordForm'

export default function ResetPasswordPage() {
  const { isMobile } = useViewportBreakpoint()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isSubmitHovered, setIsSubmitHovered] = useState(false)
  const token = searchParams.get('token')
  const {
    newPassword,
    confirmPassword,
    isSubmitting,
    error,
    setNewPassword,
    setConfirmPassword,
    submit
  } = useResetPasswordForm(token)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const successMessage = await submit()

    if (successMessage) {
      navigate('/login', {
        replace: true,
        state: { passwordResetSuccessMessage: successMessage }
      })
    }
  }

  const inputStyle = (field: string) => ({
    width: '100%',
    height: 42,
    borderRadius: 10,
    border: `1px solid ${
      focusedField === field
        ? interactionTheme.inputFocusBorderColor
        : '#d7dce4'
    }`,
    padding: '0 14px',
    color: '#111827',
    background: '#ffffff',
    outline: 'none',
    fontSize: isMobile ? 16 : 14,
    boxSizing: 'border-box' as const,
    boxShadow:
      focusedField === field
        ? interactionTheme.inputFocusBoxShadow
        : 'none'
  })

  return (
    <main
      style={{
        minHeight: isMobile ? '100svh' : '100vh',
        height: isMobile ? '100svh' : undefined,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        overflowY: isMobile ? 'auto' : undefined,
        background: 'linear-gradient(to bottom, #D8EBDD 0%, #EEF7F0 100%)',
        boxSizing: 'border-box'
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 408,
          display: 'grid',
          placeItems: 'center',
          background: '#f3f4f6',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(16, 24, 40, 0.08)',
          boxSizing: 'border-box'
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 408,
            justifySelf: 'center',
            alignSelf: 'center',
            display: 'grid',
            gap: 16,
            padding: 24,
            background: '#f3f4f6',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'grid', gap: 6, textAlign: 'center' }}>
            <h1
              style={{
                margin: 0,
                color: '#374151',
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.2,
                fontFamily: 'Canela, serif',
                fontStyle: 'italic'
              }}
            >
              Redefina sua senha
            </h1>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: 13,
                lineHeight: 1.4
              }}
            >
              Escolha uma nova senha para acessar o{' '}
              <span
                style={{
                  fontFamily: 'Canela, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 15
                }}
              >
                StrativyFlow
              </span>
              .
            </p>
          </div>

          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            placeholder="Nova senha"
            autoComplete="new-password"
            style={inputStyle('password')}
          />

          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onFocus={() => setFocusedField('confirmPassword')}
            onBlur={() => setFocusedField(null)}
            placeholder="Confirme a nova senha"
            autoComplete="new-password"
            style={inputStyle('confirmPassword')}
          />

          {!token ? (
            <p
              role="alert"
              style={{
                margin: 0,
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              Link de redefinição inválido.
            </p>
          ) : null}

          {error && token ? (
            <p
              role="alert"
              style={{
                margin: 0,
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!token || isSubmitting}
            onMouseEnter={() => setIsSubmitHovered(true)}
            onMouseLeave={() => setIsSubmitHovered(false)}
            style={{
              height: 42,
              border: 'none',
              borderRadius: 8,
              background: isSubmitHovered
                ? interactionTheme.primaryButtonHoverBackground
                : interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor:
                !token || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !token || isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
          </button>

          <Link
            to="/login"
            style={{
              color: '#64748b',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'none'
            }}
          >
            Voltar para o login
          </Link>
        </form>
      </section>
    </main>
  )
}