DO $$
BEGIN
  IF to_regclass('public.sangrias_consignados') IS NULL
     AND to_regclass('public.sangrias_figurinhas') IS NOT NULL THEN
    ALTER TABLE sangrias_figurinhas RENAME TO sangrias_consignados;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sangrias_consignados') IS NOT NULL
     AND to_regclass('public.sangrias_figurinhas') IS NOT NULL THEN
    INSERT INTO sangrias_consignados (
      id,
      assinante_id,
      estabelecimento_id,
      data_sangria,
      qtde_deixada,
      abastecido,
      estoque,
      qtde_vendido,
      valor_apurado,
      tipo_pagamento,
      observacoes,
      data_atualizacao
    )
    SELECT
      id,
      assinante_id,
      estabelecimento_id,
      data_sangria,
      qtde_deixada,
      abastecido,
      estoque,
      qtde_vendido,
      valor_apurado,
      tipo_pagamento,
      observacoes,
      data_atualizacao
    FROM sangrias_figurinhas old_sangrias
    WHERE NOT EXISTS (
      SELECT 1
      FROM sangrias_consignados new_sangrias
      WHERE new_sangrias.id = old_sangrias.id
    );

    DROP TABLE sangrias_figurinhas;
  END IF;
END $$;

ALTER INDEX IF EXISTS sangrias_figurinhas_assinante_data_idx
  RENAME TO sangrias_consignados_assinante_data_idx;

ALTER INDEX IF EXISTS sangrias_figurinhas_estabelecimento_idx
  RENAME TO sangrias_consignados_estabelecimento_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sangrias_figurinhas_estabelecimento_assinante_fk'
  ) THEN
    ALTER TABLE sangrias_consignados
      RENAME CONSTRAINT sangrias_figurinhas_estabelecimento_assinante_fk
      TO sangrias_consignados_estabelecimento_assinante_fk;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_figurinhas_estabelecimento_assinante'
  ) THEN
    ALTER TABLE sangrias_consignados
      RENAME CONSTRAINT fk_figurinhas_estabelecimento_assinante
      TO fk_consignados_estabelecimento_assinante;
  END IF;
END $$;

ALTER TABLE lancamentos
  DROP CONSTRAINT IF EXISTS lancamentos_produto_check;

UPDATE lancamentos
SET produto = 'consignados'
WHERE produto = 'figurinhas';

ALTER TABLE lancamentos
  ADD CONSTRAINT lancamentos_produto_check
  CHECK (produto IN ('bolinhas', 'consignados', 'pelucias'));

ALTER TABLE visita_produtos
  DROP CONSTRAINT IF EXISTS visita_produtos_produto_check;

ALTER TABLE visita_produtos
  DROP CONSTRAINT IF EXISTS chk_visita_produtos_produto;

UPDATE visita_produtos
SET produto = 'CONSIGNADOS'
WHERE produto = 'FIGURINHAS';

ALTER TABLE visita_produtos
  ADD CONSTRAINT visita_produtos_produto_check
  CHECK (produto IN ('BOLINHAS', 'CONSIGNADOS', 'PELUCIAS'));

UPDATE estabelecimentos
SET produto = REPLACE(produto, 'FIGURINHAS', 'CONSIGNADOS')
WHERE produto LIKE '%FIGURINHAS%';

UPDATE assinantes
SET produtos_habilitados = REPLACE(produtos_habilitados, 'FIGURINHAS', 'CONSIGNADOS')
WHERE produtos_habilitados LIKE '%FIGURINHAS%';

UPDATE rotas_operacionais
SET produto_filtro = 'CONSIGNADOS'
WHERE produto_filtro = 'FIGURINHAS';

SELECT setval(
  pg_get_serial_sequence('sangrias_consignados', 'id'),
  COALESCE((SELECT MAX(id) FROM sangrias_consignados), 1),
  (SELECT COUNT(*) > 0 FROM sangrias_consignados)
);
