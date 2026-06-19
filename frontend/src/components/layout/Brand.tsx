import styled from "styled-components";

export const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-width: 0;

  strong {
    display: block;
    font-size: 1rem;
  }

  span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.86rem;
  }

  @media (max-width: 900px) {
    justify-content: flex-start;
    gap: 12px;
  }
`;

export const BrandLogo = styled.img`
  display: block;
  width: 120px;
  max-width: 100%;
  height: 58px;
  object-fit: contain;
  border-radius: 0;
  transition: width 0.22s ease, height 0.22s ease;

  @media (max-width: 900px) {
    width: 76px;
    height: 58px;
  }
`;

export const BrandText = styled.div`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
`;

export const BrandMark = styled.div`
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 8px;
  background: var(--teal);
  color: #fff;
  font-weight: 900;
  letter-spacing: 0;
`;
