const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Hero title: split into words so each one can "needle drop" in turn
const heroTitle = document.getElementById('title');
if (heroTitle) {
  try {
    if (!reduceMotion) {
      const text = heroTitle.textContent.trim();
      heroTitle.setAttribute('aria-label', text);
      heroTitle.textContent = '';
      text.split(' ').forEach((word, wi, words) => {
        const w = document.createElement('span');
        w.className = 'word';
        w.setAttribute('aria-hidden', 'true');
        w.style.setProperty('--wi', wi);
        w.textContent = word;
        heroTitle.appendChild(w);
        if (wi < words.length - 1) heroTitle.appendChild(document.createTextNode(' '));
      });
    }
  } finally {
    heroTitle.classList.add('ready');
  }
}

// Nav: mobile menu, scrolled state, active section
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const sections = document.querySelectorAll('#tribute-info section[id]');
const navAnchors = document.querySelectorAll('#navLinks a');

const setActiveLink = () => {
  let current = '';
  sections.forEach((section) => {
    if (window.scrollY >= section.offsetTop - 120) current = section.id;
  });
  navAnchors.forEach((anchor) => {
    anchor.classList.toggle('active', anchor.getAttribute('href') === `#${current}`);
  });
};

// Tonearm scroll progress + hero parallax, batched into one frame per scroll.
// The arm rests off the record, drops on just after the title lands, then tracks toward the label.
const ARM_REST = -24; // degrees: needle hovering beside the record
const ARM_SWEEP = 28; // degrees: outer groove to inner groove
const arm = document.getElementById('tonearmArm');
let armDropped = reduceMotion;
if (arm && !reduceMotion) {
  setTimeout(() => {
    armDropped = true;
    updateOnScroll();
    setTimeout(() => arm.classList.add('tracking'), 1100);
  }, 1400);
}
const heroArt = document.querySelector('.hero-art');
const scrollCue = document.querySelector('.scroll-cue');
let scrollTicking = false;

const updateOnScroll = () => {
  scrollTicking = false;
  navbar.classList.toggle('scrolled', window.scrollY > 10);
  setActiveLink();
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (arm) {
    const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    arm.style.transform = `rotate(${armDropped ? progress * ARM_SWEEP : ARM_REST}deg)`;
  }
  if (!reduceMotion && window.scrollY < window.innerHeight * 1.5) {
    if (heroArt) heroArt.style.translate = `0 ${window.scrollY * 0.08}px`;
    if (scrollCue) scrollCue.style.opacity = Math.max(0, 0.75 - window.scrollY / 260);
  }
};

window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(updateOnScroll);
}, { passive: true });
updateOnScroll();

// Reveal sections and cards as they scroll into view, staggered within each group
if (!reduceMotion && 'IntersectionObserver' in window) {
  const targets = document.querySelectorAll(
    '.section-head, .text, .reveal-me, .album, .look, .style-text, .video-container iframe, .refs, .credits'
  );
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      revealObserver.unobserve(el);
      el.classList.add('in');
      // Once it has faded in, drop the reveal classes so hover transitions return
      setTimeout(() => el.classList.remove('reveal', 'in'), 1600);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.matches('.album, .look'));
    const index = siblings.indexOf(el);
    el.style.setProperty('--d', `${index < 0 ? 0 : (index % 6) * 0.08}s`);
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
}

// Cards tilt toward the cursor
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.album, .look').forEach((card) => {
    let frame = 0;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.transition = 'transform .12s ease-out, box-shadow .3s var(--ease)';
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 8}deg) translateY(-6px)`;
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      card.style.transition = '';
      card.style.transform = '';
    });
  });

}

// Lookbook: arrow buttons, plus click-and-drag with a mouse
const track = document.getElementById('lookTrack');
if (track) {
  const step = () => Math.max(260, track.clientWidth * 0.7);
  document.getElementById('lookPrev').addEventListener('click', () => {
    track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.getElementById('lookNext').addEventListener('click', () => {
    track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    startX = e.clientX;
    startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    track.style.scrollSnapType = 'none';
    track.scrollLeft = startLeft - (e.clientX - startX);
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    track.style.scrollSnapType = '';
  });
}

// Opened from the walkable studio? Send the back links to the computer in the room, not the homepage
if (new URLSearchParams(window.location.search).get('from') === 'room') {
  const roomUrl = 'https://patreekare.github.io/world.html?open=coursework&project=musician';
  document.querySelectorAll('.nav-back a, .footer-back a').forEach((link) => {
    link.href = roomUrl;
    link.innerHTML = link.closest('.nav-back') ? '&larr; Studio' : '&larr; Back to the studio';
  });
}
