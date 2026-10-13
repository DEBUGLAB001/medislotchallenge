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

These are the six failing behaviors covered by the challenge. The named locations identify the owning implementation areas for debugging and review.

### 1. Past appointment dates are accepted

- **Bug location:** `src/controllers/appointmentController.js`, `POST /api/appointments`
- **How to observe it:** As a patient, book `doc-2` for `2020-04-10` at `10:30`.
- **Failure:** The API accepts a booking date in the past.
- **Expected:** Return `400 VALIDATION_ERROR` for a past date.

### 2. Partially overlapping appointment intervals are accepted

- **Bug location:** `src/services/availabilityService.js`, `getAvailableSlots`
- **How to observe it:** Book `doc-1` on `2026-10-13` at `11:00`; a seeded visit runs from `11:15` to `11:45`.
- **Failure:** The API accepts the 30-minute booking despite the partial overlap.
- **Expected:** Reject any candidate interval intersecting a confirmed appointment with `409 SLOT_UNAVAILABLE`.

### 3. Booking response omits the persisted appointment record

- **Bug location:** `src/controllers/appointmentController.js`, `create`
- **How to observe it:** Book `doc-2` on `2026-10-16` at `10:30` as a patient.
- **Failure:** The `201` response's `item` has no persisted appointment ID.
- **Expected:** Await `repository.create` and return its persisted record, including the generated ID.

### 4. Patient accounts can reschedule doctor-only appointments

- **Bug location:** `src/middleware/auth.js`, `requireRole`
- **How to observe it:** Authenticate as `patient-jordan` and call `PATCH /api/appointments/apt-1002/reschedule`.
- **Failure:** The patient request is allowed instead of being rejected.
- **Expected:** Continue only when `req.user.role` matches the required role; otherwise return `403 FORBIDDEN`.

### 5. Appointment status filtering returns the wrong state

- **Bug location:** `src/repositories/appointmentRepository.js`, `list`
- **How to observe it:** Request `/api/appointments?status=cancelled` as a patient.
- **Failure:** The response includes non-cancelled appointments or excludes cancelled ones.
- **Expected:** Return only appointments whose status equals the requested status.

### 6. Cancellation does not immediately release its slot

- **Bug location:** `src/controllers/appointmentController.js`, `cancel`
- **How to observe it:** As `patient-sam`, cancel `apt-1001`, then immediately request `doc-1`'s slots for `2026-10-13`.
- **Failure:** The `09:00` slot is still unavailable after the successful cancellation response.
- **Expected:** Await the cancellation write before responding so the slot is immediately available again.

## Expected Behaviour After Fixing All Bugs

- Past appointment dates are rejected consistently.
- Partially overlapping confirmed appointments block the conflicting booking.
- Booking responses include the persisted appointment record and ID.
- Patients cannot reschedule through the doctor-only route.
- Status filters return only rows matching the requested status.
- Cancelling a visit immediately makes its time available again.
- All automated tests in `npm test` pass with exit code `0`.
