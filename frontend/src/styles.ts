import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
    --ink: #20262c;
    --muted: #68717c;
    --line: #d9e0e6;
    --paper: #f5f7f9;
    --surface: #ffffff;
    --teal: #0f766e;
    --teal-soft: #e6f5f2;
    --wine: #9f1239;
    --amber: #d97706;
    --steel: #34495e;
    --focus: #1d4ed8;
    --shadow: 0 18px 48px rgba(32, 38, 44, 0.08);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 16px;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    overflow-x: hidden;
    color: var(--ink);
    background:
      linear-gradient(90deg, rgba(15, 118, 110, 0.08) 0 1px, transparent 1px 100%) 0 0 / 42px 42px,
      var(--paper);
  }

  #root {
    min-width: 0;
  }

  button,
  input,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  }

  button:hover:not(:disabled) {
    filter: brightness(0.99);
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid rgba(29, 78, 216, 0.25);
    outline-offset: 2px;
  }

  a {
    color: inherit;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.001ms !important;
    }
  }
`;
