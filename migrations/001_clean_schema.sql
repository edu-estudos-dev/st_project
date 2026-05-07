CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(160) NOT NULL,
  senha VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMPTZ NULL,
  email_verification_sent_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized_idx
  ON users (LOWER(TRIM(username)));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_idx
  ON users (LOWER(TRIM(email)));

CREATE TABLE IF NOT EXISTS assinantes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status_assinatura VARCHAR(20) NOT NULL DEFAULT 'trial',
  tipo_cobranca VARCHAR(20) NULL,
  trial_inicio TIMESTAMPTZ NULL,
  trial_fim TIMESTAMPTZ NULL,
  data_ativacao TIMESTAMPTZ NULL,
  data_vencimento TIMESTAMPTZ NULL,
  data_limite_exclusao TIMESTAMPTZ NULL,
  gateway_customer_id TEXT NULL,
  gateway_subscription_id TEXT NULL,
  produtos_habilitados TEXT NULL,
  plano_codigo VARCHAR(50) NULL,
  plano_nome VARCHAR(100) NULL,
  valor_mensal NUMERIC(10, 2) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assinantes_status_assinatura_check
    CHECK (status_assinatura IN ('trial', 'ativo', 'vencido', 'cancelado', 'bloqueado')),
  CONSTRAINT assinantes_tipo_cobranca_check
    CHECK (tipo_cobranca IS NULL OR tipo_cobranca IN ('mensal', 'anual'))
);

CREATE TABLE IF NOT EXISTS estabelecimentos (
  id SERIAL PRIMARY KEY,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  estabelecimento VARCHAR(100) NOT NULL,
  produto VARCHAR(100) NOT NULL,
  chave VARCHAR(50) NULL,
  maquina VARCHAR(50) NULL,
  endereco VARCHAR(100) NULL,
  bairro VARCHAR(30) NULL,
  responsavel_nome VARCHAR(100) NULL,
  telefone_contato VARCHAR(16) NULL,
  observacoes TEXT NULL,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NULL,
  data_encerramento TIMESTAMPTZ NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'ativo',
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  chave_bolinhas VARCHAR(100) NULL,
  maquina_bolinhas VARCHAR(100) NULL,
  chave_pelucias VARCHAR(100) NULL,
  maquina_pelucias VARCHAR(100) NULL,
  CONSTRAINT estabelecimentos_status_check
    CHECK (status IN ('ativo', 'inativo'))
);

CREATE UNIQUE INDEX IF NOT EXISTS estabelecimentos_id_assinante_id_idx
  ON estabelecimentos (id, assinante_id);

CREATE INDEX IF NOT EXISTS estabelecimentos_assinante_status_idx
  ON estabelecimentos (assinante_id, status);

CREATE TABLE IF NOT EXISTS lancamentos (
  id BIGSERIAL PRIMARY KEY,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  entrada_saida VARCHAR(20) NOT NULL,
  data DATE NOT NULL,
  tipo_de_lancamento VARCHAR(60) NOT NULL,
  produto VARCHAR(30) NOT NULL,
  forma_de_pagamento VARCHAR(30) NOT NULL,
  vencimento DATE NULL,
  qtde_de_parcelas INTEGER NOT NULL DEFAULT 1,
  valor NUMERIC(10, 2) NOT NULL,
  descricao TEXT NULL,
  usuario VARCHAR(100) NULL,
  dia_do_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_edicao TIMESTAMPTZ NULL,
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT lancamentos_entrada_saida_check
    CHECK (entrada_saida IN ('Entrada', 'Saida')),
  CONSTRAINT lancamentos_tipo_de_lancamento_check
    CHECK (tipo_de_lancamento IN (
      'compra',
      'extra',
      'incremento_de_capital',
      'pro-labore',
      'receita_dos_pontos',
      'gastos_recorrentes',
      'bonus'
    )),
  CONSTRAINT lancamentos_produto_check
    CHECK (produto IN ('bolinhas', 'figurinhas', 'pelucias')),
  CONSTRAINT lancamentos_forma_de_pagamento_check
    CHECK (forma_de_pagamento IN ('boleto', 'credito', 'pix', 'especie'))
);

CREATE INDEX IF NOT EXISTS lancamentos_assinante_data_idx
  ON lancamentos (assinante_id, data);

CREATE INDEX IF NOT EXISTS lancamentos_assinante_vencimento_idx
  ON lancamentos (assinante_id, vencimento);

CREATE TABLE IF NOT EXISTS sangrias_bolinha (
  id BIGSERIAL PRIMARY KEY,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  estabelecimento_id INTEGER NOT NULL,
  data_sangria DATE NOT NULL,
  valor_apurado NUMERIC(10, 2) NOT NULL DEFAULT 0,
  comissao NUMERIC(10, 2) NULL,
  valor_comerciante NUMERIC(10, 2) NULL,
  valor_liquido NUMERIC(10, 2) NULL,
  tipo_pagamento VARCHAR(30) NULL,
  observacoes TEXT NULL,
  data_atualizacao TIMESTAMPTZ NULL,
  CONSTRAINT sangrias_bolinha_estabelecimento_assinante_fk
    FOREIGN KEY (estabelecimento_id, assinante_id)
    REFERENCES estabelecimentos (id, assinante_id)
);

CREATE INDEX IF NOT EXISTS sangrias_bolinha_assinante_data_idx
  ON sangrias_bolinha (assinante_id, data_sangria);

CREATE INDEX IF NOT EXISTS sangrias_bolinha_estabelecimento_idx
  ON sangrias_bolinha (estabelecimento_id);

CREATE TABLE IF NOT EXISTS sangrias_figurinhas (
  id BIGSERIAL PRIMARY KEY,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  estabelecimento_id INTEGER NOT NULL,
  data_sangria DATE NOT NULL,
  qtde_deixada INTEGER NULL,
  abastecido INTEGER NULL,
  estoque INTEGER NULL,
  qtde_vendido INTEGER NULL,
  valor_apurado NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tipo_pagamento VARCHAR(30) NULL,
  observacoes TEXT NULL,
  data_atualizacao TIMESTAMPTZ NULL,
  CONSTRAINT sangrias_figurinhas_estabelecimento_assinante_fk
    FOREIGN KEY (estabelecimento_id, assinante_id)
    REFERENCES estabelecimentos (id, assinante_id)
);

CREATE INDEX IF NOT EXISTS sangrias_figurinhas_assinante_data_idx
  ON sangrias_figurinhas (assinante_id, data_sangria);

CREATE INDEX IF NOT EXISTS sangrias_figurinhas_estabelecimento_idx
  ON sangrias_figurinhas (estabelecimento_id);

CREATE TABLE IF NOT EXISTS sangrias_pelucias (
  id BIGSERIAL PRIMARY KEY,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  estabelecimento_id INTEGER NOT NULL,
  data_sangria DATE NOT NULL,
  leitura_atual INTEGER NULL,
  ultima_leitura INTEGER NULL,
  abastecido INTEGER NULL,
  valor_apurado NUMERIC(10, 2) NOT NULL DEFAULT 0,
  comissao NUMERIC(10, 2) NULL,
  valor_comerciante NUMERIC(10, 2) NULL,
  valor_liquido NUMERIC(10, 2) NULL,
  tipo_pagamento VARCHAR(30) NULL,
  qtde_vendido INTEGER NULL,
  observacoes TEXT NULL,
  estoque INTEGER NULL,
  data_atualizacao TIMESTAMPTZ NULL,
  CONSTRAINT sangrias_pelucias_estabelecimento_assinante_fk
    FOREIGN KEY (estabelecimento_id, assinante_id)
    REFERENCES estabelecimentos (id, assinante_id)
);

CREATE INDEX IF NOT EXISTS sangrias_pelucias_assinante_data_idx
  ON sangrias_pelucias (assinante_id, data_sangria);

CREATE INDEX IF NOT EXISTS sangrias_pelucias_estabelecimento_idx
  ON sangrias_pelucias (estabelecimento_id);

CREATE TABLE IF NOT EXISTS rotas_operacionais (
  id BIGSERIAL PRIMARY KEY,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  usuario_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'em_andamento',
  produto_filtro VARCHAR(50) NULL DEFAULT 'todos',
  bairros TEXT NULL,
  origem_latitude DOUBLE PRECISION NULL,
  origem_longitude DOUBLE PRECISION NULL,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_finalizacao TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rotas_operacionais_status_check
    CHECK (status IN ('em_andamento', 'finalizada', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS rotas_operacionais_assinante_status_idx
  ON rotas_operacionais (assinante_id, status);

CREATE TABLE IF NOT EXISTS rota_pontos (
  id BIGSERIAL PRIMARY KEY,
  rota_id BIGINT NOT NULL REFERENCES rotas_operacionais(id) ON DELETE CASCADE,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  estabelecimento_id INTEGER NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  latitude_chegada DOUBLE PRECISION NULL,
  longitude_chegada DOUBLE PRECISION NULL,
  iniciado_em TIMESTAMPTZ NULL,
  visitado_em TIMESTAMPTZ NULL,
  nao_realizado_em TIMESTAMPTZ NULL,
  observacao TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rota_pontos_status_check
    CHECK (status IN ('pendente', 'em_andamento', 'visitado', 'nao_realizada', 'cancelado')),
  CONSTRAINT rota_pontos_estabelecimento_assinante_fk
    FOREIGN KEY (estabelecimento_id, assinante_id)
    REFERENCES estabelecimentos (id, assinante_id)
);

CREATE INDEX IF NOT EXISTS rota_pontos_rota_ordem_idx
  ON rota_pontos (rota_id, ordem);

CREATE INDEX IF NOT EXISTS rota_pontos_assinante_status_idx
  ON rota_pontos (assinante_id, status);

CREATE TABLE IF NOT EXISTS visitas (
  id BIGSERIAL PRIMARY KEY,
  rota_id BIGINT NULL REFERENCES rotas_operacionais(id) ON DELETE SET NULL,
  rota_ponto_id BIGINT NULL REFERENCES rota_pontos(id) ON DELETE SET NULL,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  estabelecimento_id INTEGER NOT NULL,
  usuario_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'em_andamento',
  latitude_chegada DOUBLE PRECISION NULL,
  longitude_chegada DOUBLE PRECISION NULL,
  data_chegada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_finalizacao TIMESTAMPTZ NULL,
  motivo_nao_realizada TEXT NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visitas_status_check
    CHECK (status IN ('em_andamento', 'finalizada', 'nao_realizada', 'cancelada')),
  CONSTRAINT visitas_estabelecimento_assinante_fk
    FOREIGN KEY (estabelecimento_id, assinante_id)
    REFERENCES estabelecimentos (id, assinante_id)
);

CREATE INDEX IF NOT EXISTS visitas_assinante_status_idx
  ON visitas (assinante_id, status);

CREATE INDEX IF NOT EXISTS visitas_estabelecimento_idx
  ON visitas (estabelecimento_id);

CREATE TABLE IF NOT EXISTS visita_produtos (
  id BIGSERIAL PRIMARY KEY,
  visita_id BIGINT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  assinante_id BIGINT NOT NULL REFERENCES assinantes(id),
  produto VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  sangria_id BIGINT NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visita_produtos_produto_check
    CHECK (produto IN ('BOLINHAS', 'FIGURINHAS', 'PELUCIAS')),
  CONSTRAINT visita_produtos_status_check
    CHECK (status IN ('pendente', 'registrado', 'sem_movimentacao', 'nao_realizada'))
);

CREATE UNIQUE INDEX IF NOT EXISTS visita_produtos_visita_produto_idx
  ON visita_produtos (visita_id, produto);

CREATE INDEX IF NOT EXISTS visita_produtos_assinante_produto_idx
  ON visita_produtos (assinante_id, produto);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON email_verification_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
  ON email_verification_tokens (expires_at);

CREATE TABLE IF NOT EXISTS interessados (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  email VARCHAR(160) NULL,
  produtos TEXT NULL,
  preferencia_contato VARCHAR(40) NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contato_status VARCHAR(24) NOT NULL DEFAULT 'pendente',
  contato_realizado_em TIMESTAMPTZ NULL,
  contato_atualizado_em TIMESTAMPTZ NULL,
  CONSTRAINT interessados_contato_status_check
    CHECK (contato_status IN ('pendente', 'contatado'))
);

CREATE INDEX IF NOT EXISTS interessados_data_idx
  ON interessados (data DESC);

CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(220) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  resumo TEXT NULL,
  conteudo TEXT NULL,
  categoria VARCHAR(120) NULL,
  imagem_capa TEXT NULL,
  meta_title VARCHAR(220) NULL,
  meta_description TEXT NULL,
  autor VARCHAR(120) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  data_publicacao TIMESTAMPTZ NULL,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NULL,
  CONSTRAINT blog_posts_status_check
    CHECK (status IN ('rascunho', 'publicado', 'agendado', 'arquivado'))
);

CREATE INDEX IF NOT EXISTS blog_posts_status_idx
  ON blog_posts (status);

CREATE INDEX IF NOT EXISTS blog_posts_categoria_idx
  ON blog_posts (categoria);

CREATE INDEX IF NOT EXISTS blog_posts_data_publicacao_idx
  ON blog_posts (data_publicacao DESC);
