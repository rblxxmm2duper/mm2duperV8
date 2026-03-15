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
  pointer-events:none;z-index:0;opacity:0.55;
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

const COLORS = ['167,139,250', '232,121,249', '124,58,237'];

for (let i = 0; i < 55; i++) {
  particles.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4 + 0.4,
    dx: (Math.random() - 0.5) * 0.25,
    dy: (Math.random() - 0.5) * 0.25,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: Math.random() * 0.5 + 0.2,
  });
}

function drawParticles() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
    ctx.fill();

    p.x += p.dx;
    p.y += p.dy;

    if (p.x < 0) p.x = W;
    if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H;
    if (p.y > H) p.y = 0;
  });
  requestAnimationFrame(drawParticles);
}
drawParticles();

// Mock inventory filter tabs
document.querySelectorAll('.mock-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mock-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
