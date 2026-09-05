# Portal Mamae Margarida

## Deploy na Vercel

1. Importe este repositorio na Vercel.
2. No Supabase, abra **Project Settings > Database > Connection string > URI**, copie a URL e adicione-a como `DATABASE_URL` nas variaveis da Vercel.
3. Adicione `SESSION_SECRET` com um valor aleatorio longo.
4. Defina `SEED_DEMO_DATA=true` somente na primeira inicializacao se quiser os dados de demonstracao.
5. Publique o projeto. A Vercel detecta automaticamente o Express exportado por `server.js`.

Nao use o SQLite da Vercel para dados reais: o filesystem serverless e temporario. O projeto usa o PostgreSQL do Supabase quando `DATABASE_URL` esta definido e SQLite apenas no desenvolvimento local.

## Desenvolvimento local

```bash
npm install
npm start
```

Para testar:

```bash
npm test
```
