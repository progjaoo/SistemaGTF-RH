import styled from "styled-components";

export const Shell = styled.div<{ $collapsed: boolean }>`
  display: grid;
  grid-template-columns: ${({ $collapsed }) => ($collapsed ? "96px" : "280px")} minmax(0, 1fr);
  min-height: 100vh;
  transition: grid-template-columns 0.22s ease;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Main = styled.main`
  min-width: 0;
  padding: 28px;
  transition: padding 0.2s ease;

  @media (max-width: 700px) {
    padding: 14px 12px 18px;
  }
`;

export const Topbar = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;

  h1 {
    margin: 4px 0 0;
    font-size: clamp(1.4rem, 2.4vw, 2.4rem);
    letter-spacing: 0;
  }

  @media (max-width: 820px) {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;

    h1 {
      font-size: 1.35rem;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }
  }
`;

export const Eyebrow = styled.div`
  color: var(--teal);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: start;
  gap: 10px;

  select {
    min-width: 230px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;

    select {
      width: 100%;
      min-width: 0;
    }

    button {
      width: 100%;
    }
  }
`;
