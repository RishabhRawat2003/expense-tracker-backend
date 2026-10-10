# Expense Tracker API

Node.js + Express + TypeScript + PostgreSQL.

## Run

```bash
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

Update `DATABASE_URL` in `.env` to point to your Postgres database. The API runs on `http://localhost:4000`.

Demo login after seeding: `demo@spendwise.app` / `demo1234`

## Build

```bash
npm run build
npm start
```
