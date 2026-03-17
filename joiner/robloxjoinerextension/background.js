// After deploying to GitHub Pages, set this to your live URL:
//   'https://YOURUSERNAME.github.io/YOURREPO/joiner/games.json'
// The admin panel (Settings tab) shows your exact URL once you fill in owner + repo.
// For local testing with VS Code Live Server (port 5501):
var GAMES_URL = 'http://localhost:5501/joiner/games.json';

// ===== SCREEN HELPERS =====

function show(id) {
  ['screenLoad', 'screenGames', 'screenError'].forEach(function(s) {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

// ===== LOAD GAMES =====

function loadGames() {
  show('screenLoad');

  fetch(GAMES_URL + '?t=' + Date.now())
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      var games = (data.games || []).filter(function(g) { return g.id; });
      renderGames(games);
      show('screenGames');
    })
    .catch(function(err) {
      document.getElementById('errorMsg').textContent = err.message || 'Failed to fetch games.json';
      show('screenError');
    });
}

// ===== RENDER GAMES =====

function renderGames(games) {
  var list = document.getElementById('gamesList');

  if (!games.length) {
    list.innerHTML = '<div class="empty">No games configured yet.</div>';
    return;
  }

  list.innerHTML = '';
  games.forEach(function(g) {
    var item = document.createElement('div');
    item.className = 'game-item';

    var thumb = document.createElement('div');
    thumb.className = 'game-thumb';
    if (g.thumb) {
      var img = document.createElement('img');
      img.src = g.thumb;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '🎮';
    }

    var info = document.createElement('div');
    info.className = 'game-info';
    info.innerHTML = '<div class="game-name">' + escHtml(g.name || 'Unnamed') + '</div>'
                   + '<div class="game-id">ID: ' + escHtml(g.id) + '</div>';

    var btn = document.createElement('button');
    btn.className = 'play-btn';
    btn.textContent = 'Play';
    btn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'https://www.roblox.com/games/' + encodeURIComponent(g.id) + '/' });
    });

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(btn);
    list.appendChild(item);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== EVENTS =====

document.getElementById('refreshBtn').addEventListener('click', loadGames);
document.getElementById('retryBtn').addEventListener('click', loadGames);

// ===== INIT =====
loadGames();
