const request = require('supertest');
const { createApp } = require('../server');
const repository = require('../src/repositories/appointmentRepository');

const app = createApp();
const patient = (token = 'patient-jordan') => ({ Authorization: `Bearer ${token}` });
const doctor = { Authorization: 'Bearer doctor-maya' };

beforeEach(async () => repository.reset());
afterEach(async () => new Promise((resolve) => setTimeout(resolve, 75)));

describe('MediSlot appointment workflow', () => {
  test('rejects appointment dates in the past', async () => {
    const response = await request(app).post('/api/appointments').set(patient()).send({ doctorId: 'doc-2', date: '2020-04-10', startTime: '10:30', reason: 'Consultation' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects a selectable slot that overlaps an existing visit', async () => {
    const response = await request(app).post('/api/appointments').set(patient()).send({ doctorId: 'doc-1', date: '2026-10-13', startTime: '11:00', reason: 'Consultation' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  test('waits until a new appointment has been saved before replying', async () => {
    const response = await request(app).post('/api/appointments').set(patient()).send({ doctorId: 'doc-2', date: '2026-10-16', startTime: '10:30', reason: 'Consultation' });
    expect(response.status).toBe(201);
    expect(response.body.item.id).toBeTruthy();
  });

  test('blocks patient access to the doctor-only reschedule route', async () => {
    const response = await request(app).patch('/api/appointments/apt-1002/reschedule').set(patient()).send({ date: '2026-10-16', startTime: '13:00' });
    expect(response.status).toBe(403);
  });

  test('returns only cancelled appointments for the cancelled filter', async () => {
    const response = await request(app).get('/api/appointments?status=cancelled').set(patient());
    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items.every((item) => item.status === 'cancelled')).toBe(true);
  });

  test('releases a cancelled appointment time for a new booking', async () => {
    const cancelled = await request(app).patch('/api/appointments/apt-1001/cancel').set(patient('patient-sam')).send({});
    expect(cancelled.status).toBe(200);
    const slots = await request(app).get('/api/appointments/slots?doctorId=doc-1&date=2026-10-13');
    expect(slots.body.slots).toContain('09:00');
  });

});
