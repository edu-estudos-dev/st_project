DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sangrias_figurinhas_pkey'
      AND conrelid = 'public.sangrias_consignados'::regclass
  ) THEN
    ALTER TABLE sangrias_consignados
      RENAME CONSTRAINT sangrias_figurinhas_pkey
      TO sangrias_consignados_pkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_sangrias_figurinhas_assinante'
      AND conrelid = 'public.sangrias_consignados'::regclass
  ) THEN
    ALTER TABLE sangrias_consignados
      RENAME CONSTRAINT fk_sangrias_figurinhas_assinante
      TO fk_sangrias_consignados_assinante;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sangrias_figurinhas_id_seq') IS NOT NULL
     AND to_regclass('public.sangrias_consignados_id_seq') IS NULL THEN
    ALTER SEQUENCE sangrias_figurinhas_id_seq
      RENAME TO sangrias_consignados_id_seq;
  END IF;
END $$;
