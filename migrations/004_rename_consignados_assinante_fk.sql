DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sangrias_figurinhas_assinante_id_fkey'
      AND conrelid = 'public.sangrias_consignados'::regclass
  ) THEN
    ALTER TABLE sangrias_consignados
      RENAME CONSTRAINT sangrias_figurinhas_assinante_id_fkey
      TO sangrias_consignados_assinante_id_fkey;
  END IF;
END $$;
