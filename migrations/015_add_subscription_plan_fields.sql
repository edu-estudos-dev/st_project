ALTER TABLE assinantes
ADD COLUMN IF NOT EXISTS produtos_habilitados TEXT,
ADD COLUMN IF NOT EXISTS plano_codigo VARCHAR(50),
ADD COLUMN IF NOT EXISTS plano_nome VARCHAR(100),
ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10, 2);

UPDATE assinantes a
SET produtos_habilitados = produtos.produtos_habilitados
FROM (
  SELECT
    assinante_id,
    STRING_AGG(produto_key, ', ' ORDER BY produto_order) AS produtos_habilitados
  FROM (
    SELECT DISTINCT assinante_id, 'BOLINHAS' AS produto_key, 1 AS produto_order
    FROM estabelecimentos
    WHERE status = 'ativo' AND UPPER(produto) LIKE '%BOLINHAS%'
    UNION
    SELECT DISTINCT assinante_id, 'CONSIGNADOS' AS produto_key, 2 AS produto_order
    FROM estabelecimentos
    WHERE status = 'ativo' AND UPPER(produto) LIKE '%CONSIGNADOS%'
    UNION
    SELECT DISTINCT assinante_id, 'PELUCIAS' AS produto_key, 3 AS produto_order
    FROM estabelecimentos
    WHERE status = 'ativo' AND UPPER(produto) LIKE '%PELUCIAS%'
  ) origem
  GROUP BY assinante_id
) produtos
WHERE a.id = produtos.assinante_id
  AND COALESCE(TRIM(a.produtos_habilitados), '') = '';
