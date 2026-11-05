import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { promisify } from 'node:util';
import { collection, ObjectId } from './database.js';

const scrypt = promisify(scryptCallback);
const PRIORITIES = { Low: 1, Medium: 2, High: 3 };
const fail = (message, status) => Object.assign(new Error(message), { status });
const asId = (value) => typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null;
const idString = (value) => value?.toString();

export function validateUser(input) {
  if (!input || typeof input !== 'object') return 'Request body must be an object.';
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) return 'Name is required and must be 80 characters or fewer.';
  if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return 'A valid email (254 characters or fewer) is required.';
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) return 'Password must be between 8 and 128 characters.';
  if (input.phone !== undefined && input.phone !== null && (typeof input.phone !== 'string' || input.phone.length > 30)) return 'Phone must be 30 characters or fewer.';
  if (input.preferences !== undefined && (!input.preferences || typeof input.preferences !== 'object' || Array.isArray(input.preferences))) return 'Preferences must be an object.';
  return null;
}

export function validateService(input) {
  if (!input || typeof input !== 'object') return 'Request body must be an object.';
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) return 'Service name is required and must be 100 characters or fewer.';
  if (typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 500) return 'Description is required and must be 500 characters or fewer.';
  if (!Number.isInteger(input.expectedDuration) || input.expectedDuration < 1 || input.expectedDuration > 480) return 'Expected duration must be a whole number between 1 and 480 minutes.';
  if (!Object.hasOwn(PRIORITIES, input.priority)) return 'Priority must be Low, Medium, or High.';
  return null;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, salt, stored] = (encoded || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !stored) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function publicUser(credential, profile) {
  return { id: idString(credential._id), name: profile.fullName, email: credential.email, role: credential.role };
}

async function insertUser({ name, email, password, role = 'User', phone = null, preferences = {} }) {
  const normalizedEmail = email.trim().toLowerCase();
  const credentials = collection('userCredentials');
  if (await credentials.findOne({ email: normalizedEmail })) throw fail('An account with this email already exists.', 409);
  const id = new ObjectId();
  const credential = { _id: id, email: normalizedEmail, passwordHash: await hashPassword(password), role };
  try {
    await credentials.insertOne(credential);
    await collection('userProfiles').insertOne({
      _id: id, fullName: name.trim(), email: normalizedEmail, phone: phone ?? null,
      preferences: preferences ?? {}, createdAt: new Date(),
    });
  } catch (error) {
    await credentials.deleteOne({ _id: id });
    if (error.code === 11000) throw fail('An account with this email already exists.', 409);
    throw error;
  }
  return publicUser(credential, { fullName: name.trim() });
}

async function getServiceQueue(serviceId) {
  const serviceObjectId = asId(serviceId);
  if (!serviceObjectId) return null;
  const service = await collection('services').findOne({ _id: serviceObjectId });
  if (!service) return null;
  const queue = await collection('queues').findOne({ serviceId: serviceObjectId });
  return queue ? { service, queue } : null;
}

async function orderedEntries(queueId) {
  return collection('queueEntries').find({ queueId, status: 'waiting' })
    .sort({ priorityRank: -1, joinedAt: 1, _id: 1 }).toArray();
}

async function renumber(queueId) {
  const entries = await orderedEntries(queueId);
  if (entries.length) {
    await collection('queueEntries').bulkWrite(entries.map((entry, index) => ({
      updateOne: { filter: { _id: entry._id, status: 'waiting' }, update: { $set: { position: index + 1 } } },
    })));
  }
  return entries;
}

function entryView(entry, index, service, status = entry.status) {
  const position = status === 'waiting' ? index + 1 : 0;
  const apiStatus = status === 'served' ? 'Completed' : status === 'canceled' ? 'Left' : 'Waiting';
  return {
    id: idString(entry._id), userId: idString(entry.userId), userName: entry.userName,
    serviceId: idString(entry.serviceId), serviceName: service.name, priority: entry.priority,
    arrival: entry.joinedAt.getTime(), joinedAt: entry.joinedAt.toISOString(), status: apiStatus,
    position, estimatedWait: position ? (position - 1) * service.expectedDuration : 0,
  };
}

async function refreshQueueSnapshots(serviceId) {
  const context = await getServiceQueue(serviceId);
  if (!context) return [];
  const entries = await renumber(context.queue._id);
  return entries.map((entry, index) => entryView(entry, index, context.service));
}

export const store = {
  async register(input) {
    const error = validateUser(input); if (error) throw fail(error, 400);
    return insertUser({ name: input.name, email: input.email, password: input.password, phone: input.phone, preferences: input.preferences });
  },

  async seedAdministrator({ name, email, password }) {
    if (!email || !password) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (await collection('userCredentials').findOne({ email: normalizedEmail })) return;
    await insertUser({ name: name || 'QueueSmart Administrator', email: normalizedEmail, password, role: 'Administrator' });
  },

  async seedDefaultServices() {
    const defaults = [
      { id: 'advising', name: 'Advising', description: 'Academic advising and planning', expectedDuration: 15, priority: 'Medium' },
      { id: 'student-services', name: 'Student Services', description: 'Student records and support', expectedDuration: 25, priority: 'Low' },
      { id: 'technical-support', name: 'Technical Support', description: 'Campus technology help', expectedDuration: 10, priority: 'High' },
    ];
    for (const item of defaults) {
      let service = await collection('services').findOne({ name: item.name });
      if (!service) {
        const _id = new ObjectId();
        await collection('services').insertOne({ _id, name: item.name, description: item.description, expectedDuration: item.expectedDuration, priority: item.priority, open: true, createdAt: new Date() });
        service = { _id };
      }
      await collection('queues').updateOne({ serviceId: service._id }, { $setOnInsert: { serviceId: service._id, status: 'open', createdAt: new Date() } }, { upsert: true });
    }
  },

  async login(input) {
    if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') throw fail('Email and password are required.', 400);
    const email = input.email.trim().toLowerCase();
    const credential = await collection('userCredentials').findOne({ email });
    if (!credential || !await verifyPassword(input.password, credential.passwordHash)) throw fail('Email or password is incorrect.', 401);
    const profile = await collection('userProfiles').findOne({ _id: credential._id });
    if (!profile) throw fail('User profile is missing.', 500);
    return publicUser(credential, profile);
  },

  async getUserRole(userId) {
    const _id = asId(userId); if (!_id) return null;
    return (await collection('userCredentials').findOne({ _id }, { projection: { role: 1 } }))?.role ?? null;
  },

  async listServices() {
    const services = await collection('services').find().sort({ name: 1 }).toArray();
    return Promise.all(services.map(async (service) => {
      const queue = await collection('queues').findOne({ serviceId: service._id });
      const queueLength = queue ? await collection('queueEntries').countDocuments({ queueId: queue._id, status: 'waiting' }) : 0;
      return { id: idString(service._id), name: service.name, description: service.description, expectedDuration: service.expectedDuration, priority: service.priority, open: service.open, queueLength };
    }));
  },

  async saveService(input, id) {
    const error = validateService(input); if (error) throw fail(error, 400);
    const services = collection('services');
    const values = { name: input.name.trim(), description: input.description.trim(), expectedDuration: input.expectedDuration, priority: input.priority };
    try {
      if (id) {
        const _id = asId(id); if (!_id) throw fail('Service not found.', 404);
        const result = await services.updateOne({ _id }, { $set: values });
        if (!result.matchedCount) throw fail('Service not found.', 404);
        const service = await services.findOne({ _id });
        await collection('queues').updateOne({ serviceId: _id }, { $setOnInsert: { serviceId: _id, status: service.open ? 'open' : 'closed', createdAt: new Date() } }, { upsert: true });
        return { id: idString(_id), ...values, open: service.open };
      }
      const _id = new ObjectId();
      const service = { _id, ...values, open: true, createdAt: new Date() };
      await services.insertOne(service);
      await collection('queues').insertOne({ serviceId: _id, status: 'open', createdAt: new Date() });
      return { id: idString(_id), ...values, open: true };
    } catch (cause) {
      if (cause.code === 11000) throw fail('A service with this name already exists.', 409);
      throw cause;
    }
  },

  async setServiceOpen(id, open) {
    const _id = asId(id); if (!_id) throw fail('Service not found.', 404);
    const result = await collection('services').updateOne({ _id }, { $set: { open } });
    if (!result.matchedCount) throw fail('Service not found.', 404);
    await collection('queues').updateOne({ serviceId: _id }, { $set: { status: open ? 'open' : 'closed' }, $setOnInsert: { serviceId: _id, createdAt: new Date() } }, { upsert: true });
    const service = await collection('services').findOne({ _id });
    return { id: idString(_id), name: service.name, description: service.description, expectedDuration: service.expectedDuration, priority: service.priority, open };
  },

  async joinQueue(input) {
    if (!input || typeof input !== 'object') throw fail('Request body must be an object.', 400);
    const userId = asId(input.userId); const serviceId = asId(input.serviceId);
    if (!userId || !serviceId) throw fail('A valid userId and serviceId are required.', 400);
    const [profile, context] = await Promise.all([
      collection('userProfiles').findOne({ _id: userId }), getServiceQueue(input.serviceId),
    ]);
    if (!profile) throw fail('A valid userId is required.', 400);
    if (!context) throw fail('Service not found.', 404);
    if (!context.service.open || context.queue.status !== 'open') throw fail('This queue is closed.', 409);
    const entries = collection('queueEntries');
    if (await entries.findOne({ queueId: context.queue._id, userId, status: 'waiting' })) throw fail('You are already waiting in this queue.', 409);
    const position = await entries.countDocuments({ queueId: context.queue._id, status: 'waiting' }) + 1;
    const joinedAt = new Date(); const _id = new ObjectId();
    const entry = { _id, queueId: context.queue._id, serviceId, userId, userName: profile.fullName, position, priority: context.service.priority, priorityRank: PRIORITIES[context.service.priority], joinedAt, status: 'waiting' };
    try { await entries.insertOne(entry); }
    catch (cause) { if (cause.code === 11000) throw fail('You are already waiting in this queue.', 409); throw cause; }
    await collection('history').insertOne({ userId, queueId: context.queue._id, queueEntryId: _id, serviceId, serviceName: context.service.name, timestamp: joinedAt, outcome: 'Joined queue' });
    await collection('notifications').insertOne({ userId, message: `You joined the ${context.service.name} queue.`, timestamp: joinedAt, status: 'sent' });
    const queueNow = await refreshQueueSnapshots(input.serviceId);
    const snapshot = queueNow.find((item) => item.id === idString(_id));
    if (snapshot?.position <= 2) await collection('notifications').insertOne({ userId, message: `You are close to being served in ${context.service.name}.`, timestamp: new Date(), status: 'sent' });
    return snapshot;
  },

  async queue(serviceId) {
    const context = await getServiceQueue(serviceId); if (!context) return [];
    const entries = await orderedEntries(context.queue._id);
    return entries.map((entry, index) => entryView(entry, index, context.service));
  },

  async myQueue(userId) {
    const _id = asId(userId); if (!_id) return [];
    const entries = await collection('queueEntries').find({ userId: _id, status: 'waiting' }).sort({ joinedAt: 1 }).toArray();
    const results = [];
    for (const entry of entries) {
      const context = await getServiceQueue(idString(entry.serviceId));
      if (!context) continue;
      const queue = await orderedEntries(context.queue._id);
      const index = queue.findIndex((item) => item._id.equals(entry._id));
      if (index >= 0) results.push(entryView(entry, index, context.service));
    }
    return results;
  },

  async leaveQueue(id, userId) {
    const _id = asId(id); const ownerId = asId(userId);
    if (!_id || !ownerId) throw fail('Waiting queue entry not found.', 404);
    const entries = collection('queueEntries');
    const entry = await entries.findOne({ _id, userId: ownerId, status: 'waiting' });
    if (!entry) throw fail('Waiting queue entry not found.', 404);
    await entries.updateOne({ _id, status: 'waiting' }, { $set: { status: 'canceled' } });
    await collection('history').updateOne({ queueEntryId: _id }, { $set: { outcome: 'Left queue', timestamp: new Date() } });
    await renumber(entry.queueId);
    const service = await collection('services').findOne({ _id: entry.serviceId });
    return entryView(entry, -1, service, 'canceled');
  },

  async serveNext(serviceId) {
    const context = await getServiceQueue(serviceId); if (!context) throw fail('Service not found.', 404);
    const entries = await orderedEntries(context.queue._id); const entry = entries[0];
    if (!entry) throw fail('The queue is empty.', 404);
    await collection('queueEntries').updateOne({ _id: entry._id, status: 'waiting' }, { $set: { status: 'served' } });
    await collection('history').updateOne({ queueEntryId: entry._id }, { $set: { outcome: 'Completed', timestamp: new Date() } });
    await collection('notifications').insertOne({ userId: entry.userId, message: `It is your turn for ${context.service.name}.`, timestamp: new Date(), status: 'sent' });
    await renumber(context.queue._id);
    return entryView(entry, -1, context.service, 'served');
  },

  async history(userId) {
    const _id = asId(userId); if (!_id) return [];
    const records = await collection('history').find({ userId: _id }).sort({ timestamp: -1 }).toArray();
    return records.map((record) => ({ id: idString(record._id), userId: idString(record.userId), serviceName: record.serviceName, joinedAt: record.timestamp.toISOString(), outcome: record.outcome }));
  },

  async notifications(userId) {
    const _id = asId(userId); if (!_id) return [];
    const records = await collection('notifications').find({ userId: _id }).sort({ timestamp: -1 }).toArray();
    return records.map((record) => ({ id: idString(record._id), message: record.message, createdAt: record.timestamp.toISOString(), status: record.status }));
  },

  async resetStore() {
    await Promise.all(['userCredentials', 'userProfiles', 'services', 'queues', 'queueEntries', 'notifications', 'history'].map((name) => collection(name).deleteMany({})));
    await this.seedDefaultServices();
  },
};

export { hashPassword, verifyPassword };
