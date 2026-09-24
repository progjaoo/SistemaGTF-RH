import * as XLSX from "xlsx";

export type SheetRow = {
  name: string;
  date: string;
  quantity: number;
};

export type SheetParseResult = {
  rows: SheetRow[];
  errors: string[];
};

function normHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

const NAME_HEADERS = ["nome", "name", "funcionario", "colaborador", "employee"];
const DATE_HEADERS = ["data", "date", "dia"];
const QTY_HEADERS = ["quantidade", "qtd", "qtdade", "quantity", "qty", "refeicoes", "refeicao"];

// Serial Excel (dias desde 1899-12-30) -> YYYY-MM-DD.
function serialToDate(serial: number) {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

function cellToDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    return serialToDate(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export async function parseSpreadsheetFile(file: File): Promise<SheetParseResult> {
  const errors: string[] = [];
  const rows: SheetRow[] = [];

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { rows, errors: ["Não foi possível ler o arquivo. Envie um .xlsx, .xls ou .csv válido."] };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows, errors: ["Planilha sem abas."] };
  const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: null });
  if (grid.length < 2) return { rows, errors: ["Planilha sem linhas de dados (cabeçalho + ao menos 1 linha)."] };

  const header = (grid[0] as unknown[]).map(normHeader);
  const nameIdx = header.findIndex((h) => NAME_HEADERS.includes(h));
  const dateIdx = header.findIndex((h) => DATE_HEADERS.includes(h));
  const qtyIdx = header.findIndex((h) => QTY_HEADERS.includes(h));

  const missing: string[] = [];
  if (nameIdx < 0) missing.push("Nome");
  if (dateIdx < 0) missing.push("Data");
  if (qtyIdx < 0) missing.push("Quantidade");
  if (missing.length > 0) {
    return { rows, errors: [`Cabeçalho incompleto. Colunas esperadas: Nome, Data, Quantidade. Faltando: ${missing.join(", ")}.`] };
  }

  grid.slice(1).forEach((line, position) => {
    const lineNo = position + 2;
    const cells = line as unknown[];
    const rawName = cells[nameIdx];
    const rawDate = cells[dateIdx];
    const rawQty = cells[qtyIdx];
    if ((rawName === null || rawName === "") && (rawDate === null || rawDate === "") && (rawQty === null || rawQty === "")) {
      return; // ignora linha totalmente vazia
    }
    const name = String(rawName ?? "").trim();
    const date = cellToDate(rawDate);
    const quantity = typeof rawQty === "number" ? rawQty : Number(String(rawQty ?? "").trim().replace(",", "."));
    if (!name) {
      errors.push(`Linha ${lineNo}: nome vazio.`);
      return;
    }
    if (!date) {
      errors.push(`Linha ${lineNo}: data inválida (use YYYY-MM-DD, DD/MM/AAAA ou data do Excel).`);
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) {
      errors.push(`Linha ${lineNo}: quantidade deve ser inteiro de 0 a 10.`);
      return;
    }
    rows.push({ name, date, quantity });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Nenhuma linha válida encontrada.");
  }

  return { rows, errors };
}
