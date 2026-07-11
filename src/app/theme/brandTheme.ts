export const brandTheme = {
  primary: '#1D4D33',
  primaryHover: '#275E3F',
  primaryLight: '#E8F4EC',
  primaryBorder: '#B7D9C2',
  primaryDark: '#123521'
} as const

export const interactionTheme = {
  sidebarItemHoverBackground: brandTheme.primaryLight,
  sidebarItemActiveBackground: brandTheme.primaryLight,
  sidebarItemActiveColor: brandTheme.primary,
  sidebarItemDefaultColor: '#94a3b8',
  primaryButtonBackground: brandTheme.primary,
  primaryButtonHoverBackground: brandTheme.primaryHover,
  inputFocusBorderColor: brandTheme.primary,
  inputFocusBoxShadow: `0 0 0 3px ${brandTheme.primaryLight}`,
  clickableCardHoverBackground: brandTheme.primaryLight,
  activeIconColor: brandTheme.primary
} as const
