import { Link } from 'react-router-dom'
import styled, { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap');

  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    margin: 0;
    background: #f4f5f7;
    color: #111111;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
  }
`

export const Page = styled.div`
  min-height: 100vh;
  display: flex;
  width: 100%;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

export const LeftPanel = styled.section`
  width: 40%;
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  position: relative;
  z-index: 1;

  @media (max-width: 900px) {
    width: 100%;
    min-height: 100vh;
    padding: 28px;
  }
`

export const LeftTopBrand = styled.div`
  position: absolute;
  top: 24px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

export const LeftTopBrandDot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #000000;
`

export const LeftTopBrandText = styled.span`
  color: #111111;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
`

export const RightPanel = styled.section`
  width: 60%;
  min-height: 100vh;
  background: #f4f5f7;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    display: none;
  }
`

export const RightBrandBlock = styled.div`
  position: absolute;
  top: 44%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1;
  width: min(84%, 680px);
`

export const RightBrand = styled.h2`
  margin: 0;
  color: #000000;
  font-family: 'Cormorant Garamond', Garamond, 'Times New Roman', serif;
  font-size: clamp(44px, 6.2vw, 86px);
  font-style: italic;
  font-weight: 600;
  letter-spacing: 0.4px;
  line-height: 1;
`

export const RightSubtitle = styled.p`
  margin: 14px 0 0;
  color: #1f2937;
  font-size: clamp(13px, 1.25vw, 17px);
  line-height: 1.5;
`

export const BackgroundGlowTop = styled.div`
  position: absolute;
  top: -240px;
  right: -120px;
  width: 520px;
  height: 520px;
  border-radius: 999px;
  background: radial-gradient(circle at center, rgba(217, 205, 176, 0.48) 0%, rgba(217, 205, 176, 0) 70%);
  pointer-events: none;
`

export const BackgroundGlowBottom = styled.div`
  position: absolute;
  bottom: -240px;
  left: -120px;
  width: 520px;
  height: 520px;
  border-radius: 999px;
  background: radial-gradient(circle at center, rgba(47, 94, 62, 0.38) 0%, rgba(47, 94, 62, 0) 70%);
  pointer-events: none;
`

export const LoginContent = styled.div`
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  padding: 0;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 640px) {
    max-width: 100%;
  }
`

export const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  line-height: 1.18;
  letter-spacing: -0.4px;
`

export const Form = styled.form`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

export const Label = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
`

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  border: 1px solid #d6d6d6;
  border-radius: 11px;
  background: #ffffff;
  color: #111111;
  padding: 0 12px;
  outline: none;
  font-size: 14px;
  font-weight: 500;

  &:focus {
    border-color: #b7b7b7;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

export const ErrorMessage = styled.div`
  border: 1px solid #ffcfcf;
  background: #fff5f5;
  color: #8b1a1a;
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 12px;
  font-weight: 700;
`

export const SubmitButton = styled.button`
  width: 100%;
  min-height: 44px;
  border: 1px solid #111111;
  border-radius: 11px;
  background: #111111;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const FooterRow = styled.div`
  margin-top: 16px;
`

export const FooterText = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
`

export const FooterLink = styled(Link)`
  color: #111111;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`