# QueueSmart — COSC4353 Group 19

QueueSmart is a queue management application with a React/Vite front end, a Node.js HTTP API, and MongoDB persistence.

## Run locally

Requires Node.js 20.19+ or 22.12+ (Vite 8 requirement) and MongoDB Community Server or a MongoDB Atlas connection string.

```sh
npm install
cp .env.example .env  # edit the MongoDB URI and local admin password
npm run server       # API at http://localhost:3001 (connects to MongoDB)
npm run dev          # UI at http://localhost:5173 (proxies /api to port 3001)
npm test             # Node unit tests
npm run test:coverage # Unit tests with a coverage summary
```

By default, the API connects to `mongodb://127.0.0.1:27017` and database `queuesmart`. For MongoDB Atlas or a different server, set `MONGODB_URI`; optionally set `MONGODB_DB`. The configured database must be reachable before the API starts.

For an administrator login, set `QUEUESMART_ADMIN_EMAIL` and `QUEUESMART_ADMIN_PASSWORD` before starting `npm run server`. Optionally set `QUEUESMART_ADMIN_NAME`. The administrator is inserted into MongoDB on startup if that email is not already registered. Public registration always creates a User account. Do not commit real credentials or a `.env` file.

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

## NoSQL document design

MongoDB stores the assignment's data in seven collections. MongoDB JSON Schema validators enforce required fields, types, and length/range constraints; unique indexes enforce email, service name, one queue per service, and one waiting entry per user per queue.

| Collection | Document shape and relationships |
| --- | --- |
| `userCredentials` | `_id`, unique normalized `email`, `passwordHash` (salted scrypt), `role` (`User` or `Administrator`) |
| `userProfiles` | `_id` references the matching credential ID; `fullName`, `email`, optional `phone`, `preferences`, `createdAt` |
| `services` | `_id`, unique `name`, `description`, `expectedDuration`, `priority`, `open`, `createdAt` |
| `queues` | `_id`, unique `serviceId` reference, `status` (`open`/`closed`), `createdAt` |
| `queueEntries` | `_id`, `queueId`, `serviceId`, `userId` references, `position`, `priority`, `priorityRank`, `joinedAt`, `status` (`waiting`/`served`/`canceled`) |
| `notifications` | `_id`, `userId`, `message`, `timestamp`, `status` (`sent`/`viewed`) |
| `history` | `_id`, `userId`, `queueId`, `queueEntryId`, `serviceId`, `serviceName`, `timestamp`, `outcome` |

Example documents:

```json
{
  "_id": "ObjectId",
  "email": "student@example.com",
  "passwordHash": "scrypt$<salt>$<derived-key>",
  "role": "User"
}
```

```json
{
  "_id": "ObjectId",
  "queueId": "ObjectId",
  "serviceId": "ObjectId",
  "userId": "ObjectId",
  "userName": "Taylor Student",
  "position": 2,
  "priority": "Medium",
  "priorityRank": 2,
  "joinedAt": "2026-10-31T16:30:00.000Z",
  "status": "waiting"
}
```

## Technologies and design

- **Backend:** Node.js HTTP server, JavaScript ES modules, and the official MongoDB Node.js driver. MongoDB collections persist the QueueSmart records and support indexes and server-side document validation.
- **Frontend:** React, Vite, JavaScript, CSS, and React Router. The UI talks to `/api`; Vite forwards those calls to the local API server.
- **Passwords:** Stored as salted scrypt hashes; plaintext passwords are never written to MongoDB.
- **Prototype limits:** The existing classroom API identifies users using a client-supplied ID header rather than a signed session token. The MongoDB integration provides persistence but this authentication design is not production-grade.

## Tests

`npm test` runs unit tests for registration/login and password hashing, service validation and updates, queue positions and estimates, join/leave/serve history, closed-queue behavior, duplicate joins, and notification creation. The store tests use a lightweight MongoDB collection test double, so they can run without a database process. The actual API uses MongoDB at runtime. `npm run test:coverage` prints a coverage summary.
