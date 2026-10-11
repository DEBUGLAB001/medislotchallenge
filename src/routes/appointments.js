const express = require('express');
const controller = require('../controllers/appointmentController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/catalog', controller.catalog);
router.get('/appointments/slots', controller.slots);
router.get('/appointments', authenticate, controller.list);
// BUG 1: this route does not validate appointment date/time format or whether the visit is in the future.
router.post('/appointments', authenticate, controller.create);
router.patch('/appointments/:id/cancel', authenticate, controller.cancel);
router.patch('/appointments/:id/reschedule', authenticate, requireRole('doctor'), controller.reschedule);

module.exports = router;
