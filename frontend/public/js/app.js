/**
 * BetterTravel Transit System — Client Application Controller
 * Handles Passenger Routing, Ticketing Lifecycle, and Administrative Management.
 */

const API_BASE = ''; // Relative path to Express backend

// ── Global State ────────────────────────────────────────────────────────────
let activeStationsCache = [];
let currentActiveCard   = null;
let adminToken          = sessionStorage.getItem('bt_admin_token') || '';

// ── Helper: Admin Fetch (auto-injects Bearer token) ─────────────────────────
async function adminFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    'Authorization': `Bearer ${adminToken}`
  };
  const res = await fetch(url, { ...options, headers });

  // If 401, the token is wrong or expired — show auth gate again
  if (res.status === 401) {
    const json = await res.json().catch(() => ({}));
    if (json.requiresAuth) {
      showAdminAuthGate('Session expired or invalid token. Please re-authenticate.');
    }
    throw new Error(json.error || 'Unauthorized');
  }

  return res;
}

// ── Application Initialization ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  verifySystemHealth();
  await loadPassengerStations();
  await loadFareClasses();
  await loadDisruptionsAdvisory();

  // Handle URL hash navigation
  if (window.location.hash === '#admin') {
    navigateView('admin');
  } else {
    navigateView('user');
  }
});

// ── View Navigation ─────────────────────────────────────────────────────────
function navigateView(viewName) {
  const userPortal = document.getElementById('portal-user');
  const adminPortal = document.getElementById('portal-admin');
  const btnUser = document.getElementById('tab-btn-user');
  const btnAdmin = document.getElementById('tab-btn-admin');

  if (viewName === 'admin') {
    userPortal.classList.remove('active');
    adminPortal.classList.add('active');
    btnUser.classList.remove('active');
    btnUser.setAttribute('aria-selected', 'false');
    btnAdmin.classList.add('active');
    btnAdmin.setAttribute('aria-selected', 'true');
    window.location.hash = '#admin';

    // Check auth before loading admin content
    if (adminToken) {
      showAdminContent();
    } else {
      showAdminAuthGate('');
    }
  } else {
    adminPortal.classList.remove('active');
    userPortal.classList.add('active');
    btnAdmin.classList.remove('active');
    btnAdmin.setAttribute('aria-selected', 'false');
    btnUser.classList.add('active');
    btnUser.setAttribute('aria-selected', 'true');
    window.location.hash = '';
  }
}

// ── Admin Auth Gate ──────────────────────────────────────────────────────────
function showAdminAuthGate(errorMsg) {
  document.getElementById('admin-auth-gate').classList.remove('is-hidden');
  document.getElementById('admin-content-area').classList.add('is-hidden');
  const errEl = document.getElementById('auth-error-msg');
  if (errorMsg) {
    errEl.textContent = errorMsg;
    errEl.classList.remove('is-hidden');
  } else {
    errEl.classList.add('is-hidden');
  }
}

function showAdminContent() {
  document.getElementById('admin-auth-gate').classList.add('is-hidden');
  document.getElementById('admin-content-area').classList.remove('is-hidden');
  // Load default admin section data
  fetchAdminStationsTable();
  fetchAdminSegmentsDropdown();
}

async function submitAdminToken() {
  const input = document.getElementById('admin-token-input');
  const token = input.value.trim();
  if (!token) {
    document.getElementById('auth-error-msg').textContent = 'Please enter a token.';
    document.getElementById('auth-error-msg').classList.remove('is-hidden');
    return;
  }

  // Test token by hitting a protected endpoint
  adminToken = token;
  try {
    const res = await adminFetch(`${API_BASE}/api/admin/stations`);
    if (!res.ok) throw new Error('Invalid token');
    const json = await res.json();
    if (!json.success) throw new Error('Invalid token');

    // Token is valid — persist for this session and show content
    sessionStorage.setItem('bt_admin_token', token);
    input.value = '';
    showAdminContent();
    triggerToast('Admin access granted.');
  } catch (err) {
    adminToken = '';
    sessionStorage.removeItem('bt_admin_token');
    document.getElementById('auth-error-msg').textContent = `Access denied: ${err.message}`;
    document.getElementById('auth-error-msg').classList.remove('is-hidden');
  }
}

// Allow pressing Enter in token field
document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('admin-token-input');
  if (tokenInput) {
    tokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdminToken();
    });
  }
});

// ── Admin Sub-section Switching ─────────────────────────────────────────────
function switchAdminSection(sectionName) {
  const sections = ['stations', 'incidents', 'segments', 'transfers', 'topup'];

  sections.forEach(sec => {
    const el = document.getElementById(`admin-sec-${sec}`);
    if (el) {
      if (sec === sectionName) {
        el.classList.remove('is-hidden');
        el.classList.add('active');
      } else {
        el.classList.remove('active');
        el.classList.add('is-hidden');
      }
    }
  });

  // Update pills
  const pills = document.querySelectorAll('.subnav-pill');
  pills.forEach((pill, idx) => {
    if (sections[idx] === sectionName) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // Trigger data fetch for selected section
  if (sectionName === 'stations')  fetchAdminStationsTable();
  if (sectionName === 'incidents') { fetchAdminIncidentsTable(); fetchAdminSegmentsDropdown(); }
  if (sectionName === 'segments')  fetchAdminSegmentsTable();
  if (sectionName === 'transfers') { fetchAdminTransfersTable(); populateTransferStationDropdowns(); }
}

// ── System Health ───────────────────────────────────────────────────────────
async function verifySystemHealth() {
  const dot = document.getElementById('system-status-dot');
  const label = document.getElementById('system-status-text');
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      dot.className = 'status-dot';
      label.textContent = 'System Online';
    } else {
      dot.className = 'status-dot offline';
      label.textContent = 'Server Degraded';
    }
  } catch {
    dot.className = 'status-dot offline';
    label.textContent = 'Disconnected';
  }
}

// ── Notifications ───────────────────────────────────────────────────────────
function triggerToast(message, type = 'success') {
  const toast = document.getElementById('notification-toast');
  toast.textContent = message;
  toast.className = `toast-card ${type}`;
  toast.classList.remove('is-hidden');
  setTimeout(() => toast.classList.add('is-hidden'), 4000);
}

// ============================================================================
// PASSENGER PORTAL LOGIC
// ============================================================================

async function loadPassengerStations() {
  try {
    const res  = await fetch(`${API_BASE}/api/user/stations`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    activeStationsCache = json.data;
    populateStationDropdowns();
  } catch (err) {
    triggerToast(`Failed to load stations: ${err.message}`, 'error');
  }
}

function populateStationDropdowns() {
  const selectElements = [
    document.getElementById('sel-origin'),
    document.getElementById('sel-dest'),
    document.getElementById('tap-station-selector'),
    document.getElementById('inc-station')
  ];

  selectElements.forEach(select => {
    if (!select) return;
    const isIncStation = select.id === 'inc-station';
    select.innerHTML = isIncStation
      ? '<option value="">None (Track or General)</option>'
      : '<option value="">Select station...</option>';

    activeStationsCache.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.STATIONID;
      const statusSuffix = st.STATIONSTATUS !== 'Normal' ? ` [${st.STATIONSTATUS}]` : '';
      opt.textContent = `${st.STATIONNAME}${statusSuffix}`;
      select.appendChild(opt);
    });
  });

  // Set intuitive default route: Central Hub (101) -> Airport Terminal 1 (108)
  const selOrigin = document.getElementById('sel-origin');
  const selDest   = document.getElementById('sel-dest');
  if (selOrigin && !selOrigin.value && activeStationsCache.some(s => s.STATIONID === 101)) {
    selOrigin.value = '101';
  }
  if (selDest && !selDest.value && activeStationsCache.some(s => s.STATIONID === 108)) {
    selDest.value = '108';
  }
}

async function loadFareClasses() {
  try {
    const res  = await fetch(`${API_BASE}/api/user/fare-classes`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const select = document.getElementById('sel-fareclass');
    select.innerHTML = '';
    json.data.forEach(fc => {
      const opt = document.createElement('option');
      opt.value = fc.FARECLASSID;
      opt.textContent = `${fc.NAME}${fc.DISCOUNTPERCENTAGE > 0 ? ` (${fc.DISCOUNTPERCENTAGE}% Concession)` : ''}`;
      select.appendChild(opt);
    });
  } catch {
    triggerToast('Could not load fare categories.', 'error');
  }
}

async function loadDisruptionsAdvisory() {
  try {
    const res  = await fetch(`${API_BASE}/api/user/disruptions`);
    const json = await res.json();
    const bar  = document.getElementById('service-advisory-bar');
    const msg  = document.getElementById('service-advisory-message');

    if (json.success && json.count > 0) {
      const summary = json.data
        .map(d => `[${d.SEVERITY.toUpperCase()}] ${d.TITLE} (${d.IMPACTDETAILS})`)
        .join(' — ');
      msg.textContent = summary;
      bar.classList.remove('is-hidden');
    } else {
      bar.classList.add('is-hidden');
    }
  } catch (_) {
    // Non-blocking
  }
}

function swapSelectedStations() {
  const origin = document.getElementById('sel-origin');
  const dest   = document.getElementById('sel-dest');
  const temp   = origin.value;
  origin.value = dest.value;
  dest.value   = temp;
}

// ── Multi-Modal Route Search ────────────────────────────────────────────────
async function searchTransitRoutes() {
  const origin      = document.getElementById('sel-origin').value;
  const dest        = document.getElementById('sel-dest').value;
  const fareClass   = document.getElementById('sel-fareclass').value || 1;
  const maxTransfers = document.getElementById('sel-transfers').value || 3;
  const container   = document.getElementById('route-results-container');
  const list        = document.getElementById('route-cards-list');
  const countLabel  = document.getElementById('results-count-label');

  if (!origin || !dest) {
    triggerToast('Please select both Origin and Destination stations.', 'error');
    return;
  }
  if (origin === dest) {
    triggerToast('Origin and Destination must be different.', 'error');
    return;
  }

  container.classList.remove('is-hidden');
  list.innerHTML = '<p class="empty-state-text">Querying transit network topology and live conditions...</p>';

  try {
    const url = `${API_BASE}/api/user/routes?origin=${origin}&destination=${dest}&fareClass=${fareClass}&maxTransfers=${maxTransfers}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    if (!json.routes || json.routes.length === 0) {
      countLabel.textContent = '0 Routes Found';
      const hasActiveAlerts = !document.getElementById('service-advisory-bar').classList.contains('is-hidden');
      if (hasActiveAlerts) {
        list.innerHTML = `
          <div class="empty-state-text">
            <p style="color:var(--color-warning);font-weight:600;margin-bottom:6px;">Line Unavailable Due to Active Disruption</p>
            <p>An active incident is currently affecting segments or stations on this corridor. Check the Service Alert banner above or resolve the incident in the Admin Console.</p>
          </div>`;
      } else {
        list.innerHTML = `
          <div class="empty-state-text">
            <p style="font-weight:600;margin-bottom:6px;">No Continuous Transit Path Found</p>
            <p>The selected stations do not currently share a connected transit line or walking transfer. Try selecting an interchange station (such as Central Hub, Tech Park, or Harbor View).</p>
          </div>`;
      }
      return;
    }

    countLabel.textContent = `${json.routes.length} Route Option${json.routes.length > 1 ? 's' : ''} Identified`;
    list.innerHTML = '';
    json.routes.forEach((route, idx) => list.appendChild(renderRouteCard(route, idx)));
  } catch (err) {
    list.innerHTML = `<p class="empty-state-text" style="color: var(--color-danger)">Routing error: ${err.message}</p>`;
  }
}

function renderRouteCard(route, index) {
  const card   = document.createElement('div');
  const isBest = index === 0;
  card.className = `route-card ${isBest ? 'is-best' : ''}`;

  const modes = (route.MODESUSED || '')
    .split(',')
    .map(m => `<span class="mode-tag ${m.trim().toLowerCase()}">${m.trim()}</span>`)
    .join('');

  const statusBadge = route.HASDELAYS
    ? `<span class="badge badge-delayed">+${route.TOTALDELAYMINUTES}m Delay</span>`
    : (isBest ? `<span class="badge badge-optimal">Recommended</span>` : '');

  card.innerHTML = `
    <div class="route-card-header">
      <span class="route-option-tag">Option ${route.PATHRANK}</span>
      ${statusBadge}
    </div>
    <div class="route-path-visual">${route.STATIONPATH || 'Direct Connection'}</div>
    <div class="route-corridor">Via: ${route.ROUTEPATH || 'Pedestrian Link'}</div>
    <div class="route-modes-strip">${modes}</div>
    <div class="route-metrics-bar">
      <div class="metric-item">
        <span class="metric-val">${route.TOTALMINUTES} min</span>
        <span class="metric-lbl">Total Time</span>
      </div>
      <div class="metric-item">
        <span class="metric-val">${(route.TOTALDISTANCEKM || 0).toFixed(1)} km</span>
        <span class="metric-lbl">Distance</span>
      </div>
      <div class="metric-item">
        <span class="metric-val">${route.TRANSFERCOUNT}</span>
        <span class="metric-lbl">Transfers</span>
      </div>
      <div class="metric-item">
        <span class="metric-val">$${(route.DISCOUNTEDFARE || 0).toFixed(2)}</span>
        <span class="metric-lbl">Net Fare</span>
      </div>
    </div>
    ${route.HASDELAYS ? `<div class="delay-notice">Active service delay detected on this corridor (+${route.TOTALDELAYMINUTES} min).</div>` : ''}
  `;
  return card;
}

// ── SmartCard & Gate Terminal ───────────────────────────────────────────────
async function lookupSmartCard() {
  const input   = document.getElementById('input-card-number');
  const cardNum = input.value.trim();
  if (!cardNum) {
    triggerToast('Please provide a SmartCard number.', 'error');
    return;
  }
  try {
    const res  = await fetch(`${API_BASE}/api/user/card/${encodeURIComponent(cardNum)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentActiveCard = cardNum;
    const card = json.card;

    const display = document.getElementById('card-wallet-display');
    display.classList.remove('is-hidden');

    document.getElementById('cardholder-name').textContent    = card.PASSENGERDISPLAYNAME;
    document.getElementById('cardholder-balance').textContent = `$${parseFloat(card.BALANCE).toFixed(2)}`;
    document.getElementById('card-status-pill').textContent   = card.CARDISACTIVE ? 'Active' : 'Inactive';
    document.getElementById('cardholder-details').textContent =
      `${card.FARECLASSNAME} (${card.DISCOUNTPERCENTAGE > 0 ? `${card.DISCOUNTPERCENTAGE}% Concession` : 'Standard'}) — Expires ${card.EXPIRATIONDATE}`;

    loadPassengerHistory(cardNum);
  } catch (err) {
    triggerToast(`Card lookup failed: ${err.message}`, 'error');
  }
}

async function executeTapIn() {
  const stationId = document.getElementById('tap-station-selector').value;
  if (!currentActiveCard || !stationId) {
    triggerToast('Select a station and ensure a card is loaded.', 'error');
    return;
  }
  try {
    const res  = await fetch(`${API_BASE}/api/user/tap-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber: currentActiveCard, stationId })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    triggerToast(`Tap-in validated for ${json.passengerName}. Gate open.`);
    lookupSmartCard();
  } catch (err) {
    triggerToast(`Tap-in rejected: ${err.message}`, 'error');
  }
}

async function executeTapOut() {
  const stationId = document.getElementById('tap-station-selector').value;
  if (!currentActiveCard || !stationId) {
    triggerToast('Select destination station and ensure card is active.', 'error');
    return;
  }
  try {
    const res  = await fetch(`${API_BASE}/api/user/tap-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber: currentActiveCard, stationId })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    triggerToast(`Journey concluded. Fare deducted: $${json.fareDeducted.toFixed(2)}. Remaining: $${json.newBalance.toFixed(2)}.`);
    lookupSmartCard();
  } catch (err) {
    triggerToast(`Tap-out rejected: ${err.message}`, 'error');
  }
}

async function loadPassengerHistory(cardNum) {
  try {
    const res  = await fetch(`${API_BASE}/api/user/history/${encodeURIComponent(cardNum)}`);
    const json = await res.json();
    const container = document.getElementById('passenger-history-list');

    if (!json.success || !json.history || json.history.length === 0) {
      container.innerHTML = '<p class="empty-state-text">No recorded journey history for this card.</p>';
      return;
    }

    container.innerHTML = json.history.map(item => `
      <div class="history-card ${item.STATUS === 'Completed' ? 'completed' : 'inprogress'}">
        <div class="history-endpoints">${item.ORIGINSTATION} to ${item.DESTINATIONSTATION || 'In Transit'}</div>
        <div class="history-sub">
          ${item.TAPINTIMEFORMATTED} — ${item.STATUS} — ${item.FAREDEDUCTED > 0 ? `$${parseFloat(item.FAREDEDUCTED).toFixed(2)} charged` : 'Active Leg'}
        </div>
      </div>
    `).join('');
  } catch (_) {
    // Non-blocking
  }
}

// ============================================================================
// ADMIN CONSOLE LOGIC
// ============================================================================

// ── Station Registration ────────────────────────────────────────────────────
async function handleCreateStation(event) {
  event.preventDefault();
  const feedback = document.getElementById('add-station-feedback');
  feedback.classList.add('is-hidden');

  const payload = {
    name:      document.getElementById('new-stat-name').value.trim(),
    city:      document.getElementById('new-stat-city').value.trim(),
    address:   document.getElementById('new-stat-address').value.trim(),
    latitude:  parseFloat(document.getElementById('new-stat-lat').value),
    longitude: parseFloat(document.getElementById('new-stat-lng').value)
  };

  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/stations`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    feedback.textContent = `Station "${payload.name}" committed to Oracle (Assigned ID: ${json.stationId}).`;
    feedback.className   = 'feedback-banner success';
    feedback.classList.remove('is-hidden');
    triggerToast(`Station #${json.stationId} registered successfully.`);

    document.getElementById('new-stat-name').value    = '';
    document.getElementById('new-stat-address').value = '';

    fetchAdminStationsTable();
    loadPassengerStations();
    populateTransferStationDropdowns(); // keep transfer dropdowns fresh
  } catch (err) {
    feedback.textContent = `Error: ${err.message}`;
    feedback.className   = 'feedback-banner error';
    feedback.classList.remove('is-hidden');
  }
}

async function fetchAdminStationsTable() {
  const tbody = document.getElementById('tbody-admin-stations');
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Querying STATION table...</td></tr>';
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/stations`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No stations found in database.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(s => `
      <tr>
        <td><strong>#${s.STATIONID}</strong></td>
        <td>${s.NAME}</td>
        <td>${s.CITY}</td>
        <td>${s.LATITUDE.toFixed(4)}, ${s.LONGITUDE.toFixed(4)}</td>
        <td>${s.ADDRESS || '—'}</td>
        <td>
          <span class="badge-status ${s.ISACTIVE ? 'status-active' : 'status-resolved'}">
            ${s.ISACTIVE ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm"
            onclick="toggleStationAction(${s.STATIONID}, ${s.ISACTIVE})">
            ${s.ISACTIVE ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:var(--color-danger)">Failed to load stations: ${err.message}</td></tr>`;
  }
}

async function toggleStationAction(stationId, currentIsActive) {
  const newState = currentIsActive ? 0 : 1;
  const label    = newState ? 'activate' : 'deactivate';
  if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} station #${stationId}?`)) return;
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/stations/${stationId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: newState })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    triggerToast(json.message);
    fetchAdminStationsTable();
    loadPassengerStations();
  } catch (err) {
    triggerToast(`Toggle failed: ${err.message}`, 'error');
  }
}

// ── Disruption / Incident Lifecycle ─────────────────────────────────────────
async function handleReportIncident(event) {
  event.preventDefault();
  const feedback = document.getElementById('incident-action-feedback');
  feedback.classList.add('is-hidden');

  const payload = {
    title:        document.getElementById('inc-title').value.trim(),
    severity:     document.getElementById('inc-severity').value,
    description:  document.getElementById('inc-desc').value.trim(),
    segmentId:    document.getElementById('inc-segment').value || null,
    stationId:    document.getElementById('inc-station').value || null,
    statusType:   document.getElementById('inc-statustype').value,
    delayMinutes: parseInt(document.getElementById('inc-delay').value, 10) || 0
  };

  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/incidents`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    feedback.textContent = `Incident #${json.incidentId} published. Network route penalization applied.`;
    feedback.className   = 'feedback-banner success';
    feedback.classList.remove('is-hidden');
    triggerToast(`Incident #${json.incidentId} broadcasted.`);

    document.getElementById('inc-title').value = '';
    document.getElementById('inc-desc').value  = '';

    fetchAdminIncidentsTable();
    loadDisruptionsAdvisory();
  } catch (err) {
    feedback.textContent = `Disruption broadcast error: ${err.message}`;
    feedback.className   = 'feedback-banner error';
    feedback.classList.remove('is-hidden');
  }
}

async function fetchAdminIncidentsTable() {
  const tbody = document.getElementById('tbody-admin-incidents');
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Querying INCIDENT table...</td></tr>';
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/incidents`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No incidents on record.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(inc => {
      const isAct   = inc.STATUS === 'Active';
      const sevClass = `status-${inc.SEVERITY.toLowerCase()}`;
      return `
        <tr>
          <td><strong>#${inc.INCIDENTID}</strong></td>
          <td>${inc.TITLE}</td>
          <td><span class="badge-status ${sevClass}">${inc.SEVERITY}</span></td>
          <td>${inc.STARTTIME}</td>
          <td>${inc.ENDTIME || 'In Effect'}</td>
          <td><span class="badge-status ${isAct ? 'status-active' : 'status-resolved'}">${inc.STATUS}</span></td>
          <td>
            ${isAct
              ? `<button type="button" class="btn btn-secondary btn-sm" onclick="resolveIncidentAction(${inc.INCIDENTID})">Resolve</button>`
              : '<span style="color:var(--color-text-muted);font-size:12px;">Archived</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:var(--color-danger)">Failed to load incidents: ${err.message}</td></tr>`;
  }
}

async function resolveIncidentAction(incidentId) {
  if (!confirm(`Resolve Incident #${incidentId} and restore normal transit operation?`)) return;
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/incidents/${incidentId}/resolve`, { method: 'PATCH' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    triggerToast(`Incident #${incidentId} resolved. Normal service restored.`);
    fetchAdminIncidentsTable();
    loadDisruptionsAdvisory();
    loadPassengerStations();
  } catch (err) {
    triggerToast(`Resolution failed: ${err.message}`, 'error');
  }
}

// ── Network Topology (Segments) ─────────────────────────────────────────────
async function fetchAdminSegmentsDropdown() {
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/segments`);
    const json = await res.json();
    if (!json.success) return;

    const select = document.getElementById('inc-segment');
    select.innerHTML = '<option value="">None (Station or General)</option>';
    json.data.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.SEGMENTID;
      opt.textContent = `[${s.MODE}] ${s.ROUTENAME}: ${s.FROMSTATION} to ${s.TOSTATION} (${s.DISTANCE} km)`;
      select.appendChild(opt);
    });
  } catch (_) {
    // Non-blocking
  }
}

async function fetchAdminSegmentsTable() {
  const tbody = document.getElementById('tbody-admin-segments');
  tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Querying SEGMENT and ROUTE entities...</td></tr>';
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/segments`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No segments found.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(s => `
      <tr>
        <td><strong>#${s.SEGMENTID}</strong></td>
        <td>${s.ROUTENAME}</td>
        <td><span class="mode-tag ${s.MODE.toLowerCase()}">${s.MODE}</span></td>
        <td>${s.FROMSTATION}</td>
        <td>${s.TOSTATION}</td>
        <td>${s.DISTANCE} km</td>
        <td>${s.SCHEDULEDTIME} min</td>
        <td><span class="badge-status ${s.ISACTIVE ? 'status-active' : 'status-resolved'}">${s.ISACTIVE ? 'Yes' : 'No'}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading" style="color:var(--color-danger)">Failed to load segments: ${err.message}</td></tr>`;
  }
}

// ── Walking Transfer Management ─────────────────────────────────────────────
async function populateTransferStationDropdowns() {
  try {
    // Use full station list from admin API (not filtered view)
    const res  = await adminFetch(`${API_BASE}/api/admin/stations`);
    const json = await res.json();
    if (!json.success) return;

    const selects = ['xfer-from-station', 'xfer-to-station'];
    selects.forEach(selId => {
      const sel = document.getElementById(selId);
      if (!sel) return;
      sel.innerHTML = '<option value="">Select station...</option>';
      json.data.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.STATIONID;
        opt.textContent = `#${s.STATIONID} — ${s.NAME} (${s.CITY})`;
        sel.appendChild(opt);
      });
    });
  } catch (_) {
    // Non-blocking
  }
}

async function handleCreateTransfer(event) {
  event.preventDefault();
  const feedback = document.getElementById('transfer-feedback');
  feedback.classList.add('is-hidden');

  const payload = {
    fromStationId:   document.getElementById('xfer-from-station').value,
    toStationId:     document.getElementById('xfer-to-station').value,
    walkingDistance: parseInt(document.getElementById('xfer-distance').value, 10),
    walkingTime:     parseInt(document.getElementById('xfer-time').value, 10)
  };

  if (!payload.fromStationId || !payload.toStationId) {
    triggerToast('Please select both From and To stations.', 'error');
    return;
  }
  if (payload.fromStationId === payload.toStationId) {
    triggerToast('From and To stations must be different.', 'error');
    return;
  }

  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/transfers`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    feedback.textContent = json.message;
    feedback.className   = 'feedback-banner success';
    feedback.classList.remove('is-hidden');
    triggerToast('Walking transfer registered. Stations are now reachable in routing.');

    // Reset form
    document.getElementById('xfer-from-station').value = '';
    document.getElementById('xfer-to-station').value   = '';
    document.getElementById('xfer-distance').value     = '';
    document.getElementById('xfer-time').value         = '';

    fetchAdminTransfersTable();
  } catch (err) {
    feedback.textContent = `Error: ${err.message}`;
    feedback.className   = 'feedback-banner error';
    feedback.classList.remove('is-hidden');
  }
}

async function fetchAdminTransfersTable() {
  const tbody = document.getElementById('tbody-admin-transfers');
  tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Querying STATION_PAIR_TRANSFER table...</td></tr>';
  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/transfers`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-loading">No walking transfer links defined yet.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(t => `
      <tr>
        <td><strong>#${t.TRANSFERID}</strong></td>
        <td>${t.FROMSTATION} <span style="color:var(--color-text-muted)">(#${t.FROMSTATIONID})</span></td>
        <td>${t.TOSTATION} <span style="color:var(--color-text-muted)">(#${t.TOSTATIONID})</span></td>
        <td>${t.WALKINGDISTANCE} m</td>
        <td>${t.WALKINGTIME} min</td>
        <td><span class="badge-status ${t.ISDIRECTCONNECTION ? 'status-active' : 'status-resolved'}">${t.ISDIRECTCONNECTION ? 'Direct' : 'Indirect'}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading" style="color:var(--color-danger)">Failed to load transfers: ${err.message}</td></tr>`;
  }
}

// ── Kiosk Wallet Top-Up ─────────────────────────────────────────────────────
async function handleWalletTopup(event) {
  event.preventDefault();
  const feedback = document.getElementById('topup-feedback');
  feedback.classList.add('is-hidden');

  const cardNum   = document.getElementById('topup-card-number').value.trim();
  const amount    = parseFloat(document.getElementById('topup-credit-amount').value);
  const reference = document.getElementById('topup-reference-code').value.trim() || 'KIOSK-TOPUP';

  if (!cardNum || !amount || amount <= 0) {
    triggerToast('Valid card number and positive credit amount are required.', 'error');
    return;
  }

  try {
    const res  = await adminFetch(`${API_BASE}/api/admin/topup`, {
      method: 'POST',
      body: JSON.stringify({ cardNumber: cardNum, amount, reference })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    feedback.textContent = `Card ${cardNum} credited with $${amount.toFixed(2)}. Updated balance: $${json.newBalance.toFixed(2)}.`;
    feedback.className   = 'feedback-banner success';
    feedback.classList.remove('is-hidden');
    triggerToast(`$${amount.toFixed(2)} credited to ${cardNum}.`);

    if (currentActiveCard === cardNum) lookupSmartCard();
  } catch (err) {
    feedback.textContent = `Credit operation failed: ${err.message}`;
    feedback.className   = 'feedback-banner error';
    feedback.classList.remove('is-hidden');
  }
}
