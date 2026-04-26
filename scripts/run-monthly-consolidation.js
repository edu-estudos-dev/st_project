import connection from '../src/db_config/connection.js';
import { syncMonthlyRevenueConsolidation } from '../src/services/monthlyRevenueConsolidation.js';

const args = process.argv.slice(2);
const referenceDateArg = args.find((arg) => !arg.startsWith('--'));
const force = process.argv.includes('--force');
const assinanteIdArg = args.find((arg) => arg.startsWith('--assinante-id='));
const requestedAssinanteId = assinanteIdArg
  ? Number(assinanteIdArg.split('=')[1])
  : null;

if (assinanteIdArg && (!Number.isInteger(requestedAssinanteId) || requestedAssinanteId <= 0)) {
  throw new Error('Informe --assinante-id com um numero inteiro positivo.');
}

const parseReferenceDate = (value) => {
  if (!value) {
    return new Date();
  }

  const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (localDateMatch) {
    const [, year, month, day] = localDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data de referência inválida: ${value}`);
  }

  return parsed;
};

const getPreviousMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month === 1) {
    return { ano: year - 1, mes: 12 };
  }

  return { ano: year, mes: month - 1 };
};

const run = async () => {
  const referenceDate = parseReferenceDate(referenceDateArg);
  const { ano, mes } = getPreviousMonth(referenceDate);
  const assinantesResult = await connection.query(
    `
      SELECT id, user_id, status_assinatura
      FROM assinantes
      WHERE ($1::bigint IS NULL OR id = $1::bigint)
      ORDER BY id ASC
    `,
    [requestedAssinanteId]
  );

  for (const assinante of assinantesResult.rows) {
    await syncMonthlyRevenueConsolidation({
      assinanteId: assinante.id,
      referenceDate,
      force
    });
  }

  const result = await connection.query(
    `
      SELECT assinante_id, id, produto, data, valor, descricao, usuario
      FROM lancamentos
      WHERE usuario = 'sistema'
        AND tipo_de_lancamento = 'receita_dos_pontos'
        AND EXTRACT(YEAR FROM data) = $1
        AND EXTRACT(MONTH FROM data) = $2
        AND ($3::bigint IS NULL OR assinante_id = $3::bigint)
      ORDER BY assinante_id ASC, produto ASC, id ASC
    `,
    [ano, mes, requestedAssinanteId]
  );

  console.log(
    JSON.stringify(
      {
        referenceDate: referenceDate.toISOString(),
        consolidatedMonth: { ano, mes },
        assinantesProcessados: assinantesResult.rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          status_assinatura: row.status_assinatura
        })),
        lancamentos: result.rows
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await connection.end();
  });
