import { MongoClient, ObjectId } from 'mongodb';
import process from 'node:process';

let client;
let database;

const schemas = {
  userCredentials: {
    bsonType: 'object', required: ['email', 'passwordHash', 'role'],
    properties: {
      _id: { bsonType: 'objectId' },
      email: { bsonType: 'string', minLength: 3, maxLength: 254 },
      passwordHash: { bsonType: 'string', minLength: 32, maxLength: 256 },
      role: { enum: ['User', 'Administrator'] },
    },
    additionalProperties: false,
  },
  userProfiles: {
    bsonType: 'object', required: ['fullName', 'email', 'phone', 'preferences', 'createdAt'],
    properties: {
      _id: { bsonType: 'objectId' },
      fullName: { bsonType: 'string', minLength: 1, maxLength: 80 },
      email: { bsonType: 'string', minLength: 3, maxLength: 254 },
      phone: { bsonType: ['string', 'null'], maxLength: 30 },
      preferences: { bsonType: 'object' },
      createdAt: { bsonType: 'date' },
    },
  },
  services: {
    bsonType: 'object', required: ['name', 'description', 'expectedDuration', 'priority', 'open', 'createdAt'],
    properties: {
      _id: { bsonType: 'objectId' },
      name: { bsonType: 'string', minLength: 1, maxLength: 100 },
      description: { bsonType: 'string', minLength: 1, maxLength: 500 },
      expectedDuration: { bsonType: 'int', minimum: 1, maximum: 480 },
      priority: { enum: ['Low', 'Medium', 'High'] },
      open: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
    },
  },
  queues: {
    bsonType: 'object', required: ['serviceId', 'status', 'createdAt'],
    properties: {
      _id: { bsonType: 'objectId' },
      serviceId: { bsonType: 'objectId' },
      status: { enum: ['open', 'closed'] },
      createdAt: { bsonType: 'date' },
    },
  },
  queueEntries: {
    bsonType: 'object', required: ['queueId', 'serviceId', 'userId', 'userName', 'position', 'priority', 'priorityRank', 'joinedAt', 'status'],
    properties: {
      _id: { bsonType: 'objectId' },
      queueId: { bsonType: 'objectId' }, serviceId: { bsonType: 'objectId' }, userId: { bsonType: 'objectId' },
      userName: { bsonType: 'string', minLength: 1, maxLength: 80 },
      position: { bsonType: 'int', minimum: 1 },
      priority: { enum: ['Low', 'Medium', 'High'] },
      priorityRank: { bsonType: 'int', minimum: 1, maximum: 3 },
      joinedAt: { bsonType: 'date' },
      status: { enum: ['waiting', 'served', 'canceled'] },
    },
  },
  notifications: {
    bsonType: 'object', required: ['userId', 'message', 'timestamp', 'status'],
    properties: {
      _id: { bsonType: 'objectId' },
      userId: { bsonType: 'objectId' }, message: { bsonType: 'string', minLength: 1, maxLength: 500 },
      timestamp: { bsonType: 'date' }, status: { enum: ['sent', 'viewed'] },
    },
  },
  history: {
    bsonType: 'object', required: ['userId', 'queueId', 'queueEntryId', 'serviceId', 'serviceName', 'timestamp', 'outcome'],
    properties: {
      _id: { bsonType: 'objectId' },
      userId: { bsonType: 'objectId' }, queueId: { bsonType: 'objectId' }, queueEntryId: { bsonType: 'objectId' },
      serviceId: { bsonType: 'objectId' }, serviceName: { bsonType: 'string', minLength: 1, maxLength: 100 },
      timestamp: { bsonType: 'date' }, outcome: { enum: ['Joined queue', 'Left queue', 'Completed'] },
    },
  },
};

const indexes = {
  userCredentials: [[{ email: 1 }, { unique: true }]],
  userProfiles: [[{ email: 1 }, { unique: true }]],
  services: [[{ name: 1 }, { unique: true }]],
  queues: [[{ serviceId: 1 }, { unique: true }]],
  queueEntries: [
    [{ queueId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: 'waiting' } }],
    [{ queueId: 1, status: 1, priorityRank: -1, joinedAt: 1 }],
    [{ userId: 1, status: 1 }],
  ],
  notifications: [[{ userId: 1, timestamp: -1 }]],
  history: [[{ userId: 1, timestamp: -1 }], [{ queueEntryId: 1 }, { unique: true }]],
};

async function ensureCollections(db) {
  for (const [name, schema] of Object.entries(schemas)) {
    try {
      await db.createCollection(name, { validator: { $jsonSchema: schema }, validationLevel: 'strict' });
    } catch (error) {
      if (error.code !== 48) throw error;
      await db.command({ collMod: name, validator: { $jsonSchema: schema }, validationLevel: 'strict' });
    }
    for (const [keys, options] of indexes[name]) await db.collection(name).createIndex(keys, options);
  }
}

export async function connectDatabase({ uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', dbName = process.env.MONGODB_DB || 'queuesmart' } = {}) {
  if (database) return database;
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(dbName);
  try {
    await ensureCollections(database);
    return database;
  } catch (error) {
    await client.close(); client = undefined; database = undefined;
    throw error;
  }
}

export function getDatabase() {
  if (!database) throw new Error('Database has not been connected.');
  return database;
}

export function setDatabaseForTesting(testDatabase) { database = testDatabase; client = undefined; }

export function collection(name) { return getDatabase().collection(name); }
export { ObjectId };

export async function closeDatabase({ drop = false } = {}) {
  if (drop && database) await database.dropDatabase();
  if (client) await client.close();
  client = undefined; database = undefined;
}
