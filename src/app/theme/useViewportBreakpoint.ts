import { useEffect, useState } from 'react'

import { DEFAULT_VIEWPORT_BREAKPOINT, getViewportBreakpoint, type ViewportBreakpoint } from './breakpoints'

type UseViewportBreakpointResult = {
  breakpoint: ViewportBreakpoint
  width: number | null
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const getCurrentWindowWidth = (): number | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.innerWidth
}

export const useViewportBreakpoint = (): UseViewportBreakpointResult => {
  const [width, setWidth] = useState<number | null>(() => getCurrentWindowWidth())

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const breakpoint = width === null ? DEFAULT_VIEWPORT_BREAKPOINT : getViewportBreakpoint(width)

  return {
    breakpoint,
    width,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop'
  }
}
