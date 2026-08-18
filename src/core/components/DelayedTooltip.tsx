import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

type DelayedTooltipProps = {
  children: ReactNode
  content: string
  delayMs?: number
}

type TooltipPosition = {
  left: number
  top: number
  showAbove: boolean
}

export const DelayedTooltip = ({
  children,
  content,
  delayMs = 1_200
}: DelayedTooltipProps) => {
  const tooltipId = useId()
  const timerRef = useRef<number | null>(null)
  const [position, setPosition] = useState<TooltipPosition | null>(null)

  const hideTooltip = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setPosition(null)
  }

  const scheduleTooltip = (anchor: HTMLElement) => {
    hideTooltip()
    timerRef.current = window.setTimeout(() => {
      const bounds = anchor.getBoundingClientRect()
      const halfTooltipWidth = Math.min(160, (window.innerWidth - 24) / 2)

      setPosition({
        left: Math.min(
          window.innerWidth - halfTooltipWidth - 12,
          Math.max(halfTooltipWidth + 12, bounds.left + bounds.width / 2)
        ),
        top: window.innerHeight - bounds.bottom < 90 ? bounds.top - 8 : bounds.bottom + 8,
        showAbove: window.innerHeight - bounds.bottom < 90
      })
      timerRef.current = null
    }, delayMs)
  }

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <>
      <span
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={(event) => scheduleTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => scheduleTooltip(event.currentTarget)}
        onBlur={hideTooltip}
        style={{ display: 'block', minWidth: 0, maxWidth: '100%' }}
      >
        {children}
      </span>

      {position ? createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            zIndex: 1000,
            left: position.left,
            top: position.top,
            transform: position.showAbove
              ? 'translate(-50%, -100%)'
              : 'translateX(-50%)',
            maxWidth: 'min(320px, calc(100vw - 24px))',
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: '#111827',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.35,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            pointerEvents: 'none'
          }}
        >
          {content}
        </span>,
        document.body
      ) : null}
    </>
  )
}