// ===== ANALYTICS =====
function trackEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

// Track every download button click
document.querySelectorAll('a[download]').forEach(btn => {
  btn.addEventListener('click', () => {
    trackEvent('file_download', {
      file_name: 'RBLXjoinr.zip',
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
            { name: 'File', value: 'RBLXjoinr.zip', inline: true },
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
if (installVideoWrap) {
  fetch('Instructions.mp4', { method: 'HEAD' })
    .then(res => {
      if (res.ok) installVideoWrap.style.display = '';
    })
    .catch(() => {});
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
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
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

// Particle canvas in hero (simple floating dots)
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

function initParticles() {
  particles = [];
  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.35 + 0.15,
      color: ['167,139,250','232,121,249','124,58,237'][Math.floor(Math.random()*3)],
      r: Math.random() * 1.8 + 0.5,
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},1)`;
    ctx.fill();
    ctx.restore();
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < -2) p.x = W + 2;
    if (p.x > W + 2) p.x = -2;
    if (p.y < -2) p.y = H + 2;
    if (p.y > H + 2) p.y = -2;
  });
  requestAnimationFrame(drawParticles);
}

initParticles();
drawParticles();

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
