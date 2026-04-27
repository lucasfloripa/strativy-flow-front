import styled, { createGlobalStyle } from 'styled-components'
import type { FollowUpBoardStatus, LeadSourceBadgeType, LeadTemperatureBadgeType } from './boardPage.store'

type ThemeMode = 'light' | 'dark'

export const GlobalStyle = createGlobalStyle<{ $themeMode: ThemeMode }>`
  :root {
    color-scheme: ${(props) => (props.$themeMode === 'dark' ? 'dark' : 'light')};
    --app-bg: ${(props) => (props.$themeMode === 'dark' ? '#111317' : '#f5f5f5')};
    --app-footer-bg: ${(props) => (props.$themeMode === 'dark' ? '#1a1f29' : '#eceff3')};
    --app-footer-border: ${(props) => (props.$themeMode === 'dark' ? '#2d3440' : '#d9dee5')};
    --app-surface: ${(props) => (props.$themeMode === 'dark' ? '#191c22' : '#ffffff')};
    --app-surface-soft: ${(props) => (props.$themeMode === 'dark' ? '#15181e' : '#fbfbfb')};
    --app-border: ${(props) => (props.$themeMode === 'dark' ? '#2a2f39' : '#dcdcdc')};
    --app-border-strong: ${(props) => (props.$themeMode === 'dark' ? '#3a404c' : '#2b2b2b')};
    --app-divider: ${(props) => (props.$themeMode === 'dark' ? '#262b35' : '#e6e6e6')};
    --app-text: ${(props) => (props.$themeMode === 'dark' ? '#eef0f4' : '#111111')};
    --app-text-muted: ${(props) => (props.$themeMode === 'dark' ? '#b5bbc7' : '#6b6b6b')};
    --app-hover: ${(props) => (props.$themeMode === 'dark' ? '#232833' : '#f5f5f5')};
    --status-scheduled-text: ${(props) => (props.$themeMode === 'dark' ? '#7fb5ff' : '#1d4ed8')};
    --status-today-text: ${(props) => (props.$themeMode === 'dark' ? '#ffd866' : '#d97706')};
    --status-overdue-text: ${(props) => (props.$themeMode === 'dark' ? '#ff8a80' : '#dc2626')};
    --status-done-text: ${(props) => (props.$themeMode === 'dark' ? '#66e1a3' : '#15803d')};
    --status-scheduled-border: ${(props) => (props.$themeMode === 'dark' ? '#3b82f6' : '#3b82f6')};
    --status-today-border: ${(props) => (props.$themeMode === 'dark' ? '#fbbf24' : '#facc15')};
    --status-overdue-border: ${(props) => (props.$themeMode === 'dark' ? '#ff6b63' : '#ff3b30')};
    --status-done-border: ${(props) => (props.$themeMode === 'dark' ? '#34d399' : '#22c55e')};
    --status-scheduled-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.10)')};
    --status-today-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(251, 191, 36, 0.22)' : 'rgba(250, 204, 21, 0.10)')};
    --status-overdue-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(255, 107, 99, 0.24)' : 'rgba(255, 59, 48, 0.10)')};
    --status-done-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(52, 211, 153, 0.22)' : 'rgba(34, 197, 94, 0.10)')};
    --status-scheduled-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.07)')};
    --status-today-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(250, 204, 21, 0.07)')};
    --status-overdue-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(255, 107, 99, 0.18)' : 'rgba(255, 59, 48, 0.08)')};
    --status-done-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(52, 211, 153, 0.16)' : 'rgba(34, 197, 94, 0.07)')};
    --status-scheduled-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(59, 130, 246, 0.26)' : 'rgba(59, 130, 246, 0.12)')};
    --status-today-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(251, 191, 36, 0.28)' : 'rgba(250, 204, 21, 0.12)')};
    --status-overdue-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(255, 107, 99, 0.28)' : 'rgba(255, 59, 48, 0.13)')};
    --status-done-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(52, 211, 153, 0.24)' : 'rgba(34, 197, 94, 0.12)')};
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    min-height: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    background: var(--app-bg);
    color: var(--app-text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  }
`

export const Page = styled.div`
  height: calc(var(--board-app-height, 1vh) * 100);
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  background: var(--app-bg);
  color: var(--app-text);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

export const SettingsButton = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`

export const SettingsDropdownWrapper = styled.div`
  position: relative;
`

export const SettingsDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 115px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 90;
`

export const SettingsDropdownOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

export const SettingsOptionWithIcon = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const PreferencesBody = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 12px;
  padding: 12px;
`

export const PreferenceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

export const PreferenceLabel = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: var(--app-text);
`

export const PreferenceToggle = styled.button<{ $active: boolean }>`
  width: 46px;
  height: 26px;
  padding: 3px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: ${(props) => (props.$active ? 'var(--app-text)' : 'var(--app-surface)')};
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$active ? 'flex-end' : 'flex-start')};
  cursor: pointer;
  transition: background 0.16s ease;
`

export const PreferenceToggleDot = styled.span<{ $active: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: ${(props) => (props.$active ? 'var(--app-surface)' : 'var(--app-text)')};
`

export const BoardOuter = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  margin: 0 auto;
  padding: 4px 10px calc(52px + env(safe-area-inset-bottom, 0px));
  overflow: hidden;

  @media (max-width: 450px) {
    padding: 2px 6px calc(44px + env(safe-area-inset-bottom, 0px));
  }
`

export const BoardShell = styled.div`
  height: 100%;
  background: var(--app-bg);
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;

  @media (max-width: 450px) {
    padding: 6px 8px 10px;
  }
`

export const BoardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 6px 12px 6px;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--app-bg);
  border-bottom: 1px solid var(--app-divider);

  @media (max-width: 450px) {
    gap: 8px;
    padding: 2px 2px 8px;
  }
`

export const BoardHeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: space-between;
`

export const BoardSelectorWrapper = styled.div`
  position: relative;
`

export const BoardTitleButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
`

export const BoardHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

export const BoardHeaderActionsMobile = styled.div`
  display: none;
`

export const MobileNavMenuDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(340px, calc(100vw - 24px));
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 95;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 450px) {
    width: min(200px, calc(100vw - 24px));
  }
`

export const MobileNavMenuSectionTitle = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 2px 2px 0;
`

export const MobileNavFilterSearchInput = styled.input`
  width: 100%;
  height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: var(--app-bg);
  color: var(--app-text);
  padding: 0 10px;
  font-size: 13px;

  &::placeholder {
    color: var(--app-text-muted);
  }

  &:focus {
    outline: 2px solid #7dd3fc55;
    outline-offset: 0;
  }

  @media (max-width: 450px) {
    font-size: 16px;
  }
`

export const MobileNavFiltersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const BoardTitle = styled.div`
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
  color: var(--app-text);

  @media (max-width: 450px) {
    font-size: 16px;
  }
`

export const BoardTitleCaret = styled.span`
  font-size: 12px;
  color: var(--app-text-muted);
  line-height: 1;
`

export const BoardSelectorDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 260px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 80;

  @media (max-width: 450px) {
    min-width: 0;
    width: min(320px, calc(100vw - 24px));
  }
`

export const BoardSelectorOption = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--app-hover);
  }
`

export const BoardOptionCircle = styled.span<{ $selected: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 1px solid #111111;
  background: #ffffff;
  flex: 0 0 auto;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #111111;
    transform: translate(-50%, -50%) scale(${(props) => (props.$selected ? 1 : 0)});
    transition: transform 0.12s ease;
  }
`

export const BoardOptionName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
`

export const FiltersDropdownWrapper = styled.div`
  position: relative;
  z-index: 1200;
`

export const FiltersDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 150px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 1300;
`

export const FiltersDropdownOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: var(--app-hover);
  }
`

export const FiltersOptionLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
`

export const FiltersCheckPlaceholder = styled.span`
  width: 14px;
  height: 14px;
  display: inline-block;
`

export const FiltersGroup = styled.div`
  & + & {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--app-divider);
  }
`

export const FiltersGroupTitle = styled.div`
  padding: 4px 10px 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.35px;
`

export const FiltersSubmenuWrapper = styled.div`
  position: relative;

  &:hover [data-filters-submenu='panel'],
  &:focus-within [data-filters-submenu='panel'] {
    display: block;
  }
`

export const FiltersSubmenuTrigger = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: var(--app-hover);
  }
`

export const FiltersSubmenuChevron = styled.span`
  display: inline-block;
  font-size: 16px;
  line-height: 1;
  color: var(--app-text-muted);
`

export const FiltersSubmenuPanel = styled.div`
  display: none;
  position: absolute;
  top: 0;
  left: calc(100% + 8px);
  min-width: 170px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 1400;
`

export const SearchDropdownWrapper = styled.div`
  position: relative;
`

export const SearchDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 250px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 90;
`

export const HeaderActionButton = styled.button`
  min-height: 34px;
  border: 1px solid var(--app-border-strong);
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

export const BottomBrand = styled.div`
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  z-index: 50;
  pointer-events: none;

  @media (max-width: 450px) {
    left: 10px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    gap: 8px;
  }
`

export const BottomFixedBackground = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(64px + env(safe-area-inset-bottom, 0px));
  background: var(--app-footer-bg);
  z-index: 40;
  pointer-events: none;

  @media (max-width: 450px) {
    height: calc(40px + env(safe-area-inset-bottom, 0px));
  }
`

export const BottomBrandDot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: var(--app-text);
`

export const BottomBrandText = styled.span`
  color: var(--app-text);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;

  @media (max-width: 450px) {
    font-size: 16px;
  }
`

export const BottomVersion = styled.button`
  position: fixed;
  right: 24px;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  z-index: 50;
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    color: var(--app-text);
  }

  &:focus-visible {
    outline: none;
    color: var(--app-text);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
  }

  @media (max-width: 450px) {
    right: 10px;
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    font-size: 11px;
  }
`
export const ErrorBadge = styled.div`
  border: 1px solid #ffdddd;
  background: #fff2f2;
  color: #7a0b0b;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  max-width: 520px;
`

export const ColumnsArea = styled.div`
  flex: 1;
  height: 0;
  min-height: 0;
  margin-top: 12px;
  overflow: auto;
  scrollbar-gutter: stable;

  @media (max-width: 450px) {
    margin-top: 8px;
    overflow-x: hidden;
    overflow-y: auto;
  }
`

export const ColumnsRow = styled.div`
  display: flex;
  width: max-content;
  min-width: 100%;
  gap: 12px;
  align-items: flex-start;
  overflow: visible;
  padding-bottom: 10px;

  @media (max-width: 450px) {
    width: 100%;
    min-width: 100%;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 6px;
  }
`

export const Column = styled.div`
  min-width: 292px;
  max-width: 292px;
  border: 1px solid var(--app-border-strong);
  border-radius: 16px;
  background: var(--app-surface);
  padding: 10px;

  @media (max-width: 450px) {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    padding: 9px;
  }
`

export const ColumnHeader = styled.div<{ $isOver?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 10px 6px;
  border-radius: 12px;
  background: ${(props) => (props.$isOver ? 'var(--app-hover)' : 'transparent')};
  transition: background 0.12s ease;
`

export const ColumnAccordionToggle = styled.button<{ $open: boolean }>`
  display: none;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--app-text-muted);
  padding: 0;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;

  svg {
    transform: rotate(${(props) => (props.$open ? 90 : 0)}deg);
    transition: transform 0.16s ease;
  }

  &:hover {
    color: var(--app-text);
  }

  @media (max-width: 450px) {
    display: inline-flex;
  }
`

export const ColumnTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const ColumnName = styled.div`
  font-weight: 900;
  letter-spacing: -0.2px;
  color: var(--app-text);
`

export const ColumnCount = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: var(--app-text-muted);
  line-height: 1;
`

export const ColumnMoreButton = styled.button`
  border: none;
  background: transparent;
  color: #555555;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  font-weight: 900;

  &:hover {
    color: #111111;
  }
`

export const ColumnBody = styled.div<{ $isOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 14px;
  background: ${(props) => (props.$isOver ? '#f7f7f7' : 'transparent')};
  transition: background 0.15s ease;
`

export const AddLeadButton = styled.button`
  width: 100%;
  border: 1px dashed var(--app-border);
  border-radius: 14px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--app-hover);
    border-color: var(--app-border);
  }
`

export const AddColumnButton = styled.button`
  min-width: 292px;
  max-width: 292px;
  height: 100%;
  border: 1px dashed var(--app-border);
  border-radius: 16px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  padding: 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--app-hover);
    border-color: var(--app-border);
  }

  @media (max-width: 450px) {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    min-height: 0;
    height: auto;
    padding: 12px 10px;
    justify-content: flex-start;
    font-size: 13px;
    font-weight: 700;
  }
`

export const LeadCard = styled.div<{ $menuOpen?: boolean }>`
  position: relative;
  z-index: ${(props) => (props.$menuOpen ? 140 : 0)};
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--app-border-strong);
  border-radius: 16px;
  background: var(--app-surface);
  padding: 13px;
  cursor: grab;
  user-select: none;
  overflow: visible;

  &:active {
    cursor: grabbing;
  }

  &:focus-within {
    z-index: 90;
  }

  @media (max-width: 450px) {
    touch-action: pan-y;
  }
`

export const LeadFollowUpBlock = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
`

export const LeadFollowUpContent = styled.div<{ $singleLine?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 34px;
  justify-content: ${(props) => (props.$singleLine ? 'center' : 'flex-start')};
`

export const LeadSectionDivider = styled.div`
  margin-top: 10px;
  border-top: 1px solid var(--app-divider);
`

export const LeadFollowUpCount = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: var(--app-text);
`

export const LeadFollowUpNextLine = styled.div<{ $status: FollowUpBoardStatus }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => {
    switch (props.$status) {
      case 'none':
        return 'var(--app-text)'
      case 'scheduled':
        return 'var(--status-scheduled-text)'
      case 'today':
        return 'var(--status-today-text)'
      case 'overdue':
        return 'var(--status-overdue-text)'
      default:
        return 'var(--app-text-muted)'
    }
  }};
`

export const LeadTopRow = styled.div`
  display: flex;
  align-items: center;
`

export const LeadTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

export const LeadHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
`

export const LeadHeaderActions = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

export const LeadMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
`

export const LeadBadgesRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  flex-wrap: nowrap;
  min-width: 0;
  overflow: hidden;
`

export const LeadName = styled.div`
  width: 190px;
  font-weight: 900;
  letter-spacing: -0.2px;
  line-height: 1.2;

  @media (max-width: 450px) {
    width: 100%;
  }
`

export const LeadSourceBadge = styled.span<{ $type: LeadSourceBadgeType }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  color: ${(props) => (props.$type === 'default' ? '#2f2f2f' : '#ffffff')};
  letter-spacing: 0.2px;
  border: ${(props) => (props.$type === 'default' ? '1px solid #d4d4d4' : 'none')};
  background: ${(props) => {
    switch (props.$type) {
      case 'whatsapp':
        return '#25d366'
      case 'metaads':
        return '#0ea5e9'
      default:
        return 'linear-gradient(180deg, #f1f1f1 0%, #dddddd 100%)'
    }
  }};
  box-shadow: ${(props) => (props.$type === 'default'
    ? 'inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 2px rgba(0, 0, 0, 0.08)'
    : 'none')};
`

export const LeadAgeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15px;
  color: #2f2f2f;
  border: 1px solid #d4d4d4;
  background: linear-gradient(180deg, #f1f1f1 0%, #dddddd 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    0 1px 2px rgba(0, 0, 0, 0.08);
`

export const LeadTemperatureBadge = styled.span<{ $type: LeadTemperatureBadgeType }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15px;
  color: ${(props) => (props.$type === 'cold' ? '#0f172a' : '#ffffff')};
  border: ${(props) => (props.$type === 'cold' ? '1px solid #93c5fd' : 'none')};
  background: ${(props) => {
    switch (props.$type) {
      case 'hot':
        return 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
      case 'warm':
        return 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
      case 'cold':
        return 'linear-gradient(180deg, #e0f2fe 0%, #bfdbfe 100%)'
      default:
        return 'linear-gradient(180deg, #f1f1f1 0%, #dddddd 100%)'
    }
  }};
  box-shadow: ${(props) => (props.$type === 'cold'
    ? 'inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 1px 2px rgba(0, 0, 0, 0.08)'
    : 'none')};
`

export const LeadNewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15px;
  color: #111111;
  border: 1px solid #e3c94a;
  background: linear-gradient(180deg, #fff06a 0%, #ffd941 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.08);
`

export const LeadNewFire = styled.span`
  display: inline-flex;
  align-items: center;
  line-height: 1;
  font-size: 11px;
`

export const LeadQuickActionsWrapper = styled.div<{ $alignToFollowupLines?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: ${(props) => (props.$alignToFollowupLines ? 'center' : 'auto')};
`

export const LeadQuickActionsButton = styled.button`
  border: none;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a3a3a3;
  cursor: pointer;

  &:hover {
    color: var(--app-text);
  }
`

export const LeadQuickActionsDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 170px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 190;
`

export const LeadQuickActionsOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  &:hover {
    background: var(--app-hover);
  }
`

export const LeadQuickActionsSubmenuWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

export const LeadQuickActionsChevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  font-size: 16px;
  line-height: 1;
  color: var(--app-text-muted);
  transform: rotate(${(p) => (p.$open ? '90deg' : '0deg')});
  transition: transform 0.15s;
`

export const LeadQuickActionsSubmenu = styled.div`
  padding: 4px 0 4px 10px;
`

export const LeadQuickActionsSubmenuOption = styled.button`
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 7px;

  &:hover {
    background: var(--app-hover);
  }
`

export const LeadMoveMenuWrapper = styled.div`
  position: relative;
  display: none;
  align-items: center;
  justify-content: center;

  @media (max-width: 450px) {
    display: inline-flex;
  }
`

export const LeadMoveButton = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a3a3a3;
  cursor: pointer;

  &:hover {
    color: var(--app-text);
  }
`

export const LeadMoveDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 170px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 180;
`

export const LeadMoveOptionButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$active ? 'var(--app-hover)' : 'transparent')};
  color: var(--app-text);
  text-align: left;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 800 : 700)};
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

export const LeadFavoriteButton = styled.button<{ $active: boolean }>`
  border: 0;
  background: transparent;
  padding: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$active ? '#facc15' : '#a3a3a3')};
  cursor: pointer;

  svg {
    transform: scale(${(props) => (props.$active ? 1.3 : 1)});
    transition:
      transform 0.18s ease,
      fill 0.18s ease,
      color 0.18s ease;
    fill: ${(props) => (props.$active ? '#facc15' : 'transparent')};
  }

  &:hover svg {
    transform: scale(1.3);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.75;
  }
`

export const LeadMessage = styled.div`
  margin-top: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text);
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 12px;
  padding: 10px;
  line-height: 1.35;
  max-height: 88px;
  overflow: hidden;
`

export const EmptyState = styled.div`
  border: 1px dashed var(--app-border);
  border-radius: 16px;
  padding: 18px;
  background: var(--app-surface-soft);
`

export const EmptyTitle = styled.div`
  font-weight: 900;
  font-size: 14px;
  margin-bottom: 6px;
`

export const EmptyText = styled.div`
  font-size: 13px;
  color: var(--app-text-muted);
  font-weight: 600;
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;

  @media (max-width: 920px) {
    padding: 16px;
  }

  @media (max-width: 640px) {
    padding: 12px;
  }
`

export const ModalCard = styled.div`
  width: min(620px, calc(100vw - 48px));
  max-height: min(86vh, 900px);
  overflow-y: auto;
  border: 1px solid var(--app-divider);
  border-radius: 20px;
  background: var(--app-surface);
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);

  @media (max-width: 920px) {
    width: clamp(320px, calc(100vw - 300px), 620px);
    max-height: calc(100vh - 48px);
    padding: 16px;
    border-radius: 18px;
  }

  @media (max-width: 640px) {
    width: calc(100vw - 44px);
    max-height: calc(100vh - 24px);
    padding: 14px;
    border-radius: 16px;
  }
`

export const SettingsModalCard = styled.div`
  width: min(388px, calc(100vw - 48px));
  border: 1px solid var(--app-divider);
  border-radius: 20px;
  background: var(--app-surface);
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);

  @media (max-width: 640px) {
    width: calc(100vw - 44px);
  }
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--app-divider);
  margin-bottom: 18px;

  @media (max-width: 850px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`

export const SettingsModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
`

export const ModalTitleArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 850px) {
    width: 100%;
  }
`

export const ModalTitleInlineRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
`

export const ModalTitleSeparator = styled.span`
  color: var(--app-text-muted);
  font-size: 14px;
  font-weight: 700;
`

export const ModalTitleColumnName = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: var(--app-text-muted);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const ModalTitleColumnToggle = styled.button`
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  svg {
    transform: rotate(90deg);
  }

  &:hover {
    color: var(--app-text);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const MoveColumnMenuWrapper = styled.div`
  position: relative;
`

export const MoveColumnDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
  padding: 10px;
  z-index: 45;
`

export const MoveColumnLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.35px;
  margin-bottom: 6px;
`

export const MoveColumnOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const MoveColumnOptionButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$active ? 'var(--app-hover)' : 'transparent')};
  color: var(--app-text);
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 800 : 600)};
  text-align: left;
  padding: 7px 9px;
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const ModalTitle = styled.div`
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.3px;
`

export const ModalTitleClickable = styled(ModalTitle)`
  cursor: pointer;
`

export const ModalHeaderEditInput = styled.input`
  width: fit-content;
  min-width: 220px;
  max-width: 100%;
  min-height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 10px;
  outline: none;
  font-size: 14px;
  font-weight: 700;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

export const ModalHeaderRightArea = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  @media (max-width: 850px) {
    width: 100%;
    justify-content: flex-start;
  }
`

export const HeaderIconButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 850px) {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`

export const SettingsModalTitle = styled.div`
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
`


export const SettingsCloseIconButton = styled.button<{ $active?: boolean; $hideOnNarrowMobile?: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid ${(props) => (props.$active ? 'var(--app-border-strong)' : 'var(--app-border)')};
  background: ${(props) => (props.$active ? 'var(--app-hover)' : 'var(--app-surface-soft)')};
  color: ${(props) => (props.$active ? 'var(--app-text)' : 'var(--app-text-muted)')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
    color: var(--app-text);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 450px) {
    display: ${(props) => (props.$hideOnNarrowMobile ? 'none' : 'inline-flex')};
  }
`

export const ModalFavoriteIconButton = styled.button<{ $active: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: ${(props) => (props.$active ? '#facc15' : '#9a9a9a')};

  svg {
    transform: scale(1);
    transition:
      fill 0.16s ease,
      color 0.16s ease;
    fill: ${(props) => (props.$active ? '#facc15' : 'transparent')};
  }

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const ModalError = styled.div`
  border: 1px solid #ffdddd;
  background: #fff2f2;
  color: #7a0b0b;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
`

export const ModalLoading = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  color: var(--app-text);
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  margin-top: 10px;
`

export const SectionTitle = styled.div`
  margin-top: 18px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 900;
  color: var(--app-text);
`

export const SectionTitleNoMargin = styled.div`
  font-size: 14px;
  font-weight: 900;
  color: var(--app-text);
`

export const LeadTabSectionTitle = styled(SectionTitleNoMargin)`
  margin-bottom: 10px;
`

export const CommentHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`

export const FollowupFiltersTrigger = styled.button`
  border: none;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: var(--app-text-muted);
  }
`

export const CommentMetaText = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--app-text-muted);
`

export const CommentStatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const CommentStatusDot = styled.div<{ $variant: 'saved' | 'dirty' }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${(props) => (props.$variant === 'dirty' ? '#eab308' : '#22c55e')};
  box-shadow: 0 0 0 3px
    ${(props) =>
      props.$variant === 'dirty'
        ? 'rgba(234, 179, 8, 0.12)'
        : 'rgba(34, 197, 94, 0.12)'};
`

export const CommentBox = styled.textarea<{ $variant: 'saved' | 'dirty' }>`
  width: 100%;
  min-height: 220px;
  resize: vertical;
  border-radius: 16px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 14px 16px;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  border: 2px solid
    ${(props) => (props.$variant === 'dirty' ? '#eab308' : '#22c55e')};
  box-shadow: 0 0 0 4px
    ${(props) =>
      props.$variant === 'dirty'
        ? 'rgba(234, 179, 8, 0.10)'
        : 'rgba(34, 197, 94, 0.10)'};

  &::placeholder {
    color: var(--app-text-muted);
  }
`

export const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const InfoRow = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 14px;
  padding: 12px;
`

export const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
`

export const InfoValue = styled.div<{ $preWrap?: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.45;
  white-space: ${(props) => (props.$preWrap ? 'pre-wrap' : 'normal')};
  word-break: break-word;
`

export const VersionNotesCard = styled(InfoRow)`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const VersionNotesList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const VersionNotesItem = styled.li`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.45;
`

export const LeadInfoBlockLabel = styled(InfoLabel)`
  color: var(--app-text);
  font-weight: 900;
`

export const LeadInfoRowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const LeadInfoActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

export const LeadInfoActionButton = styled.button`
  border: none;
  background: transparent;
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 0;

  &:hover {
    opacity: 0.75;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const LeadNextActionCard = styled.button<{
  $status?: FollowUpBoardStatus | 'done'
}>`
  width: 100%;
  border: 2px solid
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-border)'
        case 'today':
          return 'var(--status-today-border)'
        case 'overdue':
          return 'var(--status-overdue-border)'
        case 'done':
          return 'var(--status-done-border)'
        default:
          return 'var(--app-border)'
      }
    }};
  box-shadow: 0 0 0 4px
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-shadow)'
        case 'today':
          return 'var(--status-today-shadow)'
        case 'overdue':
          return 'var(--status-overdue-shadow)'
        case 'done':
          return 'var(--status-done-shadow)'
        default:
          return 'rgba(0, 0, 0, 0.04)'
      }
    }};
  background:
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-bg)'
        case 'today':
          return 'var(--status-today-bg)'
        case 'overdue':
          return 'var(--status-overdue-bg)'
        case 'done':
          return 'var(--status-done-bg)'
        default:
          return 'var(--app-surface-soft)'
      }
    }};
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    transform: scale(1.012);
    background:
      ${(props) => {
        switch (props.$status) {
          case 'scheduled':
            return 'var(--status-scheduled-bg-hover)'
          case 'today':
            return 'var(--status-today-bg-hover)'
          case 'overdue':
            return 'var(--status-overdue-bg-hover)'
          case 'done':
            return 'var(--status-done-bg-hover)'
          default:
            return 'var(--app-hover)'
        }
      }};
  }
`

export const LeadNextActionLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
`

export const LeadNextActionDate = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
  white-space: nowrap;
`

export const LeadNextActionTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.35;
  min-width: 0;
  word-break: break-word;
`

export const LeadNextActionDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--app-text);
  flex-shrink: 0;
`

export const LeadContactLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-muted);
  line-height: 1.45;

  & + & {
    margin-top: 3px;
  }

`

export const LeadContactKey = styled.span`
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--app-text);
  font-weight: 900;
`

export const LeadContactValue = styled.span`
  color: var(--app-text-muted);
  font-weight: 600;
`

export const LeadTemperaturePickerWrapper = styled.div`
  position: relative;
  display: inline-flex;
`

export const LeadTemperaturePickerButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.75;
  }
`

export const LeadTemperatureMenu = styled.div<{ $openUp?: boolean }>`
  position: absolute;
  top: ${(props) => (props.$openUp ? 'auto' : 'calc(100% + 6px)')};
  bottom: ${(props) => (props.$openUp ? 'calc(100% + 6px)' : 'auto')};
  left: 0;
  min-width: 170px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 220;
`

export const LeadTemperatureMenuButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;

  &:hover {
    background: var(--app-hover);
  }
`

export const LeadContactInlineInput = styled.input`
  flex: 1 1 0;
  width: auto;
  max-width: 100%;
  min-width: 0;
  min-height: 30px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 10px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }

`

export const InfoInput = styled.input`
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

export const InfoSelect = styled.select`
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

export const CreateFormCard = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 14px;
  padding: 12px;
`

export const CreateFieldsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const SearchInput = styled.input`
  width: 230px;
  min-height: 34px;
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  outline: none;
  font-size: 14px;
  font-weight: 500;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }

  &::placeholder {
    color: var(--app-text-muted);
  }
`

export const FollowUpList = styled.div`
  display: flex;
  flex-direction: column;
`

export const FollowUpListItem = styled.div<{
  $isCreateRow?: boolean
  $status?: FollowUpBoardStatus | 'done'
}>`
  width: 100%;
  box-sizing: border-box;
  border: 2px solid
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-border)'
        case 'today':
          return 'var(--status-today-border)'
        case 'overdue':
          return 'var(--status-overdue-border)'
        case 'done':
          return 'var(--status-done-border)'
        default:
          return 'var(--app-border)'
      }
    }};
  box-shadow: 0 0 0 4px
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-shadow)'
        case 'today':
          return 'var(--status-today-shadow)'
        case 'overdue':
          return 'var(--status-overdue-shadow)'
        case 'done':
          return 'var(--status-done-shadow)'
        default:
          return 'rgba(0, 0, 0, 0.04)'
      }
    }};
  background:
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-bg)'
        case 'today':
          return 'var(--status-today-bg)'
        case 'overdue':
          return 'var(--status-overdue-bg)'
        case 'done':
          return 'var(--status-done-bg)'
        default:
          return 'var(--app-surface-soft)'
      }
    }};
  border-radius: 14px;
  padding: 6px 12px;
  margin-top: ${(props) => (props.$isCreateRow ? '0' : '10px')};
  transition:
    transform 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    transform: ${(props) => (props.$isCreateRow ? 'none' : 'scale(1.012)')};
    background:
      ${(props) => {
        switch (props.$status) {
          case 'scheduled':
            return 'var(--status-scheduled-bg-hover)'
          case 'today':
            return 'var(--status-today-bg-hover)'
          case 'overdue':
            return 'var(--status-overdue-bg-hover)'
          case 'done':
            return 'var(--status-done-bg-hover)'
          default:
            return 'var(--app-hover)'
        }
      }};
  }
`

export const FollowUpCreateRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  width: 100%;
`

export const FollowUpCreateHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
`

export const FollowUpCreateFooter = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  width: 100%;

  > * {
    width: 100%;
  }
`

export const FollowUpTextInput = styled(InfoInput)`
  flex: 1 1 0;
  min-width: 0;
`

export const FollowUpDateInput = styled(InfoInput)`
  width: auto;
  max-width: none;
  flex: 1 1 0;
  min-width: 0;
`

export const FollowUpInlineCreateIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

export const FollowUpInlineCancelButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
  }
`

export const FollowUpListItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-bottom: 0;
`
export const FollowUpItemDate = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
`

export const FollowUpItemStatus = styled.div<{
  $status?: FollowUpBoardStatus | 'done'
}>`
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
  flex-shrink: 0;
  color: ${(props) => {
    switch (props.$status) {
      case 'overdue':
        return 'var(--status-overdue-text)'
      case 'today':
        return 'var(--status-today-text)'
      case 'scheduled':
        return 'var(--status-scheduled-text)'
      case 'done':
        return 'var(--status-done-text)'
      default:
        return 'var(--app-text-muted)'
    }
  }};
`

export const FollowUpItemMainLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;

  @media (max-width: 450px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
`

export const FollowUpItemMetaLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-shrink: 0;

  ${FollowUpItemDate} {
    flex-shrink: 0;
    white-space: nowrap;
  }

  ${FollowUpItemStatus} {
    white-space: nowrap;
  }

  @media (max-width: 450px) {
    width: 100%;
    gap: 8px;
    flex-wrap: wrap;
  }
`

export const FollowUpItemTitle = styled.button`
  position: relative;
  margin: 0;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
  -webkit-touch-callout: none;

  @media (max-width: 450px) {
    width: 100%;
  }
`



export const FollowUpItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
`

export const FollowUpActionIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

export const ModalFooter = styled.div`
  margin-top: 18px;
`

export const FooterButtons = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`

export const FooterButtonBase = styled.button`
  flex: 1;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

export const NeutralButton = styled(FooterButtonBase)`
  background: var(--app-surface-soft);
  color: var(--app-text);
  border-color: var(--app-border);

  &:hover {
    background: var(--app-hover);
  }
`

export const CreateDropdownButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  &:hover {
    background: var(--app-hover);
  }

  &:focus {
    outline: none;
    background: var(--app-hover);
  }
`

export const DangerButton = styled(FooterButtonBase)`
  background: #d9534f;
  color: #ffffff;
  border-color: #c8423e;
`

export const SuccessButton = styled(FooterButtonBase)`
  background: #2e9b57;
  color: #ffffff;
  border-color: #27874b;
`

export const SettingsModalBody = styled.div`
  display: flex;
  flex-direction: column;
`

export const SettingsActionButton = styled.button`
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  color: var(--app-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

export const SettingsSpacer = styled.div`
  height: 42px;
`

export const AutomationsModalCard = styled.div`
  width: 760px;
  max-width: calc(100vw - 40px);
  height: 468px;
  max-height: calc(100vh - 40px);
  overflow: hidden;
  border: 1px solid var(--app-divider);
  border-radius: 20px;
  background: var(--app-surface);
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
`

export const ColumnSettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  flex: 1;
  min-height: 0;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 12px;
    align-content: start;
    grid-auto-rows: min-content;
  }
`

export const ColumnSettingsSidebar = styled.div`
  border-right: 1px solid var(--app-divider);
  padding-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;

  @media (max-width: 860px) {
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--app-divider);
    padding-right: 0;
    padding-bottom: 10px;
  }
`

export const ColumnSettingsSidebarButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: 1px solid ${(p) => (p.$active ? 'var(--app-border-strong)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'var(--app-border-strong)' : 'transparent')};
  color: ${(p) => (p.$active ? '#ffffff' : 'var(--app-text-muted)')};
  padding: 9px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background: ${(p) => (p.$active ? 'var(--app-border-strong)' : 'var(--app-hover)')};
    color: ${(p) => (p.$active ? '#ffffff' : 'var(--app-text)')};
  }

  @media (max-width: 860px) {
    text-align: center;
  }
`

export const ColumnSettingsMain = styled.div`
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
`

export const ColumnDetailsNameInput = styled.input`
  flex: 0 0 260px;
  width: 260px;
  max-width: 100%;
  min-height: 28px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  outline: none;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;

  &:focus {
    box-shadow: none;
  }
`

export const ColumnDetailsLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  line-height: 1.4;

  & + & {
    margin-top: 6px;
  }
`

export const ColumnDetailsKey = styled.span`
  color: var(--app-text);
  font-weight: 900;
  flex-shrink: 0;
`

export const DetailsValueInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const ColumnColorDropdownWrapper = styled.div`
  position: relative;
`

export const ColumnColorTrigger = styled.button`
  border: none;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  &:hover {
    color: var(--app-text-muted);
  }
`

export const ColumnColorDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 120;
`

export const ColumnColorOptionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ColumnColorOptionButton = styled.button<{
  $active?: boolean
}>`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: var(--app-hover);
  }
`

export const AutomationsTabs = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--app-divider);
  margin-bottom: 20px;
`

export const AutomationsTabButton = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: none;
  cursor: pointer;
  color: ${(p) => (p.$active ? 'var(--app-text)' : 'var(--app-text-muted)')};
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--app-text)' : 'transparent')};
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: var(--app-text);
  }
`

export const AutomationsTabContent = styled.div`
  min-height: 320px;
`

export const AutomationsEntryArea = styled.div`
  position: relative;
  min-height: 320px;
`

export const AutomationsCountBadge = styled.span`
  flex-shrink: 0;
  background: var(--app-hover);
  color: var(--app-text-muted);
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 18px;
`

export const AutomationsEntryMainLine = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  flex: 1;

  ${InfoValue} {
    margin: 0;
    min-width: 0;
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    white-space: normal;
    line-height: 1.35;
    word-break: break-word;
  }

  @media (max-width: 820px) {
    gap: 8px;
  }
`

export const AutomationsEntryListItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-bottom: 0;
`

export const AutomationsEntryItemFollowUpInfo = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  flex-wrap: wrap;
`

export const AutomationsEntryItemSubtext = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  min-width: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
  max-width: none;
  line-height: 1.35;
`

export const AutomationsEntryItemDueAt = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
  white-space: nowrap;
`

export const AutomationsEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 8px;
`

export const AutomationsEmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: var(--app-text);
`

export const AutomationsEmptyText = styled.div`
  font-size: 12px;
  color: var(--app-text-muted);
  font-weight: 500;
  max-width: 280px;
  line-height: 1.5;
`

export const AutomationsCreateButton = styled.button`
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--app-border-strong);
  border-radius: 10px;
  background: var(--app-border-strong);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.86;
  }
`

export const AutomationsPickerOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 17, 17, 0.42);
  border-radius: 12px;
  z-index: 2;
`

export const AutomationsPickerCard = styled.div`
  width: min(380px, 90%);
  max-height: calc(320px - 16px);
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
  padding: 14px;
`

export const AutomationsPickerTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: var(--app-text);
`

export const AutomationsPickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

export const AutomationsPickerCloseButton = styled.button`
  border: none;
  background: none;
  color: var(--app-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s;

  &:hover {
    color: var(--app-text);
  }
`

export const AutomationsPickerSection = styled.div`
  & + & {
    margin-top: 10px;
  }
`

export const AutomationsPickerSectionTrigger = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
`

export const AutomationsPickerSectionTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--app-text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`

export const AutomationsPickerSectionContent = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${(p) => (p.$open ? '1fr' : '0fr')};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  margin-top: ${(p) => (p.$open ? '6px' : '0')};
  pointer-events: ${(p) => (p.$open ? 'auto' : 'none')};
  transition: grid-template-rows 0.22s ease, opacity 0.18s ease, margin-top 0.22s ease;
`

export const AutomationsPickerSectionContentInner = styled.div`
  overflow: hidden;
`

export const AutomationsPickerOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--app-hover);
  }
`

export const AutomationsEntryList = styled.div`
  display: flex;
  flex-direction: column;
`

export const ArchivedColumnPickerWrapper = styled.div`
  position: relative;
`

export const ArchivedPickerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 170;
`

export const AutomationsEntryListItem = styled.div`
  border: 2px solid var(--app-border);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.04);
  background: var(--app-surface-soft);
  border-radius: 14px;
  padding: 6px 12px;

  & + & {
    margin-top: 10px;
  }

  &:hover {
    background: var(--app-hover);
  }
`

export const AutomationsEntryAddButton = styled.button`
  width: 100%;
  margin-top: 10px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: var(--app-hover);
    border-color: var(--app-border);
  }
`

export const AutomationsEntryItemCategory = styled.span`
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.35px;
  color: var(--app-text-muted);
`

// Form Styled Components
export const AutomationsFormSection = styled.div`
  margin-bottom: 18px;

  &:last-of-type {
    margin-bottom: 20px;
  }
`

export const AutomationsFormInput = styled.input`
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--app-text);
  background: var(--app-surface);
  font-family: inherit;

  &::placeholder {
    color: var(--app-text-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--app-border-strong);
    box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.1);
  }
`

export const AutomationsFormRadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const AutomationsFormRadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 8px;
  min-height: 34px;
  box-sizing: border-box;
  border-radius: 8px;
  transition: background 0.15s;

  &:hover {
    background: var(--app-hover);
  }

  input[type='radio'] {
    cursor: pointer;
    accent-color: var(--app-text);
  }

  span {
    font-size: 13px;
    color: var(--app-text);
    font-weight: 500;
    flex: 1;
  }
`

export const AutomationsFormNumberInput = styled.input`
  width: 50px;
  height: 24px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 24px;
  color: var(--app-text);
  background: var(--app-surface);
  font-family: inherit;
  text-align: center;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--app-border-strong);
    box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.1);
  }

  /* Remove spinner arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`

export const AutomationsFormDateInput = styled.input<{ $hasValue: boolean }>`
  width: 128px;
  height: 24px;
  margin-left: auto;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--app-text);
  background: var(--app-surface);
  font-family: inherit;
  box-sizing: border-box;

  &::-webkit-datetime-edit {
    color: ${(p) => (p.$hasValue ? 'var(--app-text)' : 'transparent')};
  }

  &:focus::-webkit-datetime-edit {
    color: var(--app-text);
  }

  &:focus {
    outline: none;
    border-color: var(--app-border-strong);
    box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.1);
  }
`

export const AutomationsFormFooter = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--app-divider);
`

export const AutomationsFormButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$primary ? 'var(--app-border-strong)' : 'var(--app-border)')};
  background: ${(p) => (p.$primary ? 'var(--app-text)' : 'var(--app-surface)')};
  color: ${(p) => (p.$primary ? 'var(--app-bg)' : 'var(--app-text-muted)')};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${(p) => (p.$primary ? 'var(--app-text)' : 'var(--app-hover)')};
    border-color: ${(p) => (p.$primary ? 'var(--app-border-strong)' : 'var(--app-border)')};
    opacity: ${(p) => (p.$primary ? 0.9 : 1)};
  }

  &:active {
    transform: scale(0.98);
  }
`

export const DeleteConfirmText = styled.div`
  font-size: 14px;
  color: #555555;
  font-weight: 600;
  margin-bottom: 18px;
`

export const ColumnMenuWrapper = styled.div`
  position: relative;
`

export const ColumnDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 40;
`

export const ColumnSortMenuWrapper = styled.div`
  position: relative;
`

export const ColumnSortChevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  font-size: 16px;
  line-height: 1;
  color: var(--app-text-muted);
  transform: rotate(${(p) => (p.$open ? '90deg' : '0deg')});
  transition: transform 0.15s;
`

export const ColumnSortActiveDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-text);
  margin-left: 5px;
  vertical-align: middle;
  margin-bottom: 1px;
`

export const ColumnSortSubmenu = styled.div`
  padding: 4px 0 4px 10px;
`

export const ColumnSortOption = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: 8px;
  background: ${(p) => (p.$active ? 'var(--app-hover)' : 'transparent')};
  color: var(--app-text);
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '700' : '500')};
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--app-hover);
  }
`