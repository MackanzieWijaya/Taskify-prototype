# Taskify

Taskify is a full-stack productivity app prototype that combines group chat, task management, simple notifications, and dashboard summaries.

## Tech Stack

- Frontend: React.js, Vite, CSS
- Backend: Node.js, Express.js
- Database: In-memory arrays seeded when the server starts

## Project Structure

```text
Taskify/
  client/   React frontend
  server/   Express backend
```

## Run Locally

Open two terminal windows from the project root.

### 1. Start the backend

```bash
cd server
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

### 2. Start the frontend

```bash
cd client
npm install
npm run dev
```

The React app runs at the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Demo Login

```text
username: Andy
password: password123
```

No real authentication is used. Logging in stores the selected demo user in `localStorage`.

## API Routes

- `GET /api/teams`
- `POST /api/teams`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`
- `GET /api/messages`
- `POST /api/messages`
- `GET /api/notifications`

## Notes

This prototype uses in-memory data so it is easy to run without database setup. Restarting the backend resets the seed data.
