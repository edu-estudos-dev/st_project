import pool from '../src/db_config/connection.js';

const mainTables = [
  'users',
  'assinantes',
  'estabelecimentos',
  'sangrias_bolinha',
  'sangrias_figurinhas',
  'sangrias_pelucias',
  'lancamentos'
];

const printQuery = async (name, sql, params = []) => {
  const result = await pool.query(sql, params);
  console.log(`\n## ${name}`);
  console.log(JSON.stringify(result.rows, null, 2));
};

await printQuery(
  'tables',
  `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
);

await printQuery(
  'main columns',
  `
    SELECT table_name, column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position
  `,
  [mainTables]
);

await printQuery(
  'constraints',
  `
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ANY($1)
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
  `,
  [mainTables]
);

await printQuery(
  'null assinante_id',
  `
    SELECT 'estabelecimentos' tabela, COUNT(*)::int total FROM estabelecimentos WHERE assinante_id IS NULL
    UNION ALL SELECT 'sangrias_bolinha', COUNT(*)::int FROM sangrias_bolinha WHERE assinante_id IS NULL
    UNION ALL SELECT 'sangrias_figurinhas', COUNT(*)::int FROM sangrias_figurinhas WHERE assinante_id IS NULL
    UNION ALL SELECT 'sangrias_pelucias', COUNT(*)::int FROM sangrias_pelucias WHERE assinante_id IS NULL
    UNION ALL SELECT 'lancamentos', COUNT(*)::int FROM lancamentos WHERE assinante_id IS NULL
  `
);

await printQuery(
  'cross tenant joins',
  `
    SELECT 'bolinhas' tabela, COUNT(*)::int total
    FROM sangrias_bolinha s
    JOIN estabelecimentos e ON e.id = s.estabelecimento_id
    WHERE s.assinante_id <> e.assinante_id
    UNION ALL
    SELECT 'figurinhas', COUNT(*)::int
    FROM sangrias_figurinhas s
    JOIN estabelecimentos e ON e.id = s.estabelecimento_id
    WHERE s.assinante_id <> e.assinante_id
    UNION ALL
    SELECT 'pelucias', COUNT(*)::int
    FROM sangrias_pelucias s
    JOIN estabelecimentos e ON e.id = s.estabelecimento_id
    WHERE s.assinante_id <> e.assinante_id
  `
);

await printQuery(
  'orphans',
  `
    SELECT 'assinantes_sem_user' item, COUNT(*)::int total
    FROM assinantes a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE u.id IS NULL
    UNION ALL
    SELECT 'users_sem_assinante', COUNT(*)::int
    FROM users u
    LEFT JOIN assinantes a ON a.user_id = u.id
    WHERE a.id IS NULL
    UNION ALL
    SELECT 'estabelecimentos_sem_assinante', COUNT(*)::int
    FROM estabelecimentos e
    LEFT JOIN assinantes a ON a.id = e.assinante_id
    WHERE a.id IS NULL
    UNION ALL
    SELECT 'lancamentos_sem_assinante', COUNT(*)::int
    FROM lancamentos l
    LEFT JOIN assinantes a ON a.id = l.assinante_id
    WHERE a.id IS NULL
    UNION ALL
    SELECT 'bolinhas_sem_estabelecimento', COUNT(*)::int
    FROM sangrias_bolinha s
    LEFT JOIN estabelecimentos e ON e.id = s.estabelecimento_id
    WHERE e.id IS NULL
    UNION ALL
    SELECT 'figurinhas_sem_estabelecimento', COUNT(*)::int
    FROM sangrias_figurinhas s
    LEFT JOIN estabelecimentos e ON e.id = s.estabelecimento_id
    WHERE e.id IS NULL
    UNION ALL
    SELECT 'pelucias_sem_estabelecimento', COUNT(*)::int
    FROM sangrias_pelucias s
    LEFT JOIN estabelecimentos e ON e.id = s.estabelecimento_id
    WHERE e.id IS NULL
  `
);

await printQuery(
  'users without assinante',
  `
    SELECT u.id, u.username, u.email
    FROM users u
    LEFT JOIN assinantes a ON a.user_id = u.id
    WHERE a.id IS NULL
    ORDER BY u.id
  `
);

await printQuery(
  'invalid subscription fields',
  `
    SELECT id, user_id, status_assinatura, tipo_cobranca
    FROM assinantes
    WHERE status_assinatura NOT IN ('trial', 'ativo', 'vencido', 'cancelado', 'bloqueado')
       OR (tipo_cobranca IS NOT NULL AND tipo_cobranca NOT IN ('mensal', 'anual'))
  `
);

await printQuery(
  'overdue full access subscriptions',
  `
    SELECT id, user_id, status_assinatura, trial_fim, data_vencimento
    FROM assinantes
    WHERE status_assinatura IN ('trial', 'ativo')
      AND (
        (status_assinatura = 'trial' AND trial_fim IS NOT NULL AND trial_fim < NOW())
        OR
        (status_assinatura = 'ativo' AND data_vencimento IS NOT NULL AND data_vencimento < NOW())
      )
    ORDER BY id
  `
);

await printQuery(
  'duplicate users',
  `
    SELECT 'username' campo, LOWER(TRIM(username)) valor, COUNT(*)::int total
    FROM users
    WHERE COALESCE(TRIM(username), '') <> ''
    GROUP BY LOWER(TRIM(username))
    HAVING COUNT(*) > 1
    UNION ALL
    SELECT 'email', LOWER(TRIM(email)), COUNT(*)::int
    FROM users
    WHERE COALESCE(TRIM(email), '') <> ''
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  `
);

await printQuery(
  'null required login fields',
  `
    SELECT 'username' campo, COUNT(*)::int total FROM users WHERE COALESCE(TRIM(username), '') = ''
    UNION ALL SELECT 'email', COUNT(*)::int FROM users WHERE COALESCE(TRIM(email), '') = ''
    UNION ALL SELECT 'senha', COUNT(*)::int FROM users WHERE COALESCE(TRIM(senha), '') = ''
  `
);

await printQuery(
  'important indexes',
  `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_users_username_lower_unique',
        'idx_users_email_lower_unique',
        'idx_estabelecimentos_id_assinante_unique'
      )
    ORDER BY indexname
  `
);

await printQuery(
  'counts by tenant',
  `
    SELECT
      a.id AS assinante_id,
      a.user_id,
      a.status_assinatura,
      COUNT(DISTINCT e.id)::int AS estabelecimentos,
      COUNT(DISTINCT l.id)::int AS lancamentos,
      COUNT(DISTINCT sb.id)::int AS bolinhas,
      COUNT(DISTINCT sf.id)::int AS figurinhas,
      COUNT(DISTINCT sp.id)::int AS pelucias
    FROM assinantes a
    LEFT JOIN estabelecimentos e ON e.assinante_id = a.id
    LEFT JOIN lancamentos l ON l.assinante_id = a.id
    LEFT JOIN sangrias_bolinha sb ON sb.assinante_id = a.id
    LEFT JOIN sangrias_figurinhas sf ON sf.assinante_id = a.id
    LEFT JOIN sangrias_pelucias sp ON sp.assinante_id = a.id
    GROUP BY a.id, a.user_id, a.status_assinatura
    ORDER BY a.id
  `
);

await pool.end();
