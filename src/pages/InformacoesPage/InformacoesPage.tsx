import { Clock3, MessageCircle, Send, TimerReset } from 'lucide-react'

import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'

const rules = [
  {
    title: 'Primeiras 72 horas',
    description:
      'A contagem começa na primeira mensagem enviada pelo cliente. Durante esse período, o campo de mensagem permanece disponível para a equipe conversar normalmente.',
    icon: Clock3,
    color: '#047857',
    background: '#ecfdf5'
  },
  {
    title: 'Cliente respondeu nas últimas 24 horas',
    description:
      'Depois das 72 horas iniciais, uma nova mensagem do cliente mantém a conversa aberta por 24 horas a partir dessa última mensagem.',
    icon: MessageCircle,
    color: '#1d4ed8',
    background: '#eff6ff'
  },
  {
    title: 'Sem resposta há 24 horas ou mais',
    description:
      'Quando as 72 horas iniciais já terminaram e o cliente não enviou mensagem nas últimas 24 horas, o campo de texto é substituído pela opção de reabrir a conversa.',
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
            O acesso ao campo de mensagem considera a primeira e a última mensagem enviadas pelo cliente.
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
              Fora da janela de conversa, mensagens livres não podem ser enviadas. Selecione um template aprovado para entrar em contato. Quando o cliente responder, o campo de mensagem será liberado novamente por 24 horas.
            </p>
          </div>
        </section>
      </main>
    </section>
  )
}
