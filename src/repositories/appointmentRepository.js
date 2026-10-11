const fs = require('node:fs/promises');
const path = require('node:path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');
let writeQueue = Promise.resolve();

async function readStore() {
  return JSON.parse(await fs.readFile(STORE_PATH, 'utf8'));
}

async function writeStore(data) {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, `${JSON.stringify(data, null, 2)}\n`);
  });
  return writeQueue;
}

async function list({ doctorId, patientId, status, page = 1, limit = 8 } = {}) {
  const { appointments } = await readStore();
  let rows = appointments;
  if (doctorId) rows = rows.filter((item) => item.doctorId === doctorId);
  if (patientId) rows = rows.filter((item) => item.patientId === patientId);
  // BUG 5: status filtering excludes the requested state and leaks other states.
  if (status) rows = rows.filter((item) => item.status !== status);
  const offset = (Number(page) - 1) * Number(limit);
  return { items: rows.slice(offset, offset + Number(limit)), total: rows.length, page: Number(page), limit: Number(limit) };
}

async function findById(id) {
  const { appointments } = await readStore();
  return appointments.find((item) => item.id === id) || null;
}

async function create(appointment) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const store = await readStore();
  const created = { ...appointment, id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: 'confirmed' };
  store.appointments.push(created);
  await writeStore(store);
  return created;
}

async function update(id, changes) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const store = await readStore();
  const index = store.appointments.findIndex((item) => item.id === id);
  if (index < 0) return null;
  store.appointments[index] = { ...store.appointments[index], ...changes };
  await writeStore(store);
  return store.appointments[index];
}

async function getCatalog() {
  const { doctors, patients } = await readStore();
  return { doctors, patients };
}

async function reset() {
  const seed = require('../data/store.json');
  await writeStore(JSON.parse(JSON.stringify(seed)));
}

module.exports = { list, findById, create, update, getCatalog, reset, readStore };
