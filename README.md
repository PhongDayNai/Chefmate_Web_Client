# ChefMate Web Client

ChefMate Web Client is the web companion for the ChefMate ecosystem, built with **Next.js App Router**.

It focuses on recipe discovery, pantry-aware cooking workflows, and a server-driven chat experience with `Bepes` to support cooking sessions.

This repository contains the web client only.

## What It Does

- Browse and search recipes
- View trending recipes and personalized results
- Read recipe details and cooking steps
- Create recipes with image upload support
- Manage pantry ingredients and diet notes
- Use `Bepes` chat for cooking guidance and meal flow
- Sign in, sign up, and manage user profile

## App Areas

- `Auth`: sign in, register, and session handling
- `Home`: recipe discovery and trending entry points
- `Search`: keyword/tag-based recipe exploration
- `Recipe`: recipe detail and creation flow
- `Pantry`: ingredient inventory management
- `Profile`: account info and personal settings
- `Chat`: server-driven cooking conversations and meal context

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Docker + Docker Compose

## Production Website

- https://chefmate.phongdaynai.id.vn

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- A running ChefMate backend (JWT API)

### Configure Environment

Create local env from template:

```bash
cp .env.example .env.local
```

Main keys:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-host.example.com
NEXT_PUBLIC_CHAT_API_TOKEN=replace-with-chat-api-key
```

Auth model used by client:
- Private endpoints: `Authorization: Bearer <accessToken>`
- Chat endpoints (`/v2/ai-chat*`, `/v2/ai-chat-v1*`):
  - `Authorization: Bearer <accessToken>`
  - `x-api-key: <NEXT_PUBLIC_CHAT_API_TOKEN>`

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Build For Production

```bash
npm run build
npm run start
```

## Type Check

```bash
npm run typecheck
```

## Run With Docker

```bash
docker compose up --build -d
```

Default exposed port:
- `http://localhost:13080`

## Architecture Notes

This web app is a client for a separate backend service. Chat/session state is managed on the server side; the web app renders and interacts with that state.

`Bepes` chat is server-driven, including:
- session lifecycle
- message history
- active recipe focus
- meal progress and completion checks

## Repository Layout

- `app/`: app routes, features, and UI
- `public/`: static assets
- `docs/`: integration and implementation notes
- `Dockerfile`, `docker-compose.yml`: containerized deployment

## Ecosystem

- Android client: [ChefMate_Client](https://github.com/PhongDayNai/ChefMate_Client)
- Server API: [chefmate-server](https://github.com/PhongDayNai/chefmate-server)
- Admin web: [ChefMate_Admin_Web](https://github.com/PhongDayNai/ChefMate_Admin_Web)

## Open Source Status

This repository is being documented and cleaned for open-source collaboration.

If you find issues or want to improve the project, feel free to open an issue or pull request.

Community files (license/contributing templates) may be refined further over time.
