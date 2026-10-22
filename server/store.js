import { randomUUID } from 'node:crypto';

const PRIORITIES = { Low: 1, Medium: 2, High: 3 };
const users = [];
const services = [
  { id: 'advising', name: 'Advising', description: 'Academic advising and planning', expectedDuration: 15, priority: 'Medium', open: true },
  { id: 'student-services', name: 'Student Services', description: 'Student records and support', expectedDuration: 25, priority: 'Low', open: true },
  { id: 'technical-support', name: 'Technical Support', description: 'Campus technology help', expectedDuration: 10, priority: 'High', open: true },
];
const entries = [];
const notificationLog = [];
const history = [];
let arrivalCounter = 0;

export function resetStore() {
  users.length = 0; entries.length = 0; notificationLog.length = 0; history.length = 0; arrivalCounter = 0;
  services.splice(0, services.length,
    { id: 'advising', name: 'Advising', description: 'Academic advising and planning', expectedDuration: 15, priority: 'Medium', open: true },
    { id: 'student-services', name: 'Student Services', description: 'Student records and support', expectedDuration: 25, priority: 'Low', open: true },
    { id: 'technical-support', name: 'Technical Support', description: 'Campus technology help', expectedDuration: 10, priority: 'High', open: true });
}

export function validateUser(input) {
  if (!input || typeof input !== 'object') return 'Request body must be an object.';
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) return 'Name is required and must be 80 characters or fewer.';
  if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return 'A valid email (254 characters or fewer) is required.';
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) return 'Password must be between 8 and 128 characters.';
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

function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function currentQueue(serviceId) {
  return entries.filter((entry) => entry.serviceId === serviceId && entry.status === 'Waiting')
    .sort((a, b) => PRIORITIES[b.priority] - PRIORITIES[a.priority] || a.arrival - b.arrival);
}
function snapshot(entry) {
  if (!entry) return null;
  const queue = currentQueue(entry.serviceId);
  const position = queue.findIndex((item) => item.id === entry.id) + 1;
  const service = services.find((item) => item.id === entry.serviceId);
  return { ...entry, position: position || 0, estimatedWait: position ? (position - 1) * service.expectedDuration : 0 };
}

export const store = {
  users,
  register(input) {
    const error = validateUser(input); if (error) throw Object.assign(new Error(error), { status: 400 });
    if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
    const user = { id: randomUUID(), name: input.name.trim(), email: input.email.trim(), password: input.password, role: 'User' };
    users.push(user); return publicUser(user);
  },
  seedAdministrator({ name, email, password }) {
    if (!email || !password || users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return;
    users.push({ id: randomUUID(), name: name || 'QueueSmart Administrator', email, password, role: 'Administrator' });
  },
  login(input) {
    if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') throw Object.assign(new Error('Email and password are required.'), { status: 400 });
    const user = users.find((item) => item.email.toLowerCase() === input.email.toLowerCase() && item.password === input.password);
    if (!user) throw Object.assign(new Error('Email or password is incorrect.'), { status: 401 });
    return publicUser(user);
  },
  listServices() { return services.map((service) => ({ ...service, queueLength: currentQueue(service.id).length })); },
  saveService(input, id) {
    const error = validateService(input); if (error) throw Object.assign(new Error(error), { status: 400 });
    const existing = id ? services.find((item) => item.id === id) : null;
    if (id && !existing) throw Object.assign(new Error('Service not found.'), { status: 404 });
    const service = { ...existing, id: existing?.id ?? randomUUID(), name: input.name.trim(), description: input.description.trim(), expectedDuration: input.expectedDuration, priority: input.priority, open: existing?.open ?? true };
    if (existing) Object.assign(existing, service); else services.push(service);
    return { ...service };
  },
  setServiceOpen(id, open) {
    const service = services.find((item) => item.id === id); if (!service) throw Object.assign(new Error('Service not found.'), { status: 404 });
    service.open = open; return { ...service };
  },
  joinQueue({ userId, serviceId }) {
    const user = users.find((item) => item.id === userId); if (!user) throw Object.assign(new Error('A valid userId is required.'), { status: 400 });
    const service = services.find((item) => item.id === serviceId); if (!service) throw Object.assign(new Error('Service not found.'), { status: 404 });
    if (!service.open) throw Object.assign(new Error('This queue is closed.'), { status: 409 });
    if (entries.some((entry) => entry.userId === userId && entry.serviceId === serviceId && entry.status === 'Waiting')) throw Object.assign(new Error('You are already waiting in this queue.'), { status: 409 });
    const entry = { id: randomUUID(), userId, userName: user.name, serviceId, serviceName: service.name, priority: service.priority, arrival: arrivalCounter++, joinedAt: new Date().toISOString(), status: 'Waiting' };
    entries.push(entry); history.push({ id: entry.id, userId, serviceName: service.name, joinedAt: entry.joinedAt, outcome: 'Joined queue' });
    notificationLog.unshift({ id: randomUUID(), userId, message: `You joined the ${service.name} queue.`, createdAt: new Date().toISOString() });
    const result = snapshot(entry); if (result.position <= 2) notificationLog.unshift({ id: randomUUID(), userId, message: `You are close to being served in ${service.name}.`, createdAt: new Date().toISOString() });
    return result;
  },
  queue(serviceId) { return currentQueue(serviceId).map(snapshot); },
  myQueue(userId) { return entries.filter((item) => item.userId === userId && item.status === 'Waiting').map(snapshot); },
  leaveQueue(id, userId) {
    const entry = entries.find((item) => item.id === id && item.userId === userId && item.status === 'Waiting');
    if (!entry) throw Object.assign(new Error('Waiting queue entry not found.'), { status: 404 });
    entry.status = 'Left'; history.find((item) => item.id === id).outcome = 'Left queue'; return { ...entry };
  },
  serveNext(serviceId) {
    const entry = currentQueue(serviceId)[0]; if (!entry) throw Object.assign(new Error('The queue is empty.'), { status: 404 });
    entry.status = 'Completed'; const record = history.find((item) => item.id === entry.id); if (record) record.outcome = 'Completed';
    return { ...entry };
  },
  history(userId) { return history.filter((item) => item.userId === userId).map((item) => ({ ...item })); },
  notifications(userId) { return notificationLog.filter((item) => item.userId === userId).map((item) => ({ ...item })); },
};
