DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sangrias_bolinha_non_negative_values'
  ) THEN
    ALTER TABLE sangrias_bolinha
      ADD CONSTRAINT chk_sangrias_bolinha_non_negative_values
      CHECK (
        COALESCE(valor_apurado, 0) >= 0
        AND COALESCE(valor_comerciante, 0) >= 0
        AND COALESCE(valor_liquido, 0) >= 0
        AND COALESCE(comissao, 0) >= 0
        AND COALESCE(comissao, 0) <= 100
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sangrias_consignados_non_negative_values'
  ) THEN
    ALTER TABLE sangrias_consignados
      ADD CONSTRAINT chk_sangrias_consignados_non_negative_values
      CHECK (
        COALESCE(qtde_deixada, 0) >= 0
        AND COALESCE(abastecido, 0) >= 0
        AND COALESCE(estoque, 0) >= 0
        AND COALESCE(qtde_vendido, 0) >= 0
        AND COALESCE(valor_apurado, 0) >= 0
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sangrias_pelucias_non_negative_values'
  ) THEN
    ALTER TABLE sangrias_pelucias
      ADD CONSTRAINT chk_sangrias_pelucias_non_negative_values
      CHECK (
        COALESCE(leitura_atual, 0) >= 0
        AND COALESCE(ultima_leitura, 0) >= 0
        AND COALESCE(abastecido, 0) >= 0
        AND COALESCE(qtde_vendido, 0) >= 0
        AND COALESCE(estoque, 0) >= 0
        AND COALESCE(valor_apurado, 0) >= 0
        AND COALESCE(valor_comerciante, 0) >= 0
        AND COALESCE(valor_liquido, 0) >= 0
        AND COALESCE(comissao, 0) >= 0
        AND COALESCE(comissao, 0) <= 100
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lancamentos_safe_numbers'
  ) THEN
    ALTER TABLE lancamentos
      ADD CONSTRAINT chk_lancamentos_safe_numbers
      CHECK (
        COALESCE(valor, 0) > 0
        AND COALESCE(qtde_de_parcelas, 1) BETWEEN 1 AND 120
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_estabelecimentos_safe_initial_values'
  ) THEN
    ALTER TABLE estabelecimentos
      ADD CONSTRAINT chk_estabelecimentos_safe_initial_values
      CHECK (
        (latitude IS NULL OR latitude BETWEEN -90 AND 90)
        AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
        AND COALESCE(consignado_quantidade_inicial, 0) >= 0
        AND COALESCE(pelucia_leitura_inicial, 0) >= 0
        AND COALESCE(pelucia_abastecido_inicial, 0) >= 0
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_assinantes_safe_plan_value'
  ) THEN
    ALTER TABLE assinantes
      ADD CONSTRAINT chk_assinantes_safe_plan_value
      CHECK (valor_mensal IS NULL OR valor_mensal >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_visitas_status_values'
  ) THEN
    ALTER TABLE visitas
      ADD CONSTRAINT chk_visitas_status_values
      CHECK (status IN ('em_andamento', 'finalizada', 'nao_realizada')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_visita_produtos_status_values'
  ) THEN
    ALTER TABLE visita_produtos
      ADD CONSTRAINT chk_visita_produtos_status_values
      CHECK (status IN ('pendente', 'registrado', 'sem_movimentacao', 'nao_realizada')) NOT VALID;
  END IF;
END $$;
