# QueueSmart — COSC4353 Group 19

QueueSmart is a queue management application with a React/Vite front end and a Node.js HTTP API. The API uses only Node's built-in modules and stores data in memory; restarting the server resets registrations, services added at runtime, queue participation, and notifications.

## Run locally

Requires Node.js 20.19+ or 22.12+ (Vite 8 requirement).

```sh
npm install
npm run server       # API at http://localhost:3001
npm run dev          # UI at http://localhost:5173 (proxies /api to port 3001)
npm test             # Node unit tests
```

For an administrator login, set `QUEUESMART_ADMIN_EMAIL` and `QUEUESMART_ADMIN_PASSWORD` before starting `npm run server`. Optionally set `QUEUESMART_ADMIN_NAME`. Public registration always creates a User account. The admin account is seeded only at API startup.

## API overview

All responses and request bodies use JSON. Errors have the shape `{ "error": "..." }`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a User (`name`, `email`, `password`) |
| POST | `/api/auth/login` | Authenticate and return the user profile |
| GET | `/api/services` | List services and queue lengths |
| POST | `/api/services` | Create a service (Administrator) |
| PUT | `/api/services/:id` | Update a service (Administrator) |
| PATCH | `/api/services/:id/open` | Set queue open state (Administrator) |
| POST | `/api/queue` | Join (`userId`, `serviceId`) |
| GET | `/api/queue?serviceId=...` | View a service queue (Administrator) |
| GET | `/api/queue/mine?userId=...` | View a user's active queue entries |
| DELETE | `/api/queue/:entryId?userId=...` | Leave a queue |
| POST | `/api/queue/:serviceId/serve-next` | Serve the next person (Administrator) |
| GET | `/api/history?userId=...` | Participation history |
| GET | `/api/notifications?userId=...` | In-app notification log |

Service validation limits names to 100 characters, descriptions to 500, and duration to 1–480 whole minutes. Queue entries sort by the service priority and arrival time; the wait estimate is the count ahead multiplied by expected duration. A notification is recorded when someone joins and when their initial position is within two.

## Technologies and design

- **Backend:** Node.js built-in HTTP server and JavaScript ES modules. This keeps the API dependency-free for a small assignment, exposes conventional REST routes, and supports focused in-memory business logic without adding a database.
- **Frontend:** React, Vite, JavaScript, CSS, and React Router. The UI talks to `/api`; Vite forwards those calls to the local API server.
- **Data:** In-memory arrays only, as required for A3. This prototype is not suitable for production: identity is represented by a client-supplied ID, passwords are plain in-memory values, data resets on restart, and the API has no token/session authentication or rate limiting. Administrative route checks use the signed-in user's ID header solely as a classroom prototype.

## Tests

`npm test` runs `node --test` against registration/login validation, service validation, queue ordering and wait estimates, join/leave/serve history, closed-queue behavior, duplicate joins, and notification creation. Tests are in `server/store.test.js`.
