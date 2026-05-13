ALTER TABLE sangrias_pelucias
ADD COLUMN IF NOT EXISTS pix_confirmado BOOLEAN,
ADD COLUMN IF NOT EXISTS pix_confirmado_em TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_sangrias_pelucias_pix_confirmado
ON sangrias_pelucias (assinante_id, pix_confirmado);