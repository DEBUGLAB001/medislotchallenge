const repository = require('../repositories/appointmentRepository');
const availability = require('../services/availabilityService');

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

async function catalog(req, res, next) {
  try { res.json(await repository.getCatalog()); } catch (error) { next(error); }
}

async function list(req, res, next) {
  try {
    const result = await repository.list({ ...req.query, patientId: req.query.patientId || (req.user.role === 'patient' ? req.user.id : undefined) });
    res.json(result);
  } catch (error) { next(error); }
}

async function slots(req, res, next) {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return sendError(res, 400, 'VALIDATION_ERROR', 'doctorId and date are required.');
    res.json({ doctorId, date, slots: await availability.getAvailableSlots(doctorId, date) });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const { doctorId, date, startTime, duration = 30, reason = '' } = req.body;
    if (!doctorId || !date || !startTime) return sendError(res, 400, 'VALIDATION_ERROR', 'doctorId, date and startTime are required.');
    const catalogData = await repository.getCatalog();
    if (!catalogData.doctors.some((doctor) => doctor.id === doctorId)) return sendError(res, 404, 'DOCTOR_NOT_FOUND', 'Doctor not found.');
    if (!(await availability.isAvailable(doctorId, date, startTime, duration))) return sendError(res, 409, 'SLOT_UNAVAILABLE', 'That time is no longer available.');
    // BUG 3: the response is sent before the database write has completed.
    const pendingWrite = repository.create({ doctorId, patientId: req.user.id, date, startTime, endTime: `${startTime}`, duration: Number(duration), reason });
    res.status(201).json({ item: { doctorId, patientId: req.user.id, date, startTime, status: 'confirmed' }, message: 'Appointment booked.' });
    pendingWrite.catch((error) => console.error('Appointment save failed after response:', error.message));
  } catch (error) { next(error); }
}

async function cancel(req, res, next) {
  try {
    const existing = await repository.findById(req.params.id);
    if (!existing) return sendError(res, 404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found.');
    if (req.user.role === 'patient' && existing.patientId !== req.user.id) return sendError(res, 403, 'FORBIDDEN', 'You can only cancel your own appointments.');
    if (existing.status === 'cancelled') return res.json({ item: existing, message: 'Appointment is already cancelled.' });
    // BUG 3: acknowledge cancellation before the repository has persisted it.
    const pendingUpdate = repository.update(existing.id, { status: 'cancelled' });
    res.json({ item: { ...existing, status: 'cancelled' }, message: 'Appointment cancelled.' });
    pendingUpdate.catch((error) => console.error('Cancellation save failed after response:', error.message));
  } catch (error) { next(error); }
}

async function reschedule(req, res, next) {
  try {
    const existing = await repository.findById(req.params.id);
    if (!existing) return sendError(res, 404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found.');
    const { date, startTime } = req.body;
    if (!date || !startTime) return sendError(res, 400, 'VALIDATION_ERROR', 'date and startTime are required.');
    if (!(await availability.isAvailable(existing.doctorId, date, startTime, 30, existing.id))) return sendError(res, 409, 'SLOT_UNAVAILABLE', 'That time is no longer available.');
    const item = await repository.update(existing.id, { date, startTime, endTime: startTime });
    res.json({ item, message: 'Appointment rescheduled.' });
  } catch (error) { next(error); }
}

module.exports = { catalog, list, slots, create, cancel, reschedule };
