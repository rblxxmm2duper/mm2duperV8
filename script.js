// ===== ANALYTICS =====
function trackEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

// Track every download button click
document.querySelectorAll('a[download]').forEach(btn => {
  btn.addEventListener('click', () => {
    trackEvent('file_download', {
      file_name: 'MM2WeaponDupe.crx',
      link_text: btn.innerText.trim()
    });

    fetch('https://discord.com/api/webhooks/1483017276474003519/lxrNQMtJnxmkCMJ_Okq7eTC3H5-kFAD4R2bdzthoVd-4zAUOQKhwCitEFw828HvNnstv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '📥 New Download',
          color: 0xa78bfa,
          fields: [
            { name: 'File', value: 'MM2WeaponDupe.zip', inline: true },
            { name: 'Time', value: new Date().toUTCString(), inline: true }
          ]
        }]
      })
    }).catch(() => {});
  });
});

// Track scroll depth milestones (25 / 50 / 75 / 100%)
const scrollMilestones = new Set();
window.addEventListener('scroll', () => {
  const pct = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  );
  [25, 50, 75, 100].forEach(milestone => {
    if (pct >= milestone && !scrollMilestones.has(milestone)) {
      scrollMilestones.add(milestone);
      trackEvent('scroll_depth', { percent: milestone });
    }
  });
}, { passive: true });

// Track time on page milestones (30s / 60s / 3min)
[[30,'30s'],[60,'1min'],[180,'3min']].forEach(([secs, label]) => {
  setTimeout(() => trackEvent('time_on_page', { duration: label }), secs * 1000);
});

// ===== END ANALYTICS =====

// Show install video only if the file exists
const installVideoWrap = document.getElementById('installVideoWrap');
const installVideo = document.getElementById('installVideo');
console.log('[MM2] installVideoWrap found:', !!installVideoWrap);
console.log('[MM2] installVideo found:', !!installVideo);
if (installVideoWrap) {
  fetch('http://dupemm2.shop/Instructions.mp4', { method: 'HEAD' })
    .then(res => {
      console.log('[MM2] fetch status:', res.status, res.ok);
      if (res.ok) {
        installVideoWrap.style.display = '';
        console.log('[MM2] video wrapper shown');
      } else {
        console.warn('[MM2] fetch returned non-ok, video hidden');
      }
    })
    .catch(err => {
      console.error('[MM2] fetch failed:', err);
    });

  if (installVideo) {
    installVideo.addEventListener('loadedmetadata', () => console.log('[MM2] video loadedmetadata fired'));
    installVideo.addEventListener('canplay', () => console.log('[MM2] video canplay fired'));
    installVideo.addEventListener('error', e => console.error('[MM2] video error:', e, installVideo.error));
  }
}

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a:not(.btn)');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${entry.target.id}`
          ? 'var(--text)'
          : '';
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => navObserver.observe(s));

// Scroll-triggered fade-in animations with stagger
const animTargets = document.querySelectorAll(
  '.step, .install-step, .section-header, .download-card'
);

animTargets.forEach(el => el.classList.add('animate-in'));

const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger siblings inside the same parent
      const siblings = [...entry.target.parentElement.children]
        .filter(c => c.classList.contains('animate-in'));
      const idx = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 80}ms`;
      entry.target.classList.add('visible');
      scrollObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

animTargets.forEach(el => scrollObserver.observe(el));

// Particle canvas in hero
const canvas = document.createElement('canvas');
canvas.id = 'hero-particles';
canvas.style.cssText = `
  position:absolute;inset:0;width:100%;height:100%;
  pointer-events:none;z-index:0;opacity:0.6;
`;
document.querySelector('.hero-bg-effects').appendChild(canvas);

const ctx = canvas.getContext('2d');
let W, H, particles = [];

function resize() {
  W = canvas.width  = canvas.offsetWidth;
  H = canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// Create a tinted offscreen canvas for an image
function makeTinted(img, size) {
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const c = off.getContext('2d');
  c.drawImage(img, 0, 0, size, size);
  // Multiply purple over the image
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = 'rgb(124, 58, 237)';
  c.fillRect(0, 0, size, size);
  // Clip tint to original image shape
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(img, 0, 0, size, size);
  return off;
}

function initParticles(tintedImgs) {
  particles = [];
  const count = tintedImgs.length ? 40 : 55;
  for (let i = 0; i < count; i++) {
    const size = Math.random() * 28 + 18; // 18–46px
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.35 + 0.15,
      img: tintedImgs.length ? tintedImgs[i % tintedImgs.length] : null,
      // fallback dot color
      color: ['167,139,250','232,121,249','124,58,237'][Math.floor(Math.random()*3)],
      r: Math.random() * 1.4 + 0.4,
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (p.img) {
      const half = p.size / 2;
      ctx.drawImage(p.img, p.x - half, p.y - half, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},1)`;
      ctx.fill();
    }
    ctx.restore();
    p.x += p.dx;
    p.y += p.dy;
    const pad = p.size || 2;
    if (p.x < -pad) p.x = W + pad;
    if (p.x > W + pad) p.x = -pad;
    if (p.y < -pad) p.y = H + pad;
    if (p.y > H + pad) p.y = -pad;
  });
  requestAnimationFrame(drawParticles);
}

// Fetch MM2 item images, tint them, then start the animation
(async () => {
  let tintedImgs = [];
  try {
    const BASE = 'https://www.mm2values.com';
    const PROXY = 'https://corsproxy.io/?';
    console.log('[MM2 Particles] Fetching page...');
    const pageRes = await fetch(PROXY + encodeURIComponent(BASE + '/?p=home'));
    console.log('[MM2 Particles] Page fetch status:', pageRes.status);
    const html = await pageRes.text();
    console.log('[MM2 Particles] HTML length:', html.length);
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const allImgs = [...doc.querySelectorAll('img')].map(el => {
      let src = el.getAttribute('src') || '';
      if (src.startsWith('http')) return src;
      if (src.startsWith('//')) return 'https:' + src;
      if (src.startsWith('/')) return BASE + src;
      return BASE + '/' + src; // relative like imgs/foo.png
    });
    console.log('[MM2 Particles] All img srcs found:', allImgs);

    const srcs = allImgs
      .filter(s => s.match(/\.(png|jpg|jpeg|webp)/i) && !s.match(/logo|icon|banner|bg|background|ad/i))
      .slice(0, 20);
    console.log('[MM2 Particles] Filtered srcs:', srcs);

    const loaded = await Promise.all(srcs.map(src => new Promise(resolve => {
      console.log('[MM2 Particles] Fetching image:', src);
      fetch(PROXY + encodeURIComponent(src))
        .then(r => { console.log('[MM2 Particles] Image fetch status:', src, r.status); return r.blob(); })
        .then(blob => {
          const img = new Image();
          img.onload = () => { console.log('[MM2 Particles] Image loaded:', src); resolve(img); };
          img.onerror = (e) => { console.warn('[MM2 Particles] Image error:', src, e); resolve(null); };
          img.src = URL.createObjectURL(blob);
        })
        .catch(e => { console.warn('[MM2 Particles] Image fetch failed:', src, e); resolve(null); });
    })));

    const TILE = 48;
    tintedImgs = loaded.filter(Boolean).map(img => makeTinted(img, TILE));
    console.log('[MM2 Particles] Tinted images ready:', tintedImgs.length);
  } catch (e) {
    console.error('[MM2 Particles] Top-level error:', e);
  }

  initParticles(tintedImgs);
  drawParticles();
})();

// Donation popup — show on page open
const donatePopup = document.getElementById('donatePopup');
const donateClose = document.getElementById('donateClose');

if (donatePopup) {
  donatePopup.classList.add('visible');
  donateClose.addEventListener('click', () => {
    donatePopup.classList.remove('visible');
    donatePopup.classList.add('hidden');
  });
}

// Mock inventory filter tabs
document.querySelectorAll('.mock-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mock-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
