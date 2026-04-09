import fs from "node:fs/promises";
import postgres from "postgres";
import "dotenv/config";

type ParsedRow = {
  filial: string;
  nrBem: string;
  descricao: string;
  marca: string | null;
  modelo: string | null;
  conta: string;
  centroCusto: string;
  local: string | null;
  responsavel: string | null;
  fornecedor: string | null;
  dtAquis: string;
  anoAquis: number | null;
  vlrCusto: string;
};

function normalizeBlank(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "não especificado") return null;
  if (trimmed.toLowerCase() === "nao especificado") return null;
  return trimmed;
}

function parseDateToMask(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseMoneyToDecimal(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  if (!cleaned || Number.isNaN(Number(cleaned))) return null;
  return Number(cleaned).toFixed(2);
}

function parseLine(line: string, lineNumber: number): ParsedRow {
  const cols = line.split("\t").map(part => part.trim());

  if (cols.length < 14) {
    throw new Error(`Linha ${lineNumber}: colunas insuficientes (${cols.length})`);
  }

  const filial = cols[0] || "Belem";
  const nrBem = cols[1] || "";
  const descricao = cols[2] || "";
  const marca = normalizeBlank(cols[3]);
  const modelo = normalizeBlank(cols[4]);
  const conta = cols[5] || "Não especificado";
  const centroCusto = cols[6] || "Não especificado";
  const local = normalizeBlank(cols[7]);
  const responsavel = normalizeBlank(cols[8]);
  const fornecedor = normalizeBlank(cols[9]);
  const dtAquis = parseDateToMask(cols[10]) || "01-01-2023";

  const parsedYear = Number((cols[12] || "").trim());
  const anoAquis = Number.isFinite(parsedYear) ? parsedYear : null;

  const vlrCusto = parseMoneyToDecimal(cols[13] || cols[12] || cols[11]);
  if (!nrBem || !descricao || !vlrCusto) {
    throw new Error(
      `Linha ${lineNumber}: campos obrigatórios inválidos (nrBem/descricao/vlrCusto)`
    );
  }

  return {
    filial,
    nrBem,
    descricao,
    marca,
    modelo,
    conta,
    centroCusto,
    local,
    responsavel,
    fornecedor,
    dtAquis,
    anoAquis,
    vlrCusto,
  };
}

function parseCsvLine(line: string) {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current.trim());
  return columns;
}

function parseCsvRow(line: string, lineNumber: number): ParsedRow | null {
  const cols = parseCsvLine(line);

  if (cols.length < 14) {
    throw new Error(`Linha ${lineNumber}: colunas insuficientes (${cols.length})`);
  }

  const filial = cols[0] || "Belem";
  const nrBem = cols[1] || "";
  const descricao = cols[2] || "";

  if (!filial.trim() && !nrBem.trim() && !descricao.trim()) {
    return null;
  }
  const marca = normalizeBlank(cols[3]);
  const modelo = normalizeBlank(cols[4]);
  const conta = cols[5] || "Não especificado";
  const centroCusto = cols[6] || "Não especificado";
  const local = normalizeBlank(cols[7]);
  const responsavel = normalizeBlank(cols[8]);
  const fornecedor = normalizeBlank(cols[9]);
  const dtAquis = parseDateToMask(cols[10]) || "01-01-2023";

  const parsedYear = Number((cols[12] || "").trim());
  const anoAquis = Number.isFinite(parsedYear) ? parsedYear : null;

  const vlrCusto = parseMoneyToDecimal(cols[13]);
  if (!nrBem || !descricao || !vlrCusto) {
    throw new Error(
      `Linha ${lineNumber}: campos obrigatórios inválidos (nrBem/descricao/vlrCusto)`
    );
  }

  return {
    filial,
    nrBem,
    descricao,
    marca,
    modelo,
    conta,
    centroCusto,
    local,
    responsavel,
    fornecedor,
    dtAquis,
    anoAquis,
    vlrCusto,
  };
}

async function run() {
  const filePath = process.argv[2];

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definido");
  }

  const content = filePath?.startsWith("http")
    ? await fetch(filePath).then(async response => {
        if (!response.ok) {
          throw new Error(`Falha ao baixar planilha: HTTP ${response.status}`);
        }
        return response.text();
      })
    : filePath
      ? await fs.readFile(filePath, "utf8")
    : await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        process.stdin.on("data", chunk => chunks.push(Buffer.from(chunk)));
        process.stdin.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8"))
        );
        process.stdin.on("error", reject);
      });
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(
      filePath
        ? "Arquivo sem linhas de dados"
        : "Sem dados no stdin. Cole as linhas e finalize com Ctrl+D"
    );
  }

  const parseAsCsv = Boolean(filePath?.startsWith("http"));
  const parsedRows = lines
    .filter(line => !/^filial/i.test(line))
    .map((line, idx) => {
      const parsed = parseAsCsv
        ? parseCsvRow(line, idx + 1)
        : parseLine(line, idx + 1);
      return parsed;
    })
    .filter((row): row is ParsedRow => Boolean(row));

  const sql = postgres(process.env.DATABASE_URL);

  try {
    const spaces = await sql`
      select id, name
      from inventory_spaces
      where lower(name) = lower('Febracis PA')
      limit 1
    `;

    if (spaces.length === 0) {
      throw new Error("Unidade 'Febracis PA' não encontrada em inventory_spaces");
    }

    const spaceId = spaces[0].id as number;

    await sql.begin(async tx => {
      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];

        try {
          const existing = await tx`
            select id from inventory_assets
            where "spaceId" = ${spaceId}
              and "nrBem" = ${row.nrBem}
              and descricao = ${row.descricao}
            limit 1
          `;

          if (existing.length > 0) {
            await tx`
              update inventory_assets
              set
                filial = ${row.filial},
                marca = ${row.marca},
                modelo = ${row.modelo},
                conta = ${row.conta},
                "centroCusto" = ${row.centroCusto},
                local = ${row.local},
                responsavel = ${row.responsavel},
                fornecedor = ${row.fornecedor},
                "dtAquis" = ${row.dtAquis},
                "anoAquis" = ${row.anoAquis},
                "vlrCusto" = ${row.vlrCusto},
                "updatedAt" = now()
              where id = ${existing[0].id}
            `;
          } else {
            await tx`
              insert into inventory_assets (
                "spaceId",
                filial,
                "nrBem",
                descricao,
                marca,
                modelo,
                conta,
                "centroCusto",
                local,
                responsavel,
                fornecedor,
                "dtAquis",
                "anoAquis",
                "vlrCusto",
                "createdAt",
                "updatedAt"
              ) values (
                ${spaceId},
                ${row.filial},
                ${row.nrBem},
                ${row.descricao},
                ${row.marca},
                ${row.modelo},
                ${row.conta},
                ${row.centroCusto},
                ${row.local},
                ${row.responsavel},
                ${row.fornecedor},
                ${row.dtAquis},
                ${row.anoAquis},
                ${row.vlrCusto},
                now(),
                now()
              )
            `;
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Callback de erro: falha na linha ${i + 1} (${row.nrBem} - ${row.descricao}). Motivo: ${reason}`
          );
        }
      }
    });

    console.log(`Importação concluída: ${parsedRows.length} itens inseridos em Febracis PA.`);
  } finally {
    await sql.end();
  }
}

run().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
