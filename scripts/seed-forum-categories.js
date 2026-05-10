import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const migrationTarget = process.argv[2] || process.env.MIGRATION_TARGET || 'dev';

const targets = {
  dev: {
    envName: 'DATABASE_URL',
    label: 'DESENVOLVIMENTO/DATABASE_URL'
  },
  clean: {
    envName: 'CLEAN_DATABASE_URL',
    label: 'LIMPO/CLEAN_DATABASE_URL'
  }
};

const targetConfig = targets[migrationTarget];

if (!targetConfig) {
  console.error(
    [
      'Informe um alvo válido para o seed das categorias da comunidade.',
      '',
      'Uso:',
      '  node scripts/seed-forum-categories.js dev',
      '  node scripts/seed-forum-categories.js clean'
    ].join('\n')
  );
  process.exit(1);
}

const databaseUrl = process.env[targetConfig.envName];

if (!databaseUrl) {
  console.error(
    `Defina ${targetConfig.envName} para executar o seed no banco ${targetConfig.label}.`
  );
  process.exit(1);
}

const categories = [
  {
    nome: 'Operação de campo',
    slug: 'operacao-de-campo',
    descricao:
      'Dúvidas e experiências sobre visitas, rotina operacional, organização dos pontos e execução no dia a dia.',
    ordem: 1
  },
  {
    nome: 'Rotas, sangrias e comissões',
    slug: 'rotas-sangrias-e-comissoes',
    descricao:
      'Discussões sobre planejamento de rotas, controle de sangrias, repasses, comissões e acertos com parceiros.',
    ordem: 2
  },
  {
    nome: 'Máquinas, produtos e pontos',
    slug: 'maquinas-produtos-e-pontos',
    descricao:
      'Troca de informações sobre máquinas, mix de produtos, desempenho dos pontos, abastecimento e operação física.',
    ordem: 3
  },
  {
    nome: 'Dúvidas sobre o VendMaster',
    slug: 'duvidas-sobre-o-vendmaster',
    descricao:
      'Perguntas, orientações e boas práticas de uso do VendMaster para organizar melhor a operação.',
    ordem: 4
  }
];

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'disable' ? false : undefined
});

async function seedForumCategories() {
  await client.connect();

  try {
    await client.query('BEGIN');

    for (const category of categories) {
      await client.query(
        `
          INSERT INTO forum_categories (
            nome,
            slug,
            descricao,
            ordem,
            is_active,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
          ON CONFLICT (slug)
          DO UPDATE SET
            nome = EXCLUDED.nome,
            descricao = EXCLUDED.descricao,
            ordem = EXCLUDED.ordem,
            is_active = TRUE,
            updated_at = NOW()
        `,
        [
          category.nome,
          category.slug,
          category.descricao,
          category.ordem
        ]
      );
    }

    await client.query('COMMIT');

    console.log(
      `Seed concluído: ${categories.length} categorias da Comunidade VendMaster no banco ${targetConfig.label}.`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Falha ao executar seed das categorias da comunidade:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seedForumCategories();