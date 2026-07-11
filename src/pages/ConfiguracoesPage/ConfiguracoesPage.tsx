import { useEffect, useMemo, useState } from 'react'

import { interactionTheme } from '../../app/theme/brandTheme'
import { appApiClient } from '../../core/api/appApiClient'

type SettingsSection = 'usuario' | 'notificacoes' | null

type UserInformationsResponse = {
  id: string
  notificationWhatsAppNumbers?: string[]
}

const settingsTitleFontSize = 18
const settingsPanelWidth = 'min(46vw, 680px)'

export default function ConfiguracoesPage() {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>(null)
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false)
  const [isUsuarioButtonHovered, setIsUsuarioButtonHovered] =
    useState<boolean>(false)
  const [isNotificacoesButtonHovered, setIsNotificacoesButtonHovered] =
    useState<boolean>(false)
  const [notificationNumbers, setNotificationNumbers] = useState<string[]>([])

  useEffect(() => {
    if (!selectedSection) {
      setIsPanelVisible(false)
      return
    }

    setIsPanelVisible(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsPanelVisible(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [selectedSection])

  useEffect(() => {
    if (selectedSection !== 'notificacoes') {
      return
    }

    let isMounted = true

    const loadNotificationNumbers = async () => {
      const { data } = await appApiClient.get<UserInformationsResponse[]>(
        '/user/user-informations'
      )

      if (!isMounted) {
        return
      }

      const uniqueNumbers = Array.from(
        new Set(
          data.flatMap((item) =>
            (item.notificationWhatsAppNumbers ?? [])
              .map((number) => number.trim())
              .filter((number) => Boolean(number))
          )
        )
      )

      setNotificationNumbers(uniqueNumbers)
    }

    void loadNotificationNumbers()

    return () => {
      isMounted = false
    }
  }, [selectedSection])

  const usuarioButtonIsActive = selectedSection === 'usuario'
  const notificacoesButtonIsActive = selectedSection === 'notificacoes'

  const panelTitle = useMemo(() => {
    if (selectedSection === 'usuario') {
      return 'Usuário'
    }

    if (selectedSection === 'notificacoes') {
      return 'Notificações'
    }

    return ''
  }, [selectedSection])

  return (
    <section
      style={{
        height: '100vh',
        padding: '16px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: '#f3f4f6',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '4px 2px'
        }}
      >
        <h1 style={{ margin: 0, fontSize: settingsTitleFontSize, color: '#111827', lineHeight: 1.2 }}>
          Configurações
        </h1>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedSection('usuario')}
          onMouseEnter={() => setIsUsuarioButtonHovered(true)}
          onMouseLeave={() => setIsUsuarioButtonHovered(false)}
          style={{
            height: 38,
            width: 190,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background:
              usuarioButtonIsActive || isUsuarioButtonHovered
                ? interactionTheme.clickableCardHoverBackground
                : '#ffffff',
            color: usuarioButtonIsActive
              ? interactionTheme.sidebarItemActiveColor
              : '#111827',
            padding: '0 12px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          Usuário
        </button>

        <button
          type="button"
          onClick={() => setSelectedSection('notificacoes')}
          onMouseEnter={() => setIsNotificacoesButtonHovered(true)}
          onMouseLeave={() => setIsNotificacoesButtonHovered(false)}
          style={{
            height: 38,
            width: 190,
            marginTop: 10,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background:
              notificacoesButtonIsActive || isNotificacoesButtonHovered
                ? interactionTheme.clickableCardHoverBackground
                : '#ffffff',
            color: notificacoesButtonIsActive
              ? interactionTheme.sidebarItemActiveColor
              : '#111827',
            padding: '0 12px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          Notificações
        </button>
      </div>

      {selectedSection ? (
        <button
          type="button"
          aria-label="Fechar painel de configuração"
          onClick={() => setSelectedSection(null)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: settingsPanelWidth,
            bottom: 0,
            zIndex: 20,
            border: 'none',
            padding: 0,
            margin: 0,
            background: 'transparent',
            cursor: 'default'
          }}
        />
      ) : null}

      {selectedSection ? (
        <aside
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: settingsPanelWidth,
            zIndex: 30,
            borderLeft: '2px solid #edf1f5',
            background: '#ffffff',
            boxShadow: '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
            transform: isPanelVisible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 120ms ease',
            padding: 20,
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#111827',
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.2
            }}
          >
            {panelTitle}
          </h2>

          {selectedSection === 'notificacoes' ? (
            <div style={{ marginTop: 16 }}>
              {notificationNumbers.length ? (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    color: '#111827'
                  }}
                >
                  {notificationNumbers.map((phoneNumber) => (
                    <li key={phoneNumber}>{phoneNumber}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                  Nenhum número cadastrado.
                </p>
              )}
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  )
}
