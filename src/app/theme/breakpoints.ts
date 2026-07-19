export const BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024
} as const

export type ViewportBreakpoint = 'mobile' | 'tablet' | 'desktop'

export const DEFAULT_VIEWPORT_BREAKPOINT: ViewportBreakpoint = 'desktop'

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobileMax}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tabletMin}px) and (max-width: ${BREAKPOINTS.tabletMax}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktopMin}px)`
} as const

export const getViewportBreakpoint = (width: number): ViewportBreakpoint => {
  if (width <= BREAKPOINTS.mobileMax) {
    return 'mobile'
  }

  if (width <= BREAKPOINTS.tabletMax) {
    return 'tablet'
  }

  return 'desktop'
}

export const isMobileViewport = (width: number): boolean => width <= BREAKPOINTS.mobileMax

export const isTabletViewport = (width: number): boolean => width >= BREAKPOINTS.tabletMin && width <= BREAKPOINTS.tabletMax

export const isDesktopViewport = (width: number): boolean => width >= BREAKPOINTS.desktopMin
