import { useEffect } from 'react'

export default function PrivacyPolicyPage() {
  useEffect(() => {
    const elements = [
      document.documentElement,
      document.body,
      document.getElementById('root')
    ].filter((element): element is HTMLElement => element !== null)
    const previousStyles = elements.map((element) => ({
      element,
      height: element.style.height,
      minHeight: element.style.minHeight,
      overflow: element.style.overflow,
      overflowY: element.style.overflowY,
      overflowX: element.style.overflowX
    }))

    for (const element of elements) {
      element.style.height = 'auto'
      element.style.minHeight = '100%'
      element.style.overflow = 'visible'
      element.style.overflowY = 'auto'
      element.style.overflowX = 'hidden'
    }

    return () => {
      for (const previousStyle of previousStyles) {
        previousStyle.element.style.height = previousStyle.height
        previousStyle.element.style.minHeight = previousStyle.minHeight
        previousStyle.element.style.overflow = previousStyle.overflow
        previousStyle.element.style.overflowY = previousStyle.overflowY
        previousStyle.element.style.overflowX = previousStyle.overflowX
      }
    }
  }, [])

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'Montserrat, sans-serif',
        lineHeight: 1.6,
        color: '#111',
        backgroundColor: '#fff'
      }}
    >
      <h1>Política de Privacidade</h1>
      <p>
        <strong>Última atualização:</strong> 06/03/2026
      </p>

      <p>
        Esta Política de Privacidade descreve como o aplicativo StratifyFlow coleta, usa
        e protege as informações dos usuários.
      </p>

      <h2>1. Informações coletadas</h2>
      <p>
        Podemos coletar dados enviados pelos usuários durante o uso da plataforma,
        incluindo nome, telefone, e-mail, mensagens e informações relacionadas ao
        gerenciamento de leads e atendimento.
      </p>

      <h2>2. Como usamos as informações</h2>
      <p>
        As informações são utilizadas para operar a plataforma, organizar leads, melhorar
        o atendimento, automatizar fluxos de comunicação e fornecer funcionalidades
        relacionadas ao CRM.
      </p>

      <h2>3. Compartilhamento de dados</h2>
      <p>
        Os dados podem ser processados por provedores de infraestrutura, hospedagem e
        serviços de integração, incluindo serviços da Meta e WhatsApp, quando necessário
        para o funcionamento da plataforma.
      </p>

      <h2>4. Armazenamento e segurança</h2>
      <p>
        Adotamos medidas razoáveis de segurança para proteger as informações armazenadas
        contra acesso não autorizado, alteração, divulgação ou destruição.
      </p>

      <h2>5. Direitos do usuário</h2>
      <p>
        O usuário pode solicitar atualização, correção ou exclusão de seus dados, conforme
        aplicável, entrando em contato pelos canais informados abaixo.
      </p>

      <h2>6. Contato</h2>
      <p>
        Para dúvidas sobre esta Política de Privacidade, entre em contato pelo e-mail:
        <br />
        <strong>seu-email@exemplo.com</strong>
      </p>
    </main>
  )
}