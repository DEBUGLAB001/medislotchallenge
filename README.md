# MediSlot - Clinic Booking System
MediSlot is an interactive clinic appointment booking system for patients and care teams. It lets users browse local specialists, search available appointment slots, book and cancel visits, reschedule appointments, filter schedules, and paginate through seeded clinic records without requiring an external database.

---

## 1. Application Overview
### Core Functionality

- **Specialist and Slot Discovery**: Browse three seeded doctors and retrieve available appointment times for a selected date.
- **Appointment Booking**: Book a confirmed visit with a doctor, patient, date, time, duration, and reason.
- **Schedule Management**: View appointments with confirmed/cancelled status filters and paginated navigation.
- **Appointment Actions**: Cancel appointments and reschedule visits through authenticated REST endpoints.
- **Account Switching**: Switch between seeded patient and doctor identities from the browser interface.
- **Offline Persistence**: Store clinic catalog and appointment data in `src/data/store.json` through a queued repository writer.

### Technology Stack

- **Runtime**: Node.js 22
- **Framework / Server**: Express 5
- **Frontend**: Vanilla HTML, JavaScript, and CSS with a responsive clinic booking interface
- **Testing**: Jest and Supertest
- **Data**: Local JSON store (`src/data/store.json`)
- **Commands**: `npm install`, `node --watch server.js`, and `npm test`

---

## 2. Debugging Challenge
The clinic has reported six appointment workflow bugs. Your goal is to investigate the request flow from the route through the controller, service, middleware, and repository, then implement the necessary fixes so that all automated tests pass.

### Reported Issues & Tasks
#### Issue 1: Past Appointment Dates Are Accepted

- **Reproduction**: Book `doc-2` for `2020-04-10` at `10:30` as a patient.
- **Failure**: The API accepts the appointment instead of rejecting a date in the past.
- **Expected**: Return `400 VALIDATION_ERROR` for a past appointment date.

#### Issue 2: Partially Overlapping Appointment Slots Are Available

- **Reproduction**: Book `doc-1` on `2026-10-13` at `11:00`; a seeded visit runs from `11:15` to `11:45`.
- **Failure**: The API accepts the 30-minute booking even though it partially overlaps the seeded visit.
- **Expected**: Return `409 SLOT_UNAVAILABLE` whenever booking intervals overlap.

#### Issue 3: Booking Response Omits the Persisted Appointment Record

- **Reproduction**: Book `doc-2` on `2026-10-16` at `10:30` as a patient.
- **Failure**: The `201` response does not include the persisted appointment ID in `item`.
- **Expected**: Await the repository write and return its persisted appointment record, including its ID.

#### Issue 4: Patient Accounts Can Reach the Doctor-Only Reschedule Route

- **Reproduction**: As `patient-jordan`, call `PATCH /api/appointments/apt-1002/reschedule`.
- **Failure**: The patient request is allowed instead of being forbidden.
- **Expected**: Return `403 FORBIDDEN` unless the authenticated user's role matches the required doctor role.

#### Issue 5: Appointment Status Filters Return the Opposite Rows

- **Reproduction**: Request `/api/appointments?status=cancelled` as a patient.
- **Failure**: The response includes non-cancelled appointments or excludes cancelled ones.
- **Expected**: Return only appointments whose status equals the requested status.

#### Issue 6: Cancelling an Appointment Does Not Immediately Release Its Slot

- **Reproduction**: As `patient-sam`, cancel `apt-1001`, then request `doc-1`'s slots for `2026-10-13`.
- **Failure**: The `09:00` slot is still missing immediately after the successful cancellation response.
- **Expected**: Persist the cancellation before responding so the cancelled appointment no longer blocks its slot.

---

## 3. Expected Behavior After Fixing Bugs
After resolving the issues:

1. Past appointment dates return `400 VALIDATION_ERROR`.
2. Partially overlapping bookings return `409 SLOT_UNAVAILABLE`.
3. Booking responses include the persisted appointment record and ID.
4. Patients receive `403 FORBIDDEN` from the doctor-only reschedule route.
5. Status filters return only appointments matching the requested status.
6. A cancelled appointment's slot is available immediately after cancellation succeeds.
7. All six challenge tests pass with exit code `0` after the bugs are fixed.
