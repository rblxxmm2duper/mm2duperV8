// ===== STORAGE KEYS =====
const KEYS = {
  password: 'rblxjoinr_admin_pw',
  games: 'rblxjoinr_games',
  users: 'rblxjoinr_users',
};

const DEFAULT_PASSWORD = 'admin123';

// ===== HELPERS =====

function getPassword() {
  return localStorage.getItem(KEYS.password) || DEFAULT_PASSWORD;
}

function getGames() {
  try { return JSON.parse(localStorage.getItem(KEYS.games)) || []; }
  catch { return []; }
}

function saveGames(games) {
  localStorage.setItem(KEYS.games, JSON.stringify(games));
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem(KEYS.users)) || []; }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== LOGIN =====

const loginScreen = document.getElementById('loginScreen');
const adminApp    = document.getElementById('adminApp');

function checkSession() {
  if (sessionStorage.getItem('rblxjoinr_auth') === '1') {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'flex';
    renderAll();
  }
}

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogin() {
  const pw = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  if (pw === getPassword()) {
    sessionStorage.setItem('rblxjoinr_auth', '1');
    loginScreen.style.display = 'none';
    adminApp.style.display = 'flex';
    renderAll();
  } else {
    err.textContent = 'Incorrect password.';
    document.getElementById('loginPassword').value = '';
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('rblxjoinr_auth');
  adminApp.style.display = 'none';
  loginScreen.style.display = 'flex';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
});

// ===== TABS =====

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
  });
});

// ===== RENDER ALL =====

function renderAll() {
  renderDashboard();
  renderGames();
  renderUsers();
  updateBadges();
}

// ===== DASHBOARD =====

function renderDashboard() {
  const users = getUsers();
  const games = getGames();
  const activeGames = games.filter(g => g.active !== false);
  const uniqueIds = new Set(users.map(u => u.userId));
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUsers = users.filter(u => u.lastSeen && new Date(u.lastSeen) >= sevenDaysAgo);

  document.getElementById('statTotalUsers').textContent = users.length;
  document.getElementById('statActiveGames').textContent = activeGames.length;
  document.getElementById('statUniqueUsers').textContent = uniqueIds.size;
  document.getElementById('statRecentUsers').textContent = recentUsers.length;

  // Recent users mini list
  const dashUsers = document.getElementById('dashRecentUsers');
  if (users.length === 0) {
    dashUsers.innerHTML = '<div class="empty-state">No users yet.</div>';
  } else {
    const sorted = [...users].sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')).slice(0, 5);
    dashUsers.innerHTML = sorted.map(u => `
      <div class="mini-row">
        <span class="mini-row-name">${escapeHtml(u.username || 'Unknown')}</span>
        <span class="mini-row-meta">${escapeHtml(u.userId || '—')} · ${escapeHtml(u.lastSeen || '?')}</span>
      </div>
    `).join('');
  }

  // Active games mini list
  const dashGames = document.getElementById('dashActiveGames');
  if (activeGames.length === 0) {
    dashGames.innerHTML = '<div class="empty-state">No active games.</div>';
  } else {
    dashGames.innerHTML = activeGames.slice(0, 5).map(g => `
      <div class="mini-row">
        <span class="mini-row-name">${escapeHtml(g.name || 'Unnamed Game')}</span>
        <span class="mini-row-meta">ID: ${escapeHtml(g.id)}</span>
      </div>
    `).join('');
  }
}

// ===== GAMES =====

document.getElementById('addGameBtn').addEventListener('click', addGame);
document.getElementById('gameIdInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addGame();
});

function addGame() {
  const idRaw = document.getElementById('gameIdInput').value.trim();
  const name  = document.getElementById('gameNameInput').value.trim();

  if (!idRaw || !/^\d+$/.test(idRaw)) {
    showToast('Please enter a valid numeric game ID.');
    return;
  }

  const games = getGames();
  if (games.find(g => g.id === idRaw)) {
    showToast('That game ID is already in the list.');
    return;
  }

  const newGame = {
    id: idRaw,
    name: name || `Game ${idRaw}`,
    active: true,
    addedAt: today(),
  };

  // Try to load thumbnail from Roblox API
  fetchGameThumb(idRaw).then(thumb => {
    if (thumb) newGame.thumb = thumb;
    games.push(newGame);
    saveGames(games);
    renderGames();
    renderDashboard();
    updateBadges();
  });

  // Optimistically add to UI immediately, thumb will update when loaded
  games.push(newGame);
  saveGames(games);
  renderGames();
  renderDashboard();
  updateBadges();

  document.getElementById('gameIdInput').value = '';
  document.getElementById('gameNameInput').value = '';
  showToast('Game added!');
}

async function fetchGameThumb(placeId) {
  try {
    // Convert place ID to universe ID
    const univRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    if (!univRes.ok) return null;
    const univData = await univRes.json();
    const universeId = univData.universeId;
    if (!universeId) return null;

    // Fetch thumbnail
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=128x128&format=Png&isCircular=false`
    );
    if (!thumbRes.ok) return null;
    const thumbData = await thumbRes.json();
    return thumbData.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

function renderGames() {
  const games = getGames();
  const list  = document.getElementById('gamesList');

  if (games.length === 0) {
    list.innerHTML = '<div class="empty-state">No games added yet.</div>';
    updateConfigOutput([]);
    return;
  }

  list.innerHTML = games.map((g, i) => `
    <div class="game-item" data-index="${i}">
      <div class="game-thumb">
        ${g.thumb
          ? `<img src="${escapeHtml(g.thumb)}" alt="" />`
          : '🎮'}
      </div>
      <div class="game-info">
        <div class="game-name">${escapeHtml(g.name)}</div>
        <div class="game-id">ID: ${escapeHtml(g.id)}</div>
      </div>
      <div class="game-actions">
        <label class="toggle-switch" title="${g.active !== false ? 'Active' : 'Inactive'}">
          <input type="checkbox" class="game-toggle" data-index="${i}" ${g.active !== false ? 'checked' : ''} />
          <div class="toggle-track"></div>
          <div class="toggle-thumb-sw"></div>
        </label>
        <button class="btn-icon delete-game" data-index="${i}" title="Remove game">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  // Toggle active state
  list.querySelectorAll('.game-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const games = getGames();
      games[cb.dataset.index].active = cb.checked;
      saveGames(games);
      renderDashboard();
      updateConfigOutput(getGames());
      updateBadges();
    });
  });

  // Delete game
  list.querySelectorAll('.delete-game').forEach(btn => {
    btn.addEventListener('click', () => {
      const games = getGames();
      games.splice(parseInt(btn.dataset.index), 1);
      saveGames(games);
      renderGames();
      renderDashboard();
      updateBadges();
      showToast('Game removed.');
    });
  });

  updateConfigOutput(games);
}

function updateConfigOutput(games) {
  const config = {
    games: games.filter(g => g.active !== false).map(g => ({
      id: g.id,
      name: g.name,
      thumb: g.thumb || null,
    }))
  };
  document.getElementById('configOutput').textContent = JSON.stringify(config, null, 2);
}

document.getElementById('exportGamesBtn').addEventListener('click', () => {
  downloadJson(getGames(), 'rblxjoinr-games.json');
});

document.getElementById('clearGamesBtn').addEventListener('click', () => {
  if (!confirm('Remove all games?')) return;
  saveGames([]);
  renderGames();
  renderDashboard();
  updateBadges();
  showToast('All games cleared.');
});

document.getElementById('copyConfigBtn').addEventListener('click', () => {
  const text = document.getElementById('configOutput').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
});

// ===== PUBLISH games.json =====

let savedFileHandle = null;

document.getElementById('publishBtn').addEventListener('click', publishGamesJson);

async function publishGamesJson() {
  const games  = getGames();
  const config = {
    games: games.filter(g => g.active !== false).map(g => ({
      id:    g.id,
      name:  g.name,
      thumb: g.thumb || null,
    }))
  };
  const content = JSON.stringify(config, null, 2);
  const hint    = document.getElementById('publishHint');

  // Use File System Access API to write directly to disk (Chrome only)
  if ('showSaveFilePicker' in window) {
    try {
      if (!savedFileHandle) {
        savedFileHandle = await window.showSaveFilePicker({
          suggestedName: 'games.json',
          types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }],
        });
      }
      const writable = await savedFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      hint.textContent = `Saved to "${savedFileHandle.name}" — the extension will load it from there.`;
      hint.style.display = 'block';
      showToast('games.json saved!');
      return;
    } catch (err) {
      // User cancelled or error — fall through to download
      savedFileHandle = null;
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: download the file
  downloadJson(config, 'games.json');
  hint.textContent = 'Downloaded games.json — place it in the root of your website so the extension can fetch it.';
  hint.style.display = 'block';
  showToast('games.json downloaded!');
}

// ===== USERS =====

document.getElementById('addUserBtn').addEventListener('click', addUser);
document.getElementById('userIdInput').addEventListener('keydown', e => { if (e.key === 'Enter') addUser(); });

function addUser() {
  const userId   = document.getElementById('userIdInput').value.trim();
  const username = document.getElementById('usernameInput').value.trim();

  if (!userId) {
    showToast('Please enter a User ID.');
    return;
  }

  const users = getUsers();
  const existing = users.find(u => u.userId === userId);
  if (existing) {
    // Update last seen
    existing.lastSeen = today();
    if (username) existing.username = username;
    saveUsers(users);
    renderUsers();
    renderDashboard();
    updateBadges();
    showToast('User updated (already exists).');
    return;
  }

  users.push({
    userId,
    username: username || 'Unknown',
    firstSeen: today(),
    lastSeen: today(),
  });
  saveUsers(users);
  renderUsers();
  renderDashboard();
  updateBadges();

  document.getElementById('userIdInput').value = '';
  document.getElementById('usernameInput').value = '';
  showToast('User added!');
}

function renderUsers(filter = '') {
  let users = getUsers();
  if (filter) {
    const q = filter.toLowerCase();
    users = users.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.userId || '').includes(q)
    );
  }

  const tbody = document.getElementById('usersTableBody');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${filter ? 'No results.' : 'No users yet.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(u.username || 'Unknown')}</strong></td>
      <td class="user-id-cell">${escapeHtml(u.userId || '—')}</td>
      <td class="date-cell">${escapeHtml(u.firstSeen || '—')}</td>
      <td class="date-cell">${escapeHtml(u.lastSeen || '—')}</td>
      <td>
        <button class="btn-icon delete-user" data-userid="${escapeHtml(u.userId)}" title="Remove user">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const users = getUsers();
      const idx = users.findIndex(u => u.userId === btn.dataset.userid);
      if (idx !== -1) users.splice(idx, 1);
      saveUsers(users);
      renderUsers(document.getElementById('userSearch').value);
      renderDashboard();
      updateBadges();
      showToast('User removed.');
    });
  });
}

document.getElementById('userSearch').addEventListener('input', e => {
  renderUsers(e.target.value);
});

document.getElementById('exportUsersBtn').addEventListener('click', () => {
  const users = getUsers();
  if (!users.length) { showToast('No users to export.'); return; }
  const rows = [['#','Username','User ID','First Seen','Last Seen']];
  users.forEach((u, i) => rows.push([i+1, u.username||'', u.userId||'', u.firstSeen||'', u.lastSeen||'']));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(csv, 'rblxjoinr-users.csv', 'text/csv');
});

document.getElementById('importUsersBtn').addEventListener('click', () => {
  document.getElementById('importCard').style.display = 'block';
});

document.getElementById('cancelImportBtn').addEventListener('click', () => {
  document.getElementById('importCard').style.display = 'none';
  document.getElementById('importTextarea').value = '';
});

document.getElementById('confirmImportBtn').addEventListener('click', () => {
  const raw = document.getElementById('importTextarea').value.trim();
  let data;
  try {
    data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('not an array');
  } catch {
    showToast('Invalid JSON — must be an array of user objects.');
    return;
  }

  const users = getUsers();
  let added = 0, updated = 0;
  data.forEach(u => {
    if (!u.userId) return;
    const existing = users.find(x => x.userId === String(u.userId));
    if (existing) {
      if (u.username) existing.username = u.username;
      if (u.lastSeen) existing.lastSeen = u.lastSeen;
      updated++;
    } else {
      users.push({
        userId:    String(u.userId),
        username:  u.username || 'Unknown',
        firstSeen: u.firstSeen || today(),
        lastSeen:  u.lastSeen  || today(),
      });
      added++;
    }
  });

  saveUsers(users);
  renderUsers();
  renderDashboard();
  updateBadges();
  document.getElementById('importCard').style.display = 'none';
  document.getElementById('importTextarea').value = '';
  showToast(`Import complete: ${added} added, ${updated} updated.`);
});

document.getElementById('clearUsersBtn').addEventListener('click', () => {
  if (!confirm('Delete all users?')) return;
  saveUsers([]);
  renderUsers();
  renderDashboard();
  updateBadges();
  showToast('All users cleared.');
});

// ===== SETTINGS =====

document.getElementById('changePasswordBtn').addEventListener('click', () => {
  const current  = document.getElementById('currentPassword').value;
  const newPw    = document.getElementById('newPassword').value;
  const confirm  = document.getElementById('confirmPassword').value;
  const msg      = document.getElementById('passwordMsg');

  if (current !== getPassword()) {
    msg.textContent = 'Current password is incorrect.';
    msg.className = 'form-msg error';
    return;
  }
  if (newPw.length < 4) {
    msg.textContent = 'New password must be at least 4 characters.';
    msg.className = 'form-msg error';
    return;
  }
  if (newPw !== confirm) {
    msg.textContent = 'Passwords do not match.';
    msg.className = 'form-msg error';
    return;
  }

  localStorage.setItem(KEYS.password, newPw);
  msg.textContent = 'Password updated successfully.';
  msg.className = 'form-msg success';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  setTimeout(() => { msg.textContent = ''; }, 3000);
});

document.getElementById('exportAllBtn').addEventListener('click', () => {
  const data = {
    games: getGames(),
    users: getUsers(),
    exportedAt: new Date().toISOString(),
  };
  downloadJson(data, 'rblxjoinr-backup.json');
});

document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (!confirm('This will delete ALL games and users. Are you sure?')) return;
  localStorage.removeItem(KEYS.games);
  localStorage.removeItem(KEYS.users);
  renderAll();
  showToast('All data reset.');
});

// ===== BADGES =====

function updateBadges() {
  document.getElementById('gamesBadge').textContent = getGames().length;
  document.getElementById('usersBadge').textContent = getUsers().length;
}

// ===== DOWNLOAD HELPERS =====

function downloadJson(data, filename) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== INIT =====
checkSession();
