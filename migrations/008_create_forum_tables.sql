CREATE TABLE IF NOT EXISTS forum_categories (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES forum_categories(id) ON DELETE RESTRICT,
  author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assinante_id BIGINT REFERENCES assinantes(id) ON DELETE SET NULL,
  titulo VARCHAR(140) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  conteudo TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT forum_topics_status_check
    CHECK (status IN ('open', 'closed', 'hidden'))
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assinante_id BIGINT REFERENCES assinantes(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT forum_replies_status_check
    CHECK (status IN ('visible', 'hidden'))
);

CREATE INDEX IF NOT EXISTS idx_forum_categories_active_order
  ON forum_categories (is_active, ordem, nome);

CREATE INDEX IF NOT EXISTS idx_forum_topics_category_status_last_reply
  ON forum_topics (category_id, status, is_pinned DESC, last_reply_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_topics_status_created
  ON forum_topics (status, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_topics_author_user
  ON forum_topics (author_user_id);

CREATE INDEX IF NOT EXISTS idx_forum_topics_assinante
  ON forum_topics (assinante_id);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_status_created
  ON forum_replies (topic_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_forum_replies_author_user
  ON forum_replies (author_user_id);

CREATE INDEX IF NOT EXISTS idx_forum_replies_assinante
  ON forum_replies (assinante_id);