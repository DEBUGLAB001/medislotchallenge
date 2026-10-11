# MediSlot

## Description

MediSlot is a Node.js and Express clinic booking application for patients and care teams. It runs as a lightweight HTTP service with a browser interface, seeded doctors and patient accounts, a local JSON data store, available-slot search, appointment booking, cancellation, rescheduling, status filtering, and pagination.

## Repository Structure

```text
medislot-challenge-node/
├── challenge.json                    Isolated runtime, preview port, and test configuration
├── package.json                      Node dependencies and npm scripts
├── server.js                         Express startup, API mounting, static files, and error handling
├── json-reporter.js                  Quiet JSON-only Jest reporter
├── src/
│   ├── data/store.json               Seeded doctors, patients, and appointments
│   ├── middleware/auth.js            Bearer-token identities and role authorization
│   ├── routes/appointments.js        REST endpoint declarations and authentication middleware
│   ├── controllers/appointmentController.js
│   │                                  Catalog, schedule, slot, booking, cancellation, and rescheduling handlers
│   ├── services/availabilityService.js
│   │                                  Slot generation and appointment interval availability checks
│   └── repositories/appointmentRepository.js
│                                      JSON persistence, filtering, pagination, and write queue
├── public/
│   ├── index.html                     MediSlot booking and schedule page
│   ├── app.js                         Client-side API calls and DOM rendering
│   └── style.css                      Responsive visual styling and design tokens
├── tests/
│   └── appointments.test.js           Jest/Supertest behavioral challenge suites
└── README.md                          Candidate-facing application overview and debugging guide
```

## Bugs and Bug Locations

These are the five behavioral bug surfaces covered by the challenge. The named locations identify the owning implementation areas for debugging and review.

### 1. Appointment creation accepts invalid dates and times

- **Bug location:** `src/routes/appointments.js` and `src/controllers/appointmentController.js`, `POST /api/appointments`
- **How to observe it:** Send a booking request with a malformed date/time, a past date, an unsupported duration, or a time outside the available schedule.
- **Failure:** The route checks only that `doctorId`, `date`, and `startTime` exist, so malformed or otherwise invalid visits can reach availability and persistence.
- **Expected:** Validate the request format, future date, supported duration, and selectable clinic time, returning `400 VALIDATION_ERROR` for invalid input.

### 2. Partial interval overlaps are treated as available

- **Bug location:** `src/services/availabilityService.js`, `getAvailableSlots`
- **How to observe it:** Request slots for `doc-1` on `2026-10-13`. The seeded 11:15-11:45 appointment overlaps the offered 11:00-11:30 slot.
- **Failure:** Availability rejects only candidates fully contained inside a busy interval, so the partially overlapping 11:00 slot remains available.
- **Expected:** Treat intervals as conflicting whenever `candidateStart < existingEnd` and `candidateEnd > existingStart`, while ignoring cancelled appointments and an appointment being rescheduled.

### 3. Booking and cancellation acknowledge writes before completion

- **Bug location:** `src/controllers/appointmentController.js`, `create` and `cancel`
- **How to observe it:** Book a new appointment or cancel `apt-1001`, then immediately read the schedule or request the affected doctor's slots.
- **Failure:** The controller sends a success response while the repository's delayed JSON write is still pending, so the next request can observe stale state.
- **Expected:** Await `repository.create` and `repository.update` before responding, and return the durable record. A cancelled appointment should release its time slot immediately after success.

### 4. Doctor-only authorization is inverted

- **Bug location:** `src/middleware/auth.js`, `requireRole`
- **How to observe it:** Authenticate as `patient-jordan` and call `PATCH /api/appointments/apt-1002/reschedule`.
- **Failure:** The role comparison calls `next()` for the wrong role and returns `403` for the required role, inverting the access decision.
- **Expected:** Continue only when `req.user.role` matches the required role; reject patients with the standard `FORBIDDEN` error.

### 5. Appointment status filtering excludes the requested state

- **Bug location:** `src/repositories/appointmentRepository.js`, `list`
- **How to observe it:** Request `/api/appointments?status=cancelled` using an authenticated account.
- **Failure:** The repository uses `item.status !== status`, which removes cancelled rows and leaks confirmed rows into the cancelled result.
- **Expected:** Use equality filtering so the response contains only appointments with the requested status and accurate pagination totals.

## Expected Behaviour After Fixing All Bugs

- Invalid and past appointment requests are rejected consistently.
- Any overlapping confirmed appointment blocks the conflicting slot.
- Booking and cancellation responses reflect completed JSON persistence.
- Only authenticated doctors can reschedule appointments.
- Confirmed and cancelled filters return the correct rows.
- Cancelling a visit immediately makes its time available again.
- All automated tests in `npm test` pass with exit code `0`.
