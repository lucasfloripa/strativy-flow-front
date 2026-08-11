import { Clock3, MessageCircle, Send, TimerReset } from 'lucide-react'

import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'

const rules = [
  {
    title: 'Abertura da conversa',
    description:
      'A conversa pode começar quando o cliente envia uma mensagem para o app. Se o primeiro contato partir do app, a abertura deve ser feita por meio de um template aprovado.',
    icon: MessageCircle,
    color: '#047857',
    background: '#ecfdf5'
  },
  {
    title: 'Janela de atendimento de 24 horas',
    description:
      'A partir da última mensagem do cliente, a equipe tem 24 horas para enviar mensagens livres. Cada nova mensagem do cliente renova essa janela.',
    icon: Clock3,
    color: '#1d4ed8',
    background: '#eff6ff'
  },
  {
    title: 'Após 24 horas sem mensagem do cliente',
    description:
      'A janela de atendimento é encerrada e mensagens livres não podem mais ser enviadas. Para retomar a conversa, é necessário usar um template aprovado.',
    icon: TimerReset,
    color: '#b45309',
    background: '#fffbeb'
  }
] as const

export default function InformacoesPage() {
  const { isMobile } = useViewportBreakpoint()

  return (
    <section
      style={{
        height: '100%',
        padding: isMobile ? '24px 16px 16px' : '16px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 18 : 16,
        background: isMobile ? '#fafbfd' : '#f3f4f6',
        boxSizing: 'border-box',
        overflow: isMobile ? 'hidden' : 'auto'
      }}
    >
      <header
        style={isMobile
          ? { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 16 }
          : {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '4px 2px'
            }}
      >
        <h1
          style={isMobile
            ? { margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }
            : { margin: 0, color: '#111827', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}
        >
          Informações
        </h1>
      </header>

      <main
        style={{
          width: '100%',
          maxWidth: 920,
          flex: isMobile ? 1 : undefined,
          minHeight: isMobile ? 0 : undefined,
          display: 'grid',
          alignContent: 'start',
          gap: 24,
          paddingBottom: isMobile ? 92 : 24,
          overflowY: isMobile ? 'auto' : undefined,
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <section>
          <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2 }}>
            Ciclo da conversa
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
            Entenda como uma conversa é aberta, mantida ativa e retomada no WhatsApp.
          </p>

          <div
            style={{
              marginTop: 16,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden'
            }}
          >
            {rules.map((rule, index) => {
              const Icon = rule.icon

              return (
                <article
                  key={rule.title}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px minmax(0, 1fr)',
                    gap: 14,
                    padding: isMobile ? 16 : 18,
                    borderTop: index === 0 ? 'none' : '1px solid #e5e7eb'
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      color: rule.color,
                      background: rule.background
                    }}
                  >
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0, color: '#111827', fontSize: 15, lineHeight: 1.3 }}>
                      {rule.title}
                    </h3>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.55 }}>
                      {rule.description}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section
          style={{
            padding: isMobile ? 16 : 20,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            display: 'grid',
            gridTemplateColumns: '40px minmax(0, 1fr)',
            gap: 14
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              color: '#7c3aed',
              background: '#f5f3ff'
            }}
          >
            <Send size={20} />
          </span>
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2 }}>
              Envio de template
            </h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              O template precisa ser aprovado previamente pela Meta e seu envio possui custo. Quando o cliente responder, a janela de atendimento de 24 horas será aberta e as mensagens livres serão liberadas.
            </p>
          </div>
        </section>
      </main>
    </section>
  )
}
