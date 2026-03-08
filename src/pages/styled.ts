import styled, { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    background: #ffffff;
    color: #111;
    font-family: system-ui;
  }
`

export const Page = styled.div`
  min-height: 100vh;
`

export const TopBar = styled.div`
  border-bottom: 1px solid #eee;
  padding: 16px;
`

export const TopBarInner = styled.div`
  max-width: 1200px;
  margin: auto;
  display: flex;
  justify-content: space-between;
`

export const BrandLeft = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

export const LogoDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: black;
`

export const BrandText = styled.div`
  font-weight: 800;
`

export const BoardOuter = styled.div`
  max-width: 1200px;
  margin: auto;
  padding: 20px;
`

export const BoardShell = styled.div`
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 16px;
`

export const BoardHeader = styled.div`
  display: flex;
  justify-content: space-between;
`

export const BoardTitle = styled.div`
  font-weight: 900;
`

export const BoardSubtitle = styled.div`
  font-size: 12px;
  color: #777;
`

export const ErrorBadge = styled.div`
  color: red;
`

export const BoardNav = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`

export const NavPill = styled.div`
  background: black;
  color: white;
  padding: 6px 10px;
  border-radius: 999px;
`

export const NavPillMuted = styled.div`
  border: 1px solid #ddd;
  padding: 6px 10px;
  border-radius: 999px;
`

export const ColumnsArea = styled.div`
  margin-top: 16px;
`

export const ColumnsRow = styled.div`
  display: flex;
  gap: 12px;
`

export const Column = styled.div`
  width: 280px;
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 10px;
`

export const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
`

export const ColumnName = styled.div`
  font-weight: 800;
`

export const ColumnCount = styled.div`
  background: black;
  color: white;
  border-radius: 999px;
  padding: 2px 8px;
`

export const ColumnBody = styled.div<{ $isOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px;
  background: ${({ $isOver }) => ($isOver ? '#f7f7f7' : 'transparent')};
`

export const LeadCard = styled.div`
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
`

export const LeadTopRow = styled.div`
  display: flex;
  gap: 10px;
`

export const Avatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: black;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
`

export const LeadTitle = styled.div`
  display: flex;
  flex-direction: column;
`

export const LeadName = styled.div`
  font-weight: 800;
`

export const LeadSub = styled.div`
  font-size: 12px;
  color: #666;
`

export const LeadMetaRow = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
`

export const Pill = styled.div`
  font-size: 11px;
  border: 1px solid #eee;
  padding: 6px 10px;
  border-radius: 999px;
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
`

export const ModalCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 16px;
  width: 400px;
`

export const ModalTitle = styled.h3`
  margin-top: 0;
`

export const ModalInput = styled.input`
  width: 100%;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #ddd;
`

export const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`

export const ModalButton = styled.button`
  padding: 8px 14px;
`

export const ModalButtonPrimary = styled.button`
  padding: 8px 14px;
  background: black;
  color: white;
  border: none;
  border-radius: 6px;
`