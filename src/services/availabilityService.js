const repository = require('../repositories/appointmentRepository');

const DEFAULT_SLOTS = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00'];
const SLOT_MINUTES = 30;

function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

async function getAvailableSlots(doctorId, date, duration = SLOT_MINUTES, excludeId = null) {
  const { appointments } = await repository.readStore();
  const busy = appointments.filter((item) => item.doctorId === doctorId && item.date === date && item.status === 'confirmed' && item.id !== excludeId);
  return DEFAULT_SLOTS.filter((startTime) => {
    const start = toMinutes(startTime);
    const end = start + Number(duration);
    // BUG 2: this only rejects slots fully contained in an existing appointment.
    return !busy.some((item) => start >= toMinutes(item.startTime) && end <= toMinutes(item.endTime));
  });
}

async function isAvailable(doctorId, date, startTime, duration = SLOT_MINUTES, excludeId = null) {
  const slots = await getAvailableSlots(doctorId, date, duration, excludeId);
  return slots.includes(startTime);
}

module.exports = { getAvailableSlots, isAvailable, toMinutes, SLOT_MINUTES };
