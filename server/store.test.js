import test from 'node:test';
import assert from 'node:assert/strict';
import { resetStore, store, validateService, validateUser } from './store.js';

test.beforeEach(resetStore);

test('registration validates fields, defaults to User, and prevents duplicate email', () => {
  assert.match(validateUser({ name: '', email: 'a@b.com', password: '12345678' }), /Name is required/);
  assert.match(validateUser({ name: 'A', email: 'wrong', password: '12345678' }), /valid email/);
  assert.match(validateUser({ name: 'A', email: 'a@b.com', password: 'short' }), /Password/);
  const user = store.register({ name: ' Alex ', email: 'alex@example.com', password: 'password123' });
  assert.equal(user.role, 'User');
  assert.equal(user.name, 'Alex');
  assert.equal('password' in user, false);
  assert.throws(() => store.register({ name: 'Alex', email: 'ALEX@example.com', password: 'password123' }), { status: 409 });
});

test('login rejects bad credentials and authenticates a registered user', () => {
  assert.throws(() => store.login({ email: 'x@example.com', password: 'wrong' }), { status: 401 });
  const created = store.register({ name: 'Alex', email: 'x@example.com', password: 'password123' });
  assert.equal(store.login({ email: 'X@example.com', password: 'password123' }).id, created.id);
});

test('service validation enforces types, bounds, and priority choices', () => {
  assert.match(validateService({ name: 'A', description: 'desc', expectedDuration: '10', priority: 'Low' }), /whole number/);
  assert.match(validateService({ name: 'A', description: 'desc', expectedDuration: 481, priority: 'Low' }), /whole number/);
  assert.match(validateService({ name: 'A', description: 'desc', expectedDuration: 10, priority: 'Urgent' }), /Priority/);
  assert.equal(validateService({ name: 'A', description: 'desc', expectedDuration: 10, priority: 'High' }), null);
});

test('queues sort by priority then arrival, estimate waits, and record lifecycle history', () => {
  const userA = store.register({ name: 'A', email: 'a@example.com', password: 'password123' });
  const userB = store.register({ name: 'B', email: 'b@example.com', password: 'password123' });
  const userC = store.register({ name: 'C', email: 'c@example.com', password: 'password123' });
  const service = store.listServices().find((item) => item.id === 'advising');
  const first = store.joinQueue({ userId: userA.id, serviceId: service.id });
  store.joinQueue({ userId: userB.id, serviceId: service.id });
  const high = store.saveService({ name: 'Urgent', description: 'Fast lane', expectedDuration: 5, priority: 'High' });
  const priorityEntry = store.joinQueue({ userId: userC.id, serviceId: high.id });
  assert.equal(first.position, 1);
  assert.equal(store.queue(service.id)[1].estimatedWait, service.expectedDuration);
  assert.equal(priorityEntry.estimatedWait, 0);
  assert.equal(store.serveNext(service.id).userId, userA.id);
  assert.equal(store.history(userA.id)[0].outcome, 'Completed');
  store.leaveQueue(store.myQueue(userB.id)[0].id, userB.id);
  assert.equal(store.history(userB.id)[0].outcome, 'Left queue');
});

test('rejects duplicate waiting entries and closed services; logs join notifications', () => {
  const user = store.register({ name: 'A', email: 'a@example.com', password: 'password123' });
  const service = store.listServices()[0];
  const entry = store.joinQueue({ userId: user.id, serviceId: service.id });
  assert.throws(() => store.joinQueue({ userId: user.id, serviceId: service.id }), { status: 409 });
  assert.ok(store.notifications(user.id).some((item) => item.message.includes('joined')));
  store.setServiceOpen(service.id, false);
  assert.throws(() => store.joinQueue({ userId: user.id, serviceId: service.id }), { status: 409 });
  store.leaveQueue(entry.id, user.id);
  assert.throws(() => store.leaveQueue(entry.id, user.id), { status: 404 });
});
