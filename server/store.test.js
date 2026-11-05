import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { collection, ObjectId, setDatabaseForTesting } from './database.js';
import { store, validateService, validateUser } from './store.js';
import { server } from './index.js';

function same(left, right) {
  if (left instanceof ObjectId && right instanceof ObjectId) return left.equals(right);
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  return left === right;
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => same(document[key], value));
}

class FakeCollection {
  documents = [];
  async insertOne(document) { this.documents.push(document); return { insertedId: document._id }; }
  async findOne(filter) { return this.documents.find((document) => matches(document, filter)) ?? null; }
  find(filter = {}) {
    let results = this.documents.filter((document) => matches(document, filter));
    return {
      sort(specification) {
        const fields = Object.entries(specification);
        results = [...results].sort((left, right) => {
          for (const [field, direction] of fields) {
            const a = left[field] instanceof ObjectId ? left[field].toString() : left[field];
            const b = right[field] instanceof ObjectId ? right[field].toString() : right[field];
            if (a < b) return -direction;
            if (a > b) return direction;
          }
          return 0;
        });
        return this;
      },
      toArray: async () => results,
    };
  }
  async countDocuments(filter) { return this.documents.filter((document) => matches(document, filter)).length; }
  async updateOne(filter, update, options = {}) {
    let document = this.documents.find((item) => matches(item, filter));
    if (!document && options.upsert) {
      document = { ...filter, ...(update.$setOnInsert ?? {}) };
      this.documents.push(document);
    }
    if (!document) return { matchedCount: 0 };
    Object.assign(document, update.$set ?? {});
    if (options.upsert) Object.assign(document, update.$setOnInsert ?? {});
    return { matchedCount: 1 };
  }
  async deleteOne(filter) {
    const index = this.documents.findIndex((item) => matches(item, filter));
    if (index >= 0) this.documents.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  }
  async deleteMany() { this.documents.length = 0; }
  async bulkWrite(operations) {
    for (const operation of operations) await this.updateOne(operation.updateOne.filter, operation.updateOne.update);
  }
}

class FakeDatabase {
  collections = new Map();
  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new FakeCollection());
    return this.collections.get(name);
  }
}

function request(method, url, body, headers = {}) {
  return new Promise((resolve) => {
    const rawBody = body === undefined ? [] : [typeof body === 'string' ? body : JSON.stringify(body)];
    const req = Readable.from(rawBody);
    req.method = method; req.url = url; req.headers = { host: 'localhost', ...headers };
    const res = {
      writeHead(status, responseHeaders) { this.statusCode = status; this.headers = responseHeaders; },
      end(payload) { resolve({ status: this.statusCode, body: payload ? JSON.parse(payload) : {} }); },
    };
    server.listeners('request')[0](req, res);
  });
}

beforeEach(async () => {
  setDatabaseForTesting(new FakeDatabase());
  await store.resetStore();
});

test('registration validates fields, hashes passwords, and prevents duplicate email', async () => {
  assert.match(validateUser({ name: '', email: 'a@b.com', password: '12345678' }), /Name is required/);
  assert.match(validateUser({ name: 'A', email: 'wrong', password: '12345678' }), /valid email/);
  assert.match(validateUser({ name: 'A', email: 'a@b.com', password: 'short' }), /Password/);
  const user = await store.register({ name: ' Alex ', email: 'alex@example.com', password: 'password123' });
  assert.equal(user.role, 'User');
  assert.equal(user.name, 'Alex');
  assert.equal('password' in user, false);
  const saved = await store.login({ email: 'alex@example.com', password: 'password123' });
  assert.equal(saved.id, user.id);
  assert.equal(await store.getUserRole(user.id), 'User');
  const credential = await collection('userCredentials').findOne({ _id: new ObjectId(user.id) });
  assert.match(credential.passwordHash, /^scrypt\$/);
  assert.notEqual(credential.passwordHash, 'password123');
  await assert.rejects(store.register({ name: 'Alex', email: 'ALEX@example.com', password: 'password123' }), { status: 409 });
});

test('login rejects invalid credentials and admin seeding stores the Administrator role', async () => {
  await assert.rejects(store.login({ email: 'x@example.com', password: 'wrong' }), { status: 401 });
  await store.seedAdministrator({ email: 'admin@example.com', password: 'password123' });
  const admin = await store.login({ email: 'ADMIN@example.com', password: 'password123' });
  assert.equal(admin.role, 'Administrator');
});

test('service validation enforces types, bounds, and priority values', () => {
  assert.match(validateService({ name: 'A', description: 'desc', expectedDuration: '10', priority: 'Low' }), /whole number/);
  assert.match(validateService({ name: 'A', description: 'desc', expectedDuration: 481, priority: 'Low' }), /whole number/);
  assert.match(validateService({ name: 'A', description: 'desc', expectedDuration: 10, priority: 'Urgent' }), /Priority/);
  assert.equal(validateService({ name: 'A', description: 'desc', expectedDuration: 10, priority: 'High' }), null);
});

test('services persist, can be updated, and list queue lengths', async () => {
  const created = await store.saveService({ name: 'Tutoring', description: 'Learning support', expectedDuration: 20, priority: 'Low' });
  assert.ok(created.id);
  const changed = await store.saveService({ name: 'Tutoring', description: 'One to one support', expectedDuration: 30, priority: 'High' }, created.id);
  assert.equal(changed.expectedDuration, 30);
  assert.equal((await store.listServices()).find((service) => service.id === created.id).description, 'One to one support');
});

test('queue join returns positions and estimates; serve and leave update history', async () => {
  const userA = await store.register({ name: 'A', email: 'a@example.com', password: 'password123' });
  const userB = await store.register({ name: 'B', email: 'b@example.com', password: 'password123' });
  const service = (await store.listServices()).find((item) => item.name === 'Advising');
  const first = await store.joinQueue({ userId: userA.id, serviceId: service.id });
  await store.joinQueue({ userId: userB.id, serviceId: service.id });
  assert.equal(first.position, 1);
  assert.equal((await store.queue(service.id))[1].estimatedWait, service.expectedDuration);
  assert.equal((await store.serveNext(service.id)).userId, userA.id);
  assert.equal((await store.history(userA.id))[0].outcome, 'Completed');
  const second = (await store.myQueue(userB.id))[0];
  await store.leaveQueue(second.id, userB.id);
  assert.equal((await store.history(userB.id))[0].outcome, 'Left queue');
});

test('duplicate waiting entries and closed queues are rejected; join notifications are recorded', async () => {
  const user = await store.register({ name: 'A', email: 'a@example.com', password: 'password123' });
  const service = (await store.listServices())[0];
  const entry = await store.joinQueue({ userId: user.id, serviceId: service.id });
  await assert.rejects(store.joinQueue({ userId: user.id, serviceId: service.id }), { status: 409 });
  assert.ok((await store.notifications(user.id)).some((item) => item.message.includes('joined')));
  await store.setServiceOpen(service.id, false);
  await assert.rejects(store.joinQueue({ userId: user.id, serviceId: service.id }), { status: 409 });
  await store.leaveQueue(entry.id, user.id);
  await assert.rejects(store.leaveQueue(entry.id, user.id), { status: 404 });
});

test('HTTP routes return JSON, connect registration and service reads, and enforce administrator access', async () => {
  const health = await request('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');

  const invalidJson = await request('POST', '/api/auth/register', '{');
  assert.equal(invalidJson.status, 400);

  const registered = await request('POST', '/api/auth/register', { name: 'API User', email: 'api@example.com', password: 'password123' });
  assert.equal(registered.status, 201);
  const services = await request('GET', '/api/services');
  assert.equal(services.status, 200);
  assert.equal(services.body.services.length, 3);
  const denied = await request('GET', '/api/queue?serviceId=advising', undefined, { 'x-user-id': registered.body.user.id });
  assert.equal(denied.status, 403);
});