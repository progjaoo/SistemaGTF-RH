// Normalização de nomes para busca tolerante a acento/caixa.
// Mesma regra usada no portal do colaborador e na importação de planilha.
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
