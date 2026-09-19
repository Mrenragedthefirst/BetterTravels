/* ── BetterTravel Single-File Application JS ──────────────────────────────
   All DOM interaction, API calls, and view state management in one lean file.
   API base is relative — so the frontend talks to whatever host serves it.
─────────────────────────────────────────────────────────────────────────── */

const API = '';   // Same origin — Express serves both API and static files

// ── Global state ────────────────────────────────────────────────────────────
let stationsCache   = [];
let fareClassCache  = [];
let currentCard     = null;

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  checkHealth();
  await loadStations();
  await loadFareClasses();
  loadDisruptions();
  if (location.hash === '#admin') switchView('admin');
});

// ── Health ────────────────────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch(`${API}/api/health`);
    if (res.ok) {
      setStatus(true);
    } else {
      setStatus(false);
    }
  } catch {
    setStatus(false);
  }
}

function setStatus(online) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (online) {
    dot.className  = 'dot online';
    text.textContent = 'Connected';
  } else {
    dot.className  = 'dot offline';
    text.textContent = 'Offline';
  }
}

// ── View switching ─────────────────────────────────────────────────────────────
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.getElementById(`tab-${view}`).classList.add('active');
  location.hash = view === 'admin' ? '#admin' : '';
  if (view === 'admin') {
    loadAdminIncidents();
    loadAdminSegments();
  }
}

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

// ── Stations ─────────────────────────────────────────────────────────────────
async function loadStations() {
  try {
    const res  = await fetch(`${API}/api/user/stations`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    stationsCache = json.data;
    populateStationSelects();
  } catch (e) {
    showToast('Failed to load stations: ' + e.message, 'error');
  }
}

function populateStationSelects() {
  const selectors = ['#sel-origin', '#sel-dest', '#tap-station', '#inc-station'];
  selectors.forEach(id => {
    const el = document.querySelector(id);
    if (!el) return;
    const isStation = id === '#inc-station';
    el.innerHTML = isStation
      ? '<option value="">None</option>'
      : '<option value="">Select station…</option>';
    stationsCache.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.STATIONID;
      const status = s.STATIONSTATUS !== 'Normal' ? ` ⚠ ${s.STATIONSTATUS}` : '';
      opt.textContent = `${s.STATIONNAME}${status}`;
      el.appendChild(opt);
    });
  });
}

// ── Fare Classes ─────────────────────────────────────────────────────────────
async function loadFareClasses() {
  try {
    const res  = await fetch(`${API}/api/user/fare-classes`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    fareClassCache = json.data;
    const el = document.getElementById('sel-fareclass');
    el.innerHTML = '';
    json.data.forEach(fc => {
      const opt = document.createElement('option');
      opt.value = fc.FARECLASSID;
      opt.textContent = `${fc.NAME}${fc.DISCOUNTPERCENTAGE > 0 ? ` (${fc.DISCOUNTPERCENTAGE}% off)` : ''}`;
      el.appendChild(opt);
    });
  } catch (e) {
    showToast('Could not load fare classes.', 'error');
  }
}

// ── Disruption Banner ─────────────────────────────────────────────────────────
async function loadDisruptions() {
  try {
    const res  = await fetch(`${API}/api/user/disruptions`);
    const json = await res.json();
    if (!json.success || json.count === 0) return;
    const banner = document.getElementById('disruption-banner');
    const text   = document.getElementById('disruption-text');
    const alerts = json.data.map(d => `${d.SEVERITY}: ${d.TITLE} — ${d.IMPACTDETAILS}`).join('   |   ');
    text.textContent = `Service Alert: ${alerts}`;
    banner.classList.remove('hidden');
  } catch (_) {}
}

// ── Swap Stations ─────────────────────────────────────────────────────────────
function swapStations() {
  const a = document.getElementById('sel-origin');
  const b = document.getElementById('sel-dest');
  const tmp = a.value;
  a.value = b.value;
  b.value = tmp;
}

// ── Route Finder ──────────────────────────────────────────────────────────────
async function findRoutes() {
  const origin      = document.getElementById('sel-origin').value;
  const destination = document.getElementById('sel-dest').value;
  const fareClass   = document.getElementById('sel-fareclass').value;
  const transfers   = document.getElementById('sel-transfers').value;
  const result      = document.getElementById('routes-result');

  if (!origin || !destination) {
    showToast('Please select both an origin and destination station.', 'error');
    return;
  }
  if (origin === destination) {
    showToast('Origin and destination cannot be the same.', 'error');
    return;
  }

  result.innerHTML = '<p class="placeholder-text">Searching routes…</p>';
  result.classList.remove('hidden');

  try {
    const url = `${API}/api/user/routes?origin=${origin}&destination=${destination}&fareClass=${fareClass}&maxTransfers=${transfers}`;
    const res  = await fetch(url);
    const json = await res.json();

    if (!json.success) throw new Error(json.error);
    if (!json.routes || json.routes.length === 0) {
      result.innerHTML = '<p class="placeholder-text">No routes found. The line may be suspended due to an active incident.</p>';
      return;
    }

    result.innerHTML = '';
    json.routes.forEach((r, idx) => {
      result.appendChild(buildRouteCard(r, idx));
    });
  } catch (e) {
    result.innerHTML = `<p class="placeholder-text" style="color:var(--red)">Error: ${e.message}</p>`;
  }
}

function buildRouteCard(r, idx) {
  const div = document.createElement('div');
  div.className = `route-card ${idx === 0 ? 'best' : ''}`;

  const delayBadge = r.HASDELAYS
    ? `<span class="route-badge delayed">⚠ +${r.TOTALDELAYMINUTES}m delay</span>`
    : `<span class="route-badge">Fastest</span>`;

  const modes = (r.MODESUSED || '').split(',').map(m => {
    const mode = m.trim();
    const cls  = mode === 'Metro' ? 'mode-metro' : mode === 'Train' ? 'mode-train' : mode === 'Bus' ? 'mode-bus' : 'mode-walk';
    return `<span class="mode-pill ${cls}">${mode}</span>`;
  }).join('');

  div.innerHTML = `
    <div class="route-header">
      <span class="route-rank">Option ${r.PATHRANK}</span>
      ${idx === 0 ? delayBadge : ''}
    </div>
    <div class="route-path">${r.STATIONPATH || '—'}</div>
    <div class="route-via">Via: ${r.ROUTEPATH || '—'}</div>
    <div class="route-via" style="margin-top:6px">Modes: ${modes}</div>
    <div class="route-stats">
      <div class="route-stat"><span class="stat-value">${r.TOTALMINUTES}</span><span class="stat-label">Minutes</span></div>
      <div class="route-stat"><span class="stat-value">${(r.TOTALDISTANCEKM || 0).toFixed(1)} km</span><span class="stat-label">Distance</span></div>
      <div class="route-stat"><span class="stat-value">${r.TRANSFERCOUNT}</span><span class="stat-label">Transfers</span></div>
      <div class="route-stat"><span class="stat-value">$${(r.DISCOUNTEDFARE || 0).toFixed(2)}</span><span class="stat-label">Fare (after disc.)</span></div>
    </div>
    ${r.HASDELAYS ? `<div class="delay-warning">⚠ Active delays detected on this route (+${r.TOTALDELAYMINUTES} min).</div>` : ''}
  `;
  return div;
}

// ── SmartCard Lookup ───────────────────────────────────────────────────────────
async function lookupCard() {
  const cardNumber = document.getElementById('input-cardnum').value.trim();
  if (!cardNumber) { showToast('Enter a card number.', 'error'); return; }

  try {
    const res  = await fetch(`${API}/api/user/card/${encodeURIComponent(cardNumber)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentCard = cardNumber;
    const c = json.card;
    const walletInfo = document.getElementById('wallet-info');
    walletInfo.classList.remove('hidden');
    walletInfo.innerHTML = `
      <div class="wallet-name">${c.PASSENGERDISPLAYNAME}</div>
      <div class="wallet-balance">$${parseFloat(c.BALANCE).toFixed(2)}</div>
      <div class="wallet-meta">
        ${c.FARECLASSNAME} · ${c.DISCOUNTPERCENTAGE > 0 ? c.DISCOUNTPERCENTAGE + '% discount' : 'No discount'} ·
        Expires ${c.EXPIRATIONDATE} ·
        Card ${c.CARDISACTIVE ? '✓ Active' : '✗ Inactive'}
      </div>
    `;
    document.getElementById('tapin-tapout').classList.remove('hidden');
    loadHistory(cardNumber);
  } catch (e) {
    showToast('Card not found: ' + e.message, 'error');
  }
}

// ── Tap In / Tap Out ──────────────────────────────────────────────────────────
async function tapIn() {
  const stationId = document.getElementById('tap-station').value;
  if (!currentCard || !stationId) { showToast('Select a station first.', 'error'); return; }

  try {
    const res  = await fetch(`${API}/api/user/tap-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber: currentCard, stationId })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    showToast(`✓ Tap-in recorded. Welcome, ${json.passengerName}! Balance: $${json.currentBalance.toFixed(2)}`);
    lookupCard();
  } catch (e) {
    showToast('Tap-in failed: ' + e.message, 'error');
  }
}

async function tapOut() {
  const stationId = document.getElementById('tap-station').value;
  if (!currentCard || !stationId) { showToast('Select a destination station.', 'error'); return; }

  try {
    const res  = await fetch(`${API}/api/user/tap-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber: currentCard, stationId })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    showToast(`✓ Journey complete. Fare deducted: $${json.fareDeducted.toFixed(2)}. New balance: $${json.newBalance.toFixed(2)}`);
    lookupCard();
  } catch (e) {
    showToast('Tap-out failed: ' + e.message, 'error');
  }
}

// ── Travel History ────────────────────────────────────────────────────────────
async function loadHistory(cardNumber) {
  try {
    const res  = await fetch(`${API}/api/user/history/${encodeURIComponent(cardNumber)}`);
    const json = await res.json();
    const list = document.getElementById('history-list');
    if (!json.success || json.count === 0) {
      list.innerHTML = '<p class="placeholder-text">No journey history.</p>';
      return;
    }
    list.innerHTML = json.history.map(h => `
      <div class="history-item ${h.STATUS === 'Completed' ? 'completed' : 'inprogress'}">
        <div class="history-route">
          ${h.ORIGINSTATION} → ${h.DESTINATIONSTATION || '…in progress'}
        </div>
        <div class="history-meta">
          ${h.TAPINTIMEFORMATTED} · ${h.STATUS} · 
          ${h.FAREDEDUCTED > 0 ? `$${parseFloat(h.FAREDEDUCTED).toFixed(2)} charged` : 'No charge'} ·
          ${h.FARECLASSATTIME}
        </div>
      </div>
    `).join('');
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

async function loadAdminIncidents() {
  try {
    const res  = await fetch(`${API}/api/admin/incidents`);
    const json = await res.json();
    const wrap = document.getElementById('incidents-table-wrap');
    if (!json.success || json.count === 0) {
      wrap.innerHTML = '<p class="placeholder-text">No incidents on record.</p>';
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead><tr>
          <th>ID</th><th>Title</th><th>Severity</th>
          <th>Start</th><th>End</th><th>Status</th><th>Action</th>
        </tr></thead>
        <tbody>
          ${json.data.map(i => `
            <tr>
              <td>#${i.INCIDENTID}</td>
              <td>${i.TITLE}</td>
              <td><span class="badge badge-${(i.SEVERITY || '').toLowerCase()}">${i.SEVERITY}</span></td>
              <td>${i.STARTTIME}</td>
              <td>${i.ENDTIME || '—'}</td>
              <td><span class="badge badge-${(i.STATUS || '').toLowerCase()}">${i.STATUS}</span></td>
              <td>${i.STATUS === 'Active'
                ? `<button class="resolve-btn" onclick="resolveIncident(${i.INCIDENTID})">Resolve</button>`
                : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    showToast('Failed to load incidents.', 'error');
  }
}

async function loadAdminSegments() {
  try {
    const res  = await fetch(`${API}/api/admin/segments`);
    const json = await res.json();
    if (!json.success) return;
    const el = document.getElementById('inc-segment');
    el.innerHTML = '<option value="">None</option>';
    json.data.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.SEGMENTID;
      opt.textContent = `[${s.MODE}] ${s.ROUTENAME}: ${s.FROMSTATION} → ${s.TOSTATION} (${s.DISTANCE}km)`;
      el.appendChild(opt);
    });
  } catch (_) {}
}

async function reportIncident() {
  const title      = document.getElementById('inc-title').value.trim();
  const desc       = document.getElementById('inc-desc').value.trim();
  const severity   = document.getElementById('inc-severity').value;
  const segmentId  = document.getElementById('inc-segment').value;
  const stationId  = document.getElementById('inc-station').value;
  const statusType = document.getElementById('inc-statustype').value;
  const delay      = document.getElementById('inc-delay').value;
  const resultEl   = document.getElementById('incident-result');

  if (!title) { showToast('Incident title is required.', 'error'); return; }

  try {
    const res  = await fetch(`${API}/api/admin/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, severity, segmentId, stationId, statusType, delayMinutes: delay })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    resultEl.textContent = `✓ Incident #${json.incidentId} logged successfully. Network assets updated.`;
    resultEl.className = 'result-msg ok';
    resultEl.classList.remove('hidden');

    // Clear form & refresh table
    document.getElementById('inc-title').value = '';
    document.getElementById('inc-desc').value  = '';
    loadAdminIncidents();
    loadDisruptions();
    showToast(`Incident #${json.incidentId} reported.`);
  } catch (e) {
    resultEl.textContent = '✗ Error: ' + e.message;
    resultEl.className = 'result-msg error';
    resultEl.classList.remove('hidden');
  }
}

async function resolveIncident(incidentId) {
  if (!confirm(`Mark Incident #${incidentId} as resolved and reopen all affected lines?`)) return;
  try {
    const res  = await fetch(`${API}/api/admin/incidents/${incidentId}/resolve`, { method: 'PATCH' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    showToast(`✓ Incident #${incidentId} resolved. Service restored.`);
    loadAdminIncidents();
    loadDisruptions();
    loadStations();
  } catch (e) {
    showToast('Failed to resolve: ' + e.message, 'error');
  }
}

async function topUpWallet() {
  const cardNumber = document.getElementById('topup-card').value.trim();
  const amount     = document.getElementById('topup-amount').value;
  const reference  = document.getElementById('topup-ref').value.trim() || 'ADMIN-KIOSK';
  const resultEl   = document.getElementById('topup-result');

  if (!cardNumber || !amount) { showToast('Card number and amount are required.', 'error'); return; }

  try {
    const res  = await fetch(`${API}/api/admin/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber, amount: parseFloat(amount), reference })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    resultEl.textContent = `✓ Added $${parseFloat(amount).toFixed(2)} to ${cardNumber}. New balance: $${json.newBalance.toFixed(2)}`;
    resultEl.className = 'result-msg ok';
    resultEl.classList.remove('hidden');
    showToast(`Wallet topped up. New balance: $${json.newBalance.toFixed(2)}`);
    document.getElementById('topup-card').value   = '';
    document.getElementById('topup-amount').value = '';
  } catch (e) {
    resultEl.textContent = '✗ Error: ' + e.message;
    resultEl.className = 'result-msg error';
    resultEl.classList.remove('hidden');
  }
}
