ALTER TABLE sangrias_consignados
ADD COLUMN IF NOT EXISTS pix_confirmado BOOLEAN,
ADD COLUMN IF NOT EXISTS pix_confirmado_em TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_sangrias_consignados_pix_confirmado
ON sangrias_consignados (assinante_id, pix_confirmado);