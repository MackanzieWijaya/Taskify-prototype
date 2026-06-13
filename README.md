# Taskify

Taskify is a full-stack productivity app prototype for group chat, task management, simple notifications, and dashboard summaries. It is intentionally lightweight: the backend uses seeded in-memory data, so the project can be tried locally without database setup.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- Storage: In-memory arrays seeded when the server starts

## Requirements

- Node.js `22.12.0` or newer is recommended. The checked-in `.nvmrc` uses `22.12.0`.
- npm, which is included with Node.js.

## Project Structure

```text
Taskify/
  client/   React + Vite frontend
  server/   Express API backend
```

## Run Locally

Clone the repository, then open two terminal windows from the project root.

### 1. Start the backend

```bash
cd server
npm install
npm run dev
```

The API runs at `http://localhost:5000`. You can check it at `http://localhost:5000/api/health`.

### 2. Start the frontend

```bash
cd client
npm install
npm run dev
```

The React app runs at the Vite URL shown in the terminal, usually `http://localhost:5173`.

The frontend defaults to `http://localhost:5000/api` in development. If you run the backend on another port, create `client/.env` from `client/.env.example` and update `VITE_API_URL`.

## Deployed Demo Mode

Production builds default to browser-local demo data. This gives each visitor a private seeded prototype session in their own browser tab, so test users can create groups, messages, and tasks without changing anyone else's demo.

If you want a deployed frontend to share the Express API instead, set this in the frontend environment:

```bash
VITE_TASKIFY_DEMO_MODE=false
VITE_API_URL=https://your-api-url.example/api
```

## Demo Login

```text
username: Andy
password: password123
```

Other seeded demo users include `Maya`, `Rafi`, and `Sinta` with password `demo`. This is prototype-only authentication; logging in stores the selected demo user in `localStorage`.

## Useful Scripts

Run these from the matching app folder.

```bash
# server/
npm run dev      # start Express with nodemon
npm start        # start Express with node

# client/
npm run dev      # start Vite dev server
npm run build    # create a production build
npm run preview  # preview the production build
```

## API Routes

- `GET /api/health`
- `GET /api/users`
- `GET /api/teams`
- `POST /api/teams`
- `PATCH /api/teams/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`
- `GET /api/messages`
- `POST /api/messages`
- `PATCH /api/messages/:id`
- `DELETE /api/messages/:id`
- `PATCH /api/messages/:id/pin`
- `DELETE /api/messages/:id/pin`
- `GET /api/notifications`
- `POST /api/notifications`

## Prototype Notes

- Deployed demo data is private per browser session and resets for a new session.
- Backend data resets when the backend restarts.
- Completed tasks are pruned after the retention window used by the prototype.
- `node_modules/`, Vite build output, logs, and local `.env` files are ignored by Git. Keep both `package-lock.json` files committed so installs are reproducible.
