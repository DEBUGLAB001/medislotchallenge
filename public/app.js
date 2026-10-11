const apiUrl = (route) => new URL(`api/${route}`, document.baseURI).toString();
const state = { token: localStorage.getItem('medislot-token') || 'patient-jordan', page: 1, limit: 6, selectedTime: null, doctors: [], appointments: [] };
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const initials = (name) => name.replace(/^Dr\.\s*/, '').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
function toast(message, error = false) { const el = $('#toast'); el.textContent = message; el.style.background = error ? '#8e4f48' : '#233532'; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3000); }
async function api(route, options = {}) {
  const response = await fetch(apiUrl(route), { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}`, ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed.');
  return data;
}
function setAccount(token) { state.token = token; localStorage.setItem('medislot-token', token); const accounts = { 'patient-jordan': ['Jordan Lee', 'JL'], 'patient-sam': ['Sam Rivera', 'SR'], 'doctor-maya': ['Dr. Maya Chen', 'MC'] }; $('#profile-name').textContent = accounts[token][0]; $('#profile-avatar').textContent = accounts[token][1]; $('#account-dialog').close(); state.page = 1; loadAppointments(); toast(`Viewing as ${accounts[token][0]}`); }
async function loadCatalog() {
  const data = await api('catalog'); state.doctors = data.doctors;
  $('#doctor-select').innerHTML = '<option value="">Choose a specialist</option>' + data.doctors.map((doctor) => `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.name)} · ${escapeHtml(doctor.specialty)}</option>`).join('');
}
async function loadSlots() {
  const doctorId = $('#doctor-select').value; const date = $('#date-input').value;
  if (!doctorId || !date) { toast('Choose a specialist and date first.', true); return; }
  state.selectedTime = null; $('#selected-row').hidden = true; $('#slot-panel').innerHTML = '<span class="slot-prompt">Checking the schedule…</span>';
  try {
    const { slots } = await api(`appointments/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`);
    if (!slots.length) { $('#slot-panel').innerHTML = '<span class="slot-prompt">No open times on this day. Try another date.</span>'; return; }
    $('#slot-panel').innerHTML = `<span class="slot-title">AVAILABLE TIMES</span>${slots.map((time) => `<button class="slot-chip" type="button" data-time="${escapeHtml(time)}">${escapeHtml(time)}</button>`).join('')}`;
    document.querySelectorAll('.slot-chip').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.slot-chip').forEach((slot) => slot.classList.remove('active')); button.classList.add('active'); state.selectedTime = button.dataset.time; $('#selection-copy').textContent = `${$('#doctor-select').selectedOptions[0].textContent.split(' · ')[0]} · ${date} at ${state.selectedTime}`; $('#selected-row').hidden = false; }));
  } catch (error) { $('#slot-panel').innerHTML = `<span class="slot-prompt">${escapeHtml(error.message)}</span>`; }
}
async function book() {
  if (!state.selectedTime) return toast('Choose an available time first.', true);
  try { await api('appointments', { method: 'POST', body: JSON.stringify({ doctorId: $('#doctor-select').value, date: $('#date-input').value, startTime: state.selectedTime, reason: $('#reason-select').value }) }); toast('Appointment confirmed.'); state.selectedTime = null; $('#selected-row').hidden = true; await loadAppointments(); await loadSlots(); }
  catch (error) { toast(error.message, true); await loadSlots(); }
}
function renderAppointments(data) {
  state.appointments = data.items; $('#appointment-count').textContent = data.total; $('#page-number').textContent = data.page; $('#page-copy').textContent = `Showing ${data.items.length ? (data.page - 1) * data.limit + 1 : 0}–${Math.min(data.page * data.limit, data.total)} of ${data.total} visits`;
  $('#prev-page').disabled = data.page <= 1; $('#next-page').disabled = data.page * data.limit >= data.total;
  const doctorById = Object.fromEntries(state.doctors.map((doctor) => [doctor.id, doctor]));
  if (!data.items.length) { $('#appointment-list').innerHTML = '<div class="empty-state">No appointments in this view. Choose a time above to plan your next visit.</div>'; return; }
  $('#appointment-list').innerHTML = data.items.map((item) => { const doctor = doctorById[item.doctorId] || { name: 'Clinic specialist', specialty: 'Care team' }; const date = new Date(`${item.date}T12:00:00`); const tone = item.doctorId === 'doc-2' ? 'terracotta' : item.doctorId === 'doc-3' ? 'lavender' : ''; const dateLabel = date.toLocaleDateString('en-US', { month: 'short' }); const end = item.endTime && item.endTime !== item.startTime ? item.endTime : `${String(Number(item.startTime.slice(0, 2)) + (item.startTime.slice(3) === '30' ? 1 : 0)).padStart(2, '0')}:${item.startTime.slice(3) === '30' ? '00' : '30'}`; return `<article class="appointment-row"><div class="date-tile"><b>${date.getDate()}</b><span>${dateLabel}</span></div><div class="doctor-info"><span class="doctor-avatar ${tone}">${initials(doctor.name)}</span><span><b>${escapeHtml(doctor.name)}</b><small>${escapeHtml(item.reason || doctor.specialty)}</small></span></div><div class="visit-time"><b>${escapeHtml(item.startTime)} – ${escapeHtml(end)}</b><br>${escapeHtml(doctor.specialty)}</div><div class="status-cell"><span class="status ${item.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(item.status)}</span>${item.status === 'confirmed' ? `<button class="row-action" data-cancel="${escapeHtml(item.id)}">Cancel</button>` : ''}</div></article>`; }).join('');
  document.querySelectorAll('[data-cancel]').forEach((button) => button.addEventListener('click', () => cancelAppointment(button.dataset.cancel)));
}
async function loadAppointments() {
  $('#appointment-list').innerHTML = '<div class="loading-row">Refreshing your schedule…</div>';
  try { const status = $('#status-filter').value; const query = new URLSearchParams({ page: state.page, limit: state.limit }); if (status) query.set('status', status); const data = await api(`appointments?${query}`); renderAppointments(data); }
  catch (error) { $('#appointment-list').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
}
async function cancelAppointment(id) { try { await api(`appointments/${encodeURIComponent(id)}/cancel`, { method: 'PATCH', body: '{}' }); toast('Appointment cancelled.'); await loadAppointments(); } catch (error) { toast(error.message, true); } }
document.addEventListener('DOMContentLoaded', async () => {
  const date = new Date(); date.setDate(date.getDate() + 1); $('#date-input').value = date.toISOString().slice(0, 10); $('#date-input').min = new Date().toISOString().slice(0, 10);
  $('#search-button').addEventListener('click', loadSlots); $('#confirm-button').addEventListener('click', book); $('#refresh-button').addEventListener('click', loadAppointments); $('#status-filter').addEventListener('change', () => { state.page = 1; loadAppointments(); });
  $('#prev-page').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadAppointments(); } }); $('#next-page').addEventListener('click', () => { state.page += 1; loadAppointments(); });
  $('#profile-avatar').addEventListener('click', () => $('#account-dialog').showModal()); document.querySelectorAll('[data-account]').forEach((button) => button.addEventListener('click', () => setAccount(button.dataset.account)));
  try { await loadCatalog(); await loadAppointments(); } catch (error) { toast(error.message, true); }
});
