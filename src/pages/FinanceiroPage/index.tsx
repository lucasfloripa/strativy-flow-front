import { useEffect } from 'react'

export default function FinanceiroPage() {
  useEffect(() => {
    const bodyStyle = document.body.style
    const htmlStyle = document.documentElement.style
    const scrollY = window.scrollY
    const previousBodyOverflow = bodyStyle.overflow
    const previousBodyPosition = bodyStyle.position
    const previousBodyTop = bodyStyle.top
    const previousBodyWidth = bodyStyle.width
    const previousHtmlOverflow = htmlStyle.overflow

    bodyStyle.overflow = 'hidden'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.width = '100%'
    htmlStyle.overflow = 'hidden'

    return () => {
      bodyStyle.overflow = previousBodyOverflow
      bodyStyle.position = previousBodyPosition
      bodyStyle.top = previousBodyTop
      bodyStyle.width = previousBodyWidth
      htmlStyle.overflow = previousHtmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  return (
    <section
      style={{
        height: '100%',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: '#fafbfd',
        boxSizing: 'border-box'
      }}
    >
      <header>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 700 }}>
          Financeiro
        </h1>
      </header>
    </section>
  )
}