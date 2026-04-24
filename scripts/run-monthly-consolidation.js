import connection from '../src/db_config/connection.js';
import { syncMonthlyRevenueConsolidation } from '../src/services/monthlyRevenueConsolidation.js';

const referenceDateArg = process.argv[2];
const force = process.argv.includes('--force');

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

  await syncMonthlyRevenueConsolidation({ referenceDate, force });

  const result = await connection.query(
    `
      SELECT id, produto, data, valor, descricao, usuario
      FROM lancamentos
      WHERE usuario = 'sistema'
        AND tipo_de_lancamento = 'receita_dos_pontos'
        AND EXTRACT(YEAR FROM data) = $1
        AND EXTRACT(MONTH FROM data) = $2
      ORDER BY produto ASC, id ASC
    `,
    [ano, mes]
  );

  console.log(
    JSON.stringify(
      {
        referenceDate: referenceDate.toISOString(),
        consolidatedMonth: { ano, mes },
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
