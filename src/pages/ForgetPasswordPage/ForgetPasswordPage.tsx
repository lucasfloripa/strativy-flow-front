import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { useForgetPasswordForm } from '../../features/auth/hooks/useForgetPasswordForm'

export default function ForgetPasswordPage() {
  const { isMobile } = useViewportBreakpoint()
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isSubmitHovered, setIsSubmitHovered] = useState(false)
  const {
    email,
    isSubmitting,
    error,
    successMessage,
    setEmail,
    submit
  } = useForgetPasswordForm()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submit()
  }

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
              Esqueceu sua senha?
            </h1>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: 13,
                lineHeight: 1.4
              }}
            >
              Informe seu e-mail para receber o link de redefinição de senha.
            </p>
          </div>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onFocus={() => setIsEmailFocused(true)}
            onBlur={() => setIsEmailFocused(false)}
            placeholder="E-mail"
            autoComplete="email"
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: `1px solid ${
                isEmailFocused
                  ? interactionTheme.inputFocusBorderColor
                  : '#d7dce4'
              }`,
              padding: '0 14px',
              color: '#111827',
              background: '#ffffff',
              outline: 'none',
              fontSize: isMobile ? 16 : 14,
              boxSizing: 'border-box',
              boxShadow: isEmailFocused
                ? interactionTheme.inputFocusBoxShadow
                : 'none'
            }}
          />

          {error ? (
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

          {successMessage ? (
            <p
              role="status"
              style={{
                margin: 0,
                color: interactionTheme.activeIconColor,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.5
              }}
            >
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
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
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'background 160ms ease, opacity 160ms ease'
            }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
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