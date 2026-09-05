# Portal Mamae Margarida

## Deploy na Vercel

1. Importe este repositorio na Vercel.
2. Configure um PostgreSQL persistente, por exemplo Neon, e adicione `DATABASE_URL` nas variaveis do projeto.
3. Adicione `SESSION_SECRET` com um valor aleatorio longo.
4. Defina `SEED_DEMO_DATA=true` somente na primeira inicializacao se quiser os dados de demonstracao.
5. Publique o projeto. O `vercel.json` encaminha as paginas e a API para `api/index.js`.

Nao use o SQLite da Vercel para dados reais: o filesystem serverless e temporario. O SQLite continua disponivel para desenvolvimento local quando `DATABASE_URL` nao esta definido.

## Desenvolvimento local

```bash
npm install
npm start
```

Para testar:

```bash
npm test
```
