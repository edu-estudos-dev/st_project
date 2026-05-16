CREATE INDEX IF NOT EXISTS sangrias_bolinha_assinante_estabelecimento_data_idx
  ON sangrias_bolinha (assinante_id, estabelecimento_id, data_sangria DESC, id DESC);

CREATE INDEX IF NOT EXISTS sangrias_consignados_assinante_estabelecimento_data_idx
  ON sangrias_consignados (assinante_id, estabelecimento_id, data_sangria DESC, id DESC);

CREATE INDEX IF NOT EXISTS sangrias_pelucias_assinante_estabelecimento_data_idx
  ON sangrias_pelucias (assinante_id, estabelecimento_id, data_sangria DESC, id DESC);

CREATE INDEX IF NOT EXISTS visita_produtos_assinante_produto_sangria_idx
  ON visita_produtos (assinante_id, produto, sangria_id)
  WHERE sangria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lancamentos_receita_consolidada_idx
  ON lancamentos (assinante_id, produto, data, id)
  WHERE entrada_saida = 'Entrada'
    AND tipo_de_lancamento = 'receita_dos_pontos'
    AND usuario = 'sistema';

CREATE INDEX IF NOT EXISTS lancamentos_assinante_movimento_idx
  ON lancamentos (assinante_id, (COALESCE(vencimento, data)), tipo_de_lancamento);
