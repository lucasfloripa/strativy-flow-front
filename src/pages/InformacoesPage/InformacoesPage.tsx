import { useState } from 'react'
import { Bot, CalendarClock, CircleCheckBig, CircleDollarSign, Clock3, Instagram, MessageCircle, Send, TimerReset } from 'lucide-react'

import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'

const whatsAppRules = [
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

const messengerRules = [
  {
    title: 'Abertura da conversa',
    description:
      'A conversa é liberada no Flow quando a pessoa envia uma mensagem para a Página no Messenger. Antes desse primeiro contato, a caixa de texto permanece bloqueada.',
    icon: MessageCircle,
    color: '#006fd6',
    background: '#eaf4ff'
  },
  {
    title: 'Janela de atendimento de 24 horas',
    description:
      'A equipe pode responder livremente durante as 24 horas seguintes à última mensagem da pessoa. Cada nova mensagem recebida reinicia essa janela.',
    icon: Clock3,
    color: '#006fd6',
    background: '#eaf4ff'
  },
  {
    title: 'Após 24 horas sem mensagem',
    description:
      'O envio pelo Flow é bloqueado. Para liberar novamente a conversa, é necessário aguardar uma nova mensagem da pessoa no Messenger.',
    icon: TimerReset,
    color: '#b45309',
    background: '#fffbeb'
  }
] as const

const directRules = [
  {
    title: 'Abertura da conversa',
    description:
      'A conversa é liberada no Flow quando a pessoa envia uma mensagem para a conta profissional pelo Instagram Direct. Antes desse primeiro contato, a caixa de texto permanece bloqueada.',
    icon: MessageCircle,
    color: '#c13584',
    background: '#fff0f6'
  },
  {
    title: 'Janela de atendimento de 24 horas',
    description:
      'A equipe pode responder livremente durante as 24 horas seguintes à última mensagem da pessoa. Cada nova mensagem recebida pelo Direct reinicia essa janela.',
    icon: Clock3,
    color: '#c13584',
    background: '#fff0f6'
  },
  {
    title: 'Após 24 horas sem mensagem',
    description:
      'O envio pelo Flow é bloqueado. Para liberar novamente a conversa, é necessário aguardar uma nova mensagem da pessoa no Instagram Direct.',
    icon: TimerReset,
    color: '#b45309',
    background: '#fffbeb'
  }
] as const

const followUpRules = [
  {
    title: 'Execução no horário agendado',
    description:
      'O Flow verifica os follow-ups a cada minuto. A ação automática entra na fila quando a data e a hora chegam, desde que o follow-up e a ação estejam pendentes.',
    icon: CalendarClock,
    color: '#1d4ed8',
    background: '#eff6ff'
  },
  {
    title: 'Negócio precisa estar aberto',
    description:
      'A ação só é executada enquanto o negócio estiver aberto. Negócios ganhos, perdidos ou encerrados não têm follow-ups executados automaticamente.',
    icon: MessageCircle,
    color: '#047857',
    background: '#ecfdf5'
  },
  {
    title: 'Ordem de execução',
    description:
      'Os follow-ups vencidos são processados do mais antigo para o mais recente. Para o mesmo horário, o criado primeiro também é executado primeiro.',
    icon: TimerReset,
    color: '#b45309',
    background: '#fffbeb'
  },
  {
    title: 'Ação Agenda',
    description:
      'A opção Agenda não envia mensagens nem e-mails. O follow-up permanece pendente mesmo depois da data e só é concluído quando o usuário marca a conclusão manualmente.',
    icon: CalendarClock,
    color: '#7c3aed',
    background: '#f5f3ff'
  }
] as const

type InformationChannel = 'whatsapp' | 'messenger' | 'direct' | 'followups'

export default function InformacoesPage() {
  const { isMobile } = useViewportBreakpoint()
  const [activeChannel, setActiveChannel] = useState<InformationChannel>('whatsapp')
  const isWhatsApp = activeChannel === 'whatsapp'
  const isMessenger = activeChannel === 'messenger'
  const isDirect = activeChannel === 'direct'
  const isFollowUps = activeChannel === 'followups'
  const rules = isWhatsApp
    ? whatsAppRules
    : isMessenger
      ? messengerRules
      : isDirect
        ? directRules
        : followUpRules
  const channelLabel = isWhatsApp
    ? 'WhatsApp'
    : isMessenger
      ? 'Facebook Messenger'
      : isDirect
        ? 'Instagram Direct'
        : 'Follow-ups'

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
        overflow: 'hidden'
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

      <div
        style={{
          width: '100%',
          maxWidth: 920,
          flexShrink: 0,
          boxSizing: 'border-box'
        }}
      >
            <div
              role="tablist"
              aria-label="Canal de atendimento"
              style={{
                width: isMobile ? '100%' : 720,
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(2, minmax(0, 1fr))'
                  : 'repeat(4, minmax(0, 1fr))',
                gap: 4,
                padding: 4,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              {([
                { key: 'whatsapp' as const, label: 'WhatsApp', color: '#15803d' },
                { key: 'messenger' as const, label: 'Messenger', color: '#006fd6' },
                { key: 'direct' as const, label: 'Direct', color: '#c13584' },
                { key: 'followups' as const, label: 'Follow-ups', color: '#7c3aed' }
              ]).map((channel) => {
                const isActive = activeChannel === channel.key

                return (
                  <button
                    key={channel.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveChannel(channel.key)}
                    style={{
                      minWidth: 0,
                      height: 42,
                      border: 'none',
                      borderRadius: 6,
                      background: isActive
                        ? channel.key === 'whatsapp'
                          ? '#ecfdf5'
                          : channel.key === 'messenger'
                            ? '#eaf4ff'
                            : channel.key === 'direct'
                              ? '#fff0f6'
                              : '#f5f3ff'
                        : 'transparent',
                      color: isActive ? channel.color : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {channel.key === 'whatsapp' ? (
                      <MessageCircle size={17} />
                    ) : channel.key === 'direct' ? (
                      <Instagram size={17} />
                    ) : channel.key === 'followups' ? (
                      <CalendarClock size={17} />
                    ) : (
                      <Send size={17} />
                    )}
                    <span>{channel.label}</span>
                  </button>
                )
              })}
            </div>
      </div>

      <div
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <main
          style={{
            width: '100%',
            maxWidth: 920,
            display: 'grid',
            alignContent: 'start',
            gap: 24,
            paddingBottom: isMobile ? 92 : 24,
            boxSizing: 'border-box'
          }}
        >

        <section>
          <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2 }}>
            {isFollowUps ? 'Regras dos Follow-ups' : `Regras do ${channelLabel}`}
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
            {isFollowUps
              ? 'Entenda como funcionam as ações automáticas e os follow-ups de Agenda concluídos manualmente.'
              : isWhatsApp
              ? 'Entenda como uma conversa é aberta, mantida ativa e retomada no WhatsApp.'
              : `Entenda quando a equipe pode responder e como a janela do ${isDirect ? 'Instagram Direct' : 'Messenger'} funciona.`}
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
              color: isFollowUps ? '#0f766e' : isWhatsApp ? '#7c3aed' : isDirect ? '#c13584' : '#006fd6',
              background: isFollowUps ? '#f0fdfa' : isWhatsApp ? '#f5f3ff' : isDirect ? '#fff0f6' : '#eaf4ff'
            }}
          >
            {isFollowUps ? <Bot size={20} /> : <Send size={20} />}
          </span>
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2 }}>
              {isFollowUps
                ? 'Ações do follow-up'
                : isWhatsApp
                  ? 'Envio de template'
                  : 'Retomada da conversa'}
            </h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              {isFollowUps
                ? 'Cada ação segue regras próprias no momento agendado.'
                : isWhatsApp
                ? (
                    <>
                      O template precisa ser aprovado previamente pela Meta e <strong style={{ color: '#111827', fontWeight: 800 }}>seu envio possui custo</strong>. Quando o cliente responder, a janela de atendimento de 24 horas será aberta e as mensagens livres serão liberadas.
                    </>
                  )
                : isDirect
                  ? 'O Flow não envia templates pelo Instagram Direct. Após o encerramento da janela, aguarde a pessoa enviar uma nova mensagem ou faça o contato diretamente pelo Instagram.'
                  : 'O Flow não envia templates pelo Messenger. Após o encerramento da janela, aguarde a pessoa enviar uma nova mensagem ou faça o contato pela Página no Facebook.'}
            </p>

            {isFollowUps ? (
              <div style={{ marginTop: 14, display: 'grid' }}>
                {([
                  {
                    channel: 'WhatsApp',
                    rule: 'O envio automático usa o template selecionado e pode acontecer mesmo fora da janela de 24 horas. Telefone completo, template ativo e variáveis obrigatórias precisam estar preenchidos; o envio possui custo da Meta.'
                  },
                  {
                    channel: 'Messenger',
                    rule: 'Envia a mensagem somente se o cliente falou pelo Messenger nas últimas 24 horas. Fora da janela, a ação passa para Ação manual.'
                  },
                  {
                    channel: 'Direct',
                    rule: 'Envia a mensagem somente se o cliente falou pelo Direct nas últimas 24 horas. Fora da janela, a ação passa para Ação manual.'
                  },
                  {
                    channel: 'E-mail',
                    rule: 'Pode ser enviado a qualquer momento e exige destinatário válido, assunto e conteúdo.'
                  },
                  {
                    channel: 'Agenda',
                    rule: 'Não realiza envio por canal externo. Permanece pendente mesmo após a data, entra na esteira de notificações internas do Flow e só é concluído quando o usuário marca o follow-up como concluído.'
                  }
                ]).map((item) => (
                  <div key={item.channel} style={{ padding: '11px 0', borderTop: '1px solid #e5e7eb' }}>
                    <strong style={{ color: '#111827', fontSize: 14 }}>{item.channel}</strong>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                      {item.rule}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {isFollowUps ? (
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
                color: '#166534',
                background: '#ecfdf5'
              }}
            >
              <CircleCheckBig size={20} />
            </span>

            <div>
              <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2 }}>
                Resultados e acompanhamento
              </h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                O status exibido informa o resultado da ação ou se ainda depende da conclusão do usuário.
              </p>

              <div style={{ marginTop: 14, display: 'grid' }}>
                {([
                  {
                    title: 'Concluído',
                    description: 'Ações automáticas concluem o follow-up após a execução. Na ação Agenda, a conclusão acontece somente quando o usuário marca o follow-up como concluído.'
                  },
                  {
                    title: 'Agenda pendente',
                    description: 'A passagem da data não conclui nem altera automaticamente o follow-up de Agenda; ele continua pendente até a ação manual do usuário.'
                  },
                  {
                    title: 'Ação manual',
                    description: 'Indica que Messenger ou Direct estavam fora da janela de 24 horas. O follow-up permanece pendente.'
                  },
                  {
                    title: 'Falha no envio',
                    description: 'A ação não é repetida automaticamente. Corrija os dados e edite o follow-up para tentar novamente.'
                  },
                  {
                    title: 'Lembrete de 1 hora',
                    description: 'Quando essa notificação estiver habilitada, o Flow avisa uma vez sobre follow-ups pendentes que vencem na próxima hora.'
                  }
                ]).map((item) => (
                  <div key={item.title} style={{ padding: '11px 0', borderTop: '1px solid #e5e7eb' }}>
                    <strong style={{ color: '#111827', fontSize: 14 }}>{item.title}</strong>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isWhatsApp ? (
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
                color: '#047857',
                background: '#ecfdf5'
              }}
            >
              <CircleDollarSign size={20} />
            </span>

            <div>
              <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2 }}>
                Custos dos templates
              </h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                Valores cobrados por cada template enviado.
              </p>

              <div style={{ marginTop: 14, display: 'grid' }}>
                {([
                  {
                    name: 'Template Marketing',
                    tag: 'Mkt',
                    price: 'R$ 0,30',
                    tagColor: '#9f1239',
                    tagBackground: '#ffe4e6'
                  },
                  {
                    name: 'Template Utilitário',
                    tag: 'Util',
                    price: 'R$ 0,04',
                    tagColor: '#1d4ed8',
                    tagBackground: '#dbeafe'
                  }
                ]).map((template) => (
                  <div
                    key={template.tag}
                    style={{
                      minHeight: 42,
                      padding: '10px 0',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16
                    }}
                  >
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#374151', fontSize: 14, fontWeight: 600 }}>{template.name}</span>
                      <span
                        style={{
                          color: template.tagColor,
                          background: template.tagBackground,
                          borderRadius: 6,
                          padding: '5px 8px',
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1
                        }}
                      >
                        {template.tag}
                      </span>
                    </div>
                    <strong style={{ color: '#111827', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {template.price}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        </main>
      </div>
    </section>
  )
}
