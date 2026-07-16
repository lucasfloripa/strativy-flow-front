import { useEffect, useState } from 'react'

import { interactionTheme } from '../../app/theme/brandTheme'

type SettingsSection = 'usuario' | null

const settingsTitleFontSize = 14
const settingsPanelWidth = 'min(46vw, 680px)'

export default function ConfiguracoesPage() {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>(null)
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false)
  const [isUsuarioButtonHovered, setIsUsuarioButtonHovered] =
    useState<boolean>(false)

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

  const usuarioButtonIsActive = selectedSection === 'usuario'

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
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.2
            }}
          >
            Usuário
          </h2>

          {selectedSection === 'usuario' ? (
            <div style={{ marginTop: 20, display: 'grid', gap: 20 }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                Página de usuário - Em desenvolvimento
              </p>
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  )
}
