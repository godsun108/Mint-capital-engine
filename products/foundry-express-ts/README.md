# Foundry Express TypeScript Starter

A small, runnable Express + TypeScript starter for beginning a JSON API without recreating the baseline project setup.

## Included

- Express 5 server
- strict TypeScript configuration
- JSON request middleware
- `GET /health` health endpoint
- `GET /` starter endpoint
- environment variable example
- development, build, and production start scripts

## Requirements

- Node.js 20+ recommended
- npm

## Quick start

1. Copy `.env.example` to `.env` if you want to customize the environment.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000/health`.

Expected response:

```json
{"ok":true,"service":"foundry-express-ts"}
```

## Production build

```bash
npm run build
npm start
```

The compiled output is written to `dist/`.

## Project structure

```text
foundry-express-ts/
├── .env.example
├── package.json
├── tsconfig.json
└── src/
    └── server.ts
```

## What to customize next

Add your routes under `src/`, introduce validation/authentication/data storage appropriate to your application, and review dependencies and deployment configuration before production use.

## Scope

This starter intentionally stays small. It does not include a database, authentication, deployment infrastructure, or a production security guarantee. It is a starting point, not a finished production service.
