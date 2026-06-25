function animateCounter(element) {
  const target = Number(element.dataset.counter);
  const duration = 900;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    element.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

const counterArea = document.querySelector('[data-counter-area]');
if (counterArea) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('[data-counter]').forEach(animateCounter);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  counterObserver.observe(counterArea);
}

const joinForm = document.querySelector('[data-join-form]');
if (joinForm) {
  const status = document.querySelector('[data-form-status]');
  joinForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!joinForm.checkValidity()) {
      status.textContent = 'Please fill in your name, email, and interest area.';
      joinForm.reportValidity();
      return;
    }

    const payload = Object.fromEntries(new FormData(joinForm));
    status.textContent = 'Saving your message...';

    try {
      if (!window.YCBackend) throw new Error('Backend client is not loaded.');
      const data = await window.YCBackend.apiFetch('/api/contact-messages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      status.textContent = data.message || 'Thank you. Your interest has been saved.';
      window.YCBackend.toast('Message saved.', 'success');
      joinForm.reset();
    } catch (error) {
      status.textContent = error.message || 'Could not save your message yet.';
    }
  });
}


function initHomeInteractions() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) {
    const glow = document.createElement('div');
    glow.className = 'hero-glow';
    glow.setAttribute('aria-hidden', 'true');
    heroVisual.appendChild(glow);

    heroVisual.addEventListener('pointermove', (event) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const xPercent = (x / rect.width - 0.5) * 2;
      const yPercent = (y / rect.height - 0.5) * 2;

      heroVisual.classList.add('is-interacting');
      heroVisual.style.setProperty('--run-x', `${xPercent * 14}px`);
      heroVisual.style.setProperty('--run-y', `${yPercent * 14}px`);
      heroVisual.style.setProperty('--eco-x', `${xPercent * -10.5}px`);
      heroVisual.style.setProperty('--eco-y', `${yPercent * -10.5}px`);
      heroVisual.style.setProperty('--health-x', `${xPercent * 7.7}px`);
      heroVisual.style.setProperty('--health-y', `${yPercent * -7.7}px`);
      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
    });

    heroVisual.addEventListener('pointerleave', () => {
      heroVisual.classList.remove('is-interacting');
      ['--run-x', '--run-y', '--eco-x', '--eco-y', '--health-x', '--health-y'].forEach((property) => {
        heroVisual.style.removeProperty(property);
      });
    });
  }

  const tiltCards = document.querySelectorAll('.focus-card, .event-preview-card, .principle-grid article');
  tiltCards.forEach((card) => {
    card.classList.add('tilt-ready');

    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 7;
      const rotateX = ((0.5 - y / rect.height)) * 7;
      card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

initHomeInteractions();
