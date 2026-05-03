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
    width: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    background: #163d2e;
    color: #e6d5b8;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
    overscroll-behavior: none;
  }
`

export const Container = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  display: flex;

  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`

export const BackgroundImage = styled.img`
  position: absolute;
  inset: 0;

  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 75% center;
`

export const Overlay = styled.div`
  position: absolute;
  inset: 0;

  background: linear-gradient(
    to left,
    rgba(22, 61, 46, 0.85) 0%,
    rgba(22, 61, 46, 0.75) 25%,
    rgba(22, 61, 46, 0.55) 45%,
    rgba(22, 61, 46, 0.35) 65%,
    rgba(22, 61, 46, 0.2) 80%,
    rgba(22, 61, 46, 0.1) 90%,
    rgba(22, 61, 46, 0.0) 100%
  );
`

export const Content = styled.div`
  position: relative;
  z-index: 2;

  flex: 1;
  width: 100%;
  min-height: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 100px;

  @media (max-width: 900px) {
    justify-content: center;
    padding: 24px;
    align-items: center;
  }
`

export const FormCard = styled.div`
  width: 100%;
  max-width: 380px;
  padding: 48px 40px;
  flex-shrink: 0;

  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
  color: #e6d5b8;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.45);
  }

  @media (max-width: 900px) {
    max-width: 420px;
    padding: 30px 24px;
  }
`

export const Title = styled.h1`
  margin: 0 0 28px;
  color: #e6d5b8;
  font-family: 'Cormorant Garamond', Garamond, 'Times New Roman', serif;
  font-size: 40px;
  font-style: italic;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.5px;
  text-align: center;
  display: none;

  @media (max-width: 900px) {
    display: block;
  }
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  color: rgba(230, 213, 184, 0.85);
  margin-bottom: 2px;
`

export const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #e6d5b8;
  padding: 14px 16px;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  cursor: text;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(230, 213, 184, 0.5);
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.25);
  }

  &:focus {
    border-color: rgba(230, 213, 184, 0.7);
    box-shadow: 0 0 0 2px rgba(230, 213, 184, 0.15);
  }

  @media (max-width: 900px) {
    font-size: 16px;
  }
`

export const ErrorMessage = styled.div`
  border: 1px solid rgba(255, 153, 153, 0.35);
  background: rgba(124, 37, 37, 0.22);
  color: #ffd9d9;
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 12px;
  font-weight: 700;
`

export const SubmitButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 12px;
  background: #e6d5b8;
  color: #163d2e;
  font-size: 14px;
  font-weight: 600;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);

  &:hover {
    transform: translateY(-1px);
    filter: brightness(0.95);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25), 0 0 18px rgba(230, 213, 184, 0.22);
  }

  &:active {
    transform: translateY(0px) scale(0.98);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`

export const FooterRow = styled.div`
  margin-top: 20px;
`

export const FooterText = styled.p`
  margin: 0;
  color: rgba(248, 242, 232, 0.82);
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
`

export const FooterLink = styled(Link)`
  color: #f4e6cb;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`