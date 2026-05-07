# Banco limpo de producao

Este projeto nao deve comercializar usando o banco de desenvolvimento com dados de teste. O caminho correto e criar um banco novo, vazio, aplicar o schema e criar o primeiro admin.

## Fluxo seguro

1. Crie um banco PostgreSQL novo no provedor.
2. Copie a URL desse banco para `CLEAN_DATABASE_URL`.
3. Rode `npm run db:migrate`.
4. Defina `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
5. Rode `npm run db:seed-admin`.
6. Configure `SAAS_ADMIN_USER_IDS` com o `user_id` exibido pelo seed.
7. So depois disso troque o `DATABASE_URL` da producao para o banco novo.

## Regras de seguranca

- Nao rode scripts de limpeza no banco atual.
- `CLEAN_DATABASE_URL` deve apontar para um banco novo e vazio.
- `DATABASE_URL` continua sendo o banco atual de desenvolvimento ou staging ate a virada oficial.
- Os scripts nao fazem `DROP TABLE`, nao apagam dados e nao zeram tabelas.
- Se precisar rodar usando `DATABASE_URL`, o script exige `CONFIRM_CLEAN_DB_INIT=true`.

## Observacao sobre consignados

O codigo ja mostra "consignados" para o usuario, mas algumas estruturas internas ainda usam nomes historicos como `sangrias_figurinhas` e produto `FIGURINHAS`. Isso foi mantido de proposito para nao quebrar o sistema antes de uma migration especifica de renomeacao.
