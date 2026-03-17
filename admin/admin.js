// ===== STORAGE KEYS =====
const KEYS = {
  password:  'rblxjoinr_admin_pw',
  games:     'rblxjoinr_games',
  users:     'rblxjoinr_users',
  ghOwner:   'rblxjoinr_gh_owner',
  ghRepo:    'rblxjoinr_gh_repo',
  ghToken:   'rblxjoinr_gh_token',
  ghBranch:  'rblxjoinr_gh_branch',
};

// Path inside the repo where games.json lives
const GAMES_JSON_REPO_PATH = 'joiner/games.json';

const DEFAULT_PASSWORD = 'admin123';

// ===== HELPERS =====

function getPassword() { return localStorage.getItem(KEYS.password) || DEFAULT_PASSWORD; }
function getGames()    { try { return JSON.parse(localStorage.getItem(KEYS.games)) || []; } catch { return []; } }
function saveGames(g)  { localStorage.setItem(KEYS.games, JSON.stringify(g)); }
function getUsers()    { try { return JSON.parse(localStorage.getItem(KEYS.users)) || []; } catch { return []; } }
function saveUsers(u)  { localStorage.setItem(KEYS.users, JSON.stringify(u)); }
function getGhConfig() {
  return {
    owner:  localStorage.getItem(KEYS.ghOwner)  || '',
    repo:   localStorage.getItem(KEYS.ghRepo)   || '',
    token:  localStorage.getItem(KEYS.ghToken)  || '',
    branch: localStorage.getItem(KEYS.ghBranch) || 'main',
  };
}
function today() { return new Date().toISOString().split('T')[0]; }

function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doLogin() {
  const pw  = document.getElementById('loginPassword').value;
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
    if (tab === 'settings') loadGhSettingsIntoForm();
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
  const users       = getUsers();
  const games       = getGames();
  const activeGames = games.filter(g => g.active !== false);
  const uniqueIds   = new Set(users.map(u => u.userId));
  const sevenAgo    = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
  const recentUsers = users.filter(u => u.lastSeen && new Date(u.lastSeen) >= sevenAgo);

  document.getElementById('statTotalUsers').textContent  = users.length;
  document.getElementById('statActiveGames').textContent = activeGames.length;
  document.getElementById('statUniqueUsers').textContent = uniqueIds.size;
  document.getElementById('statRecentUsers').textContent = recentUsers.length;

  const dashUsers = document.getElementById('dashRecentUsers');
  if (!users.length) {
    dashUsers.innerHTML = '<div class="empty-state">No users yet.</div>';
  } else {
    const sorted = [...users].sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')).slice(0, 5);
    dashUsers.innerHTML = sorted.map(u => `
      <div class="mini-row">
        <span class="mini-row-name">${escapeHtml(u.username || 'Unknown')}</span>
        <span class="mini-row-meta">${escapeHtml(u.userId || '—')} · ${escapeHtml(u.lastSeen || '?')}</span>
      </div>`).join('');
  }

  const dashGames = document.getElementById('dashActiveGames');
  if (!activeGames.length) {
    dashGames.innerHTML = '<div class="empty-state">No active games.</div>';
  } else {
    dashGames.innerHTML = activeGames.slice(0, 5).map(g => `
      <div class="mini-row">
        <span class="mini-row-name">${escapeHtml(g.name || 'Unnamed')}</span>
        <span class="mini-row-meta">ID: ${escapeHtml(g.id)}</span>
      </div>`).join('');
  }
}

// ===== GAMES =====

document.getElementById('addGameBtn').addEventListener('click', addGame);
document.getElementById('gameIdInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGame(); });

function addGame() {
  const idRaw = document.getElementById('gameIdInput').value.trim();
  const name  = document.getElementById('gameNameInput').value.trim();
  if (!idRaw || !/^\d+$/.test(idRaw)) { showToast('Please enter a valid numeric game ID.'); return; }
  const games = getGames();
  if (games.find(g => g.id === idRaw)) { showToast('That game ID is already in the list.'); return; }

  const newGame = { id: idRaw, name: name || `Game ${idRaw}`, active: true, addedAt: today() };
  games.push(newGame);
  saveGames(games);
  renderGames(); renderDashboard(); updateBadges();

  // Fetch thumbnail async
  fetchGameThumb(idRaw).then(thumb => {
    if (!thumb) return;
    const g2 = getGames();
    const g  = g2.find(x => x.id === idRaw);
    if (g) { g.thumb = thumb; saveGames(g2); renderGames(); }
  });

  document.getElementById('gameIdInput').value  = '';
  document.getElementById('gameNameInput').value = '';
  showToast('Game added!');
}

async function fetchGameThumb(placeId) {
  try {
    const univRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    if (!univRes.ok) return null;
    const { universeId } = await univRes.json();
    if (!universeId) return null;
    const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=128x128&format=Png&isCircular=false`);
    if (!thumbRes.ok) return null;
    const data = await thumbRes.json();
    return data.data?.[0]?.imageUrl || null;
  } catch { return null; }
}

function renderGames() {
  const games = getGames();
  const list  = document.getElementById('gamesList');

  if (!games.length) { list.innerHTML = '<div class="empty-state">No games added yet.</div>'; updateConfigOutput([]); return; }

  list.innerHTML = games.map((g, i) => `
    <div class="game-item" data-index="${i}">
      <div class="game-thumb">${g.thumb ? `<img src="${escapeHtml(g.thumb)}" alt="" />` : '🎮'}</div>
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
        <button class="btn-icon delete-game" data-index="${i}" title="Remove">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.game-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const g2 = getGames(); g2[cb.dataset.index].active = cb.checked;
      saveGames(g2); renderDashboard(); updateConfigOutput(getGames()); updateBadges();
    });
  });

  list.querySelectorAll('.delete-game').forEach(btn => {
    btn.addEventListener('click', () => {
      const g2 = getGames(); g2.splice(parseInt(btn.dataset.index), 1);
      saveGames(g2); renderGames(); renderDashboard(); updateBadges();
      showToast('Game removed.');
    });
  });

  updateConfigOutput(games);
}

function buildGamesConfig(games) {
  return {
    games: games.filter(g => g.active !== false).map(g => ({
      id: g.id, name: g.name, thumb: g.thumb || null,
    }))
  };
}

function updateConfigOutput(games) {
  document.getElementById('configOutput').textContent = JSON.stringify(buildGamesConfig(games), null, 2);
}

document.getElementById('exportGamesBtn').addEventListener('click', () => downloadJson(getGames(), 'rblxjoinr-games.json'));
document.getElementById('clearGamesBtn').addEventListener('click', () => {
  if (!confirm('Remove all games?')) return;
  saveGames([]); renderGames(); renderDashboard(); updateBadges(); showToast('All games cleared.');
});
document.getElementById('copyConfigBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('configOutput').textContent).then(() => showToast('Copied!'));
});

// ===== PUBLISH games.json via GitHub API =====

document.getElementById('publishBtn').addEventListener('click', publishGamesJson);

async function publishGamesJson() {
  const cfg     = getGhConfig();
  const content = JSON.stringify(buildGamesConfig(getGames()), null, 2);
  const hint    = document.getElementById('publishHint');

  // GitHub API path (requires token + owner + repo in Settings)
  if (cfg.token && cfg.owner && cfg.repo) {
    hint.textContent = 'Publishing to GitHub...';
    hint.className = 'publish-hint publish-hint-info';
    hint.style.display = 'block';
    try {
      await commitFileToGitHub(cfg, GAMES_JSON_REPO_PATH, content);
      hint.textContent = `✓ Published to ${cfg.owner}/${cfg.repo} — GitHub Pages will update in ~30s.`;
      hint.className = 'publish-hint';
      hint.style.display = 'block';
      showToast('Published to GitHub!');
    } catch (err) {
      hint.textContent = `GitHub error: ${err.message}`;
      hint.className = 'publish-hint publish-hint-error';
      hint.style.display = 'block';
    }
    return;
  }

  // Fallback: download
  downloadJson(buildGamesConfig(getGames()), 'games.json');
  hint.textContent = 'Downloaded games.json — commit it to your repo at joiner/games.json. Set up GitHub in Settings to publish automatically.';
  hint.className = 'publish-hint';
  hint.style.display = 'block';
  showToast('games.json downloaded.');
}

async function commitFileToGitHub(cfg, path, content) {
  const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const headers = {
    'Authorization': `token ${cfg.token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/vnd.github.v3+json',
  };

  // Get current file SHA (required for updates)
  let sha = null;
  const getRes = await fetch(`${apiBase}?ref=${cfg.branch}`, { headers });
  if (getRes.ok) {
    sha = (await getRes.json()).sha;
  } else if (getRes.status !== 404) {
    throw new Error(`Could not read existing file (HTTP ${getRes.status})`);
  }

  const body = {
    message: 'Update games.json from admin panel',
    content: btoa(unescape(encodeURIComponent(content))), // base64, UTF-8 safe
    branch:  cfg.branch,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiBase, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${putRes.status}`);
  }
}

// ===== USERS =====

document.getElementById('addUserBtn').addEventListener('click', addUser);
document.getElementById('userIdInput').addEventListener('keydown', e => { if (e.key === 'Enter') addUser(); });

function addUser() {
  const userId   = document.getElementById('userIdInput').value.trim();
  const username = document.getElementById('usernameInput').value.trim();
  if (!userId) { showToast('Please enter a User ID.'); return; }

  const users    = getUsers();
  const existing = users.find(u => u.userId === userId);
  if (existing) {
    existing.lastSeen = today();
    if (username) existing.username = username;
    saveUsers(users);
    showToast('User updated.');
  } else {
    users.push({ userId, username: username || 'Unknown', firstSeen: today(), lastSeen: today() });
    saveUsers(users);
    showToast('User added!');
  }

  renderUsers(); renderDashboard(); updateBadges();
  document.getElementById('userIdInput').value  = '';
  document.getElementById('usernameInput').value = '';
}

function renderUsers(filter = '') {
  let users = getUsers();
  if (filter) {
    const q = filter.toLowerCase();
    users = users.filter(u => (u.username||'').toLowerCase().includes(q) || (u.userId||'').includes(q));
  }
  const tbody = document.getElementById('usersTableBody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${filter ? 'No results.' : 'No users yet.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(u.username||'Unknown')}</strong></td>
      <td class="user-id-cell">${escapeHtml(u.userId||'—')}</td>
      <td class="date-cell">${escapeHtml(u.firstSeen||'—')}</td>
      <td class="date-cell">${escapeHtml(u.lastSeen||'—')}</td>
      <td>
        <button class="btn-icon delete-user" data-userid="${escapeHtml(u.userId)}" title="Remove">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const u2  = getUsers();
      const idx = u2.findIndex(u => u.userId === btn.dataset.userid);
      if (idx !== -1) u2.splice(idx, 1);
      saveUsers(u2); renderUsers(document.getElementById('userSearch').value);
      renderDashboard(); updateBadges(); showToast('User removed.');
    });
  });
}

document.getElementById('userSearch').addEventListener('input', e => renderUsers(e.target.value));

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
  try { data = JSON.parse(raw); if (!Array.isArray(data)) throw new Error(); }
  catch { showToast('Invalid JSON — must be an array.'); return; }

  const users = getUsers(); let added = 0, updated = 0;
  data.forEach(u => {
    if (!u.userId) return;
    const ex = users.find(x => x.userId === String(u.userId));
    if (ex) { if (u.username) ex.username = u.username; if (u.lastSeen) ex.lastSeen = u.lastSeen; updated++; }
    else { users.push({ userId: String(u.userId), username: u.username||'Unknown', firstSeen: u.firstSeen||today(), lastSeen: u.lastSeen||today() }); added++; }
  });
  saveUsers(users); renderUsers(); renderDashboard(); updateBadges();
  document.getElementById('importCard').style.display = 'none';
  document.getElementById('importTextarea').value = '';
  showToast(`Import done: ${added} added, ${updated} updated.`);
});

document.getElementById('clearUsersBtn').addEventListener('click', () => {
  if (!confirm('Delete all users?')) return;
  saveUsers([]); renderUsers(); renderDashboard(); updateBadges(); showToast('All users cleared.');
});

// ===== SETTINGS =====

function loadGhSettingsIntoForm() {
  const cfg = getGhConfig();
  document.getElementById('ghOwner').value  = cfg.owner;
  document.getElementById('ghRepo').value   = cfg.repo;
  document.getElementById('ghToken').value  = cfg.token;
  document.getElementById('ghBranch').value = cfg.branch;
  updatePagesUrl();
}

document.getElementById('saveGhBtn').addEventListener('click', () => {
  localStorage.setItem(KEYS.ghOwner,  document.getElementById('ghOwner').value.trim());
  localStorage.setItem(KEYS.ghRepo,   document.getElementById('ghRepo').value.trim());
  localStorage.setItem(KEYS.ghToken,  document.getElementById('ghToken').value.trim());
  localStorage.setItem(KEYS.ghBranch, document.getElementById('ghBranch').value.trim() || 'main');
  updatePagesUrl();
  showToast('GitHub settings saved!');
});

function updatePagesUrl() {
  const cfg = getGhConfig();
  const el  = document.getElementById('pagesUrlPreview');
  if (cfg.owner && cfg.repo) {
    const base = `https://${cfg.owner}.github.io/${cfg.repo}`;
    el.innerHTML =
      `<strong>Your GitHub Pages URLs:</strong><br/>` +
      `<a href="${base}/joiner/" target="_blank">${base}/joiner/</a> &nbsp;— RBLXjoinr<br/>` +
      `<a href="${base}/duper/"  target="_blank">${base}/duper/</a> &nbsp;— MM2 Duper<br/>` +
      `<a href="${base}/admin/"  target="_blank">${base}/admin/</a> &nbsp;— Admin<br/><br/>` +
      `<strong>Set this URL in the extension's background.js:</strong><br/>` +
      `<code>${base}/joiner/games.json</code>`;
  } else {
    el.innerHTML = 'Fill in GitHub Owner + Repo to see your live URLs.';
  }
}

document.getElementById('tokenHelpBtn').addEventListener('click', () => {
  const el = document.getElementById('tokenHelp');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('changePasswordBtn').addEventListener('click', () => {
  const current = document.getElementById('currentPassword').value;
  const newPw   = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  const msg     = document.getElementById('passwordMsg');
  if (current !== getPassword()) { msg.textContent = 'Current password is incorrect.'; msg.className = 'form-msg error'; return; }
  if (newPw.length < 4)          { msg.textContent = 'Must be at least 4 characters.'; msg.className = 'form-msg error'; return; }
  if (newPw !== confirm)          { msg.textContent = 'Passwords do not match.';        msg.className = 'form-msg error'; return; }
  localStorage.setItem(KEYS.password, newPw);
  msg.textContent = 'Password updated.'; msg.className = 'form-msg success';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value     = '';
  document.getElementById('confirmPassword').value = '';
  setTimeout(() => { msg.textContent = ''; }, 3000);
});

document.getElementById('exportAllBtn').addEventListener('click', () => {
  downloadJson({ games: getGames(), users: getUsers(), exportedAt: new Date().toISOString() }, 'rblxjoinr-backup.json');
});
document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (!confirm('Delete ALL games and users?')) return;
  localStorage.removeItem(KEYS.games); localStorage.removeItem(KEYS.users);
  renderAll(); showToast('All data reset.');
});

// ===== BADGES =====

function updateBadges() {
  document.getElementById('gamesBadge').textContent = getGames().length;
  document.getElementById('usersBadge').textContent = getUsers().length;
}

// ===== DOWNLOAD HELPERS =====

function downloadJson(data, filename) { downloadFile(JSON.stringify(data, null, 2), filename, 'application/json'); }
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ===== INIT =====
checkSession();
