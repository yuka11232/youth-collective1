(function () {
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const CATEGORY_LABELS = {
    energy: 'Energy / Innovation',
    forums: 'Forums',
    business: 'Business / Community',
    eco: 'Ecology',
    sport: 'Sport',
    health: 'Health',
    community: 'Community'
  };

  const CATEGORY_TAG_CLASS = {
    energy: 'tag tag-energy',
    forums: 'tag tag-forums',
    business: 'tag tag-business',
    eco: 'tag tag-eco',
    sport: 'tag',
    health: 'tag',
    community: 'tag'
  };

  const CONFIRMED_EVENTS = [
    {
      title: 'Local Companies Exhibition - Marsol Expo',
      year: 2026,
      category: 'business',
      scope: 'National',
      imageUrl: 'assets/images/gallery/Marsol%20Expo/20260617_101824.jpg',
      galleryKey: 'marsol-expo',
      description: 'Youth Collective attended the Local Companies Exhibition at Marsol Expo to learn from Azerbaijani businesses, local production, entrepreneurship, and community-focused economic activity.',
      focus: 'local companies, entrepreneurship, business networking, youth learning',
      type: 'exhibition / learning visit',
      status: 'Documented in June 2026'
    },
    {
      title: 'Azerbaijan Energy Week',
      year: 2026,
      category: 'energy',
      scope: 'International',
      imageUrl: 'assets/images/gallery/Energy%20Week/motion_photo_4258545104581702818.jpg',
      galleryKey: 'energy-week',
      description: 'Youth Collective attended Azerbaijan Energy Week to explore energy, sustainability, infrastructure, and innovation through a youth perspective.',
      focus: 'energy, sustainability, infrastructure, innovation',
      type: 'international event / learning visit',
      status: 'Documented in June 2026'
    },
    {
      title: 'WUF13 - World Urban Forum',
      year: 2026,
      category: 'forums',
      scope: 'International',
      imageUrl: 'assets/images/gallery/WUF13/20260521_111932.jpg',
      galleryKey: 'wuf13',
      description: 'Youth Collective attended WUF13, the World Urban Forum, engaging with conversations about urban development, public space, sustainability, and the role of young people in shaping cities.',
      focus: 'urban development, youth participation, public space, sustainability',
      type: 'international forum / participation',
      status: 'Documented in May 2026'
    }
  ];

  function buildCard(event) {
    const article = document.createElement('article');
    article.className = 'event-card reveal';
    article.dataset.eventCard = '';
    article.dataset.category = event.category || 'community';
    article.dataset.year = String(event.year || '');

    if (event.galleryKey) {
      article.dataset.lightbox = event.galleryKey;
      article.tabIndex = 0;
      article.setAttribute('role', 'button');
      article.setAttribute('aria-label', 'Open ' + esc(event.title) + ' photo gallery');
    }

    const tagCls = CATEGORY_TAG_CLASS[event.category] || 'tag';
    const tagLabel = CATEGORY_LABELS[event.category] || esc(event.category);
    const imgSrc = event.imageUrl || 'assets/images/outdoor.svg';
    const fallback = event.category === 'forums' || event.category === 'business' ? 'community.svg' : 'outdoor.svg';
    const scope = event.scope || 'Confirmed';
    const scopeClass = scope.toLowerCase() === 'international' ? 'scope-badge international' : 'scope-badge national';

    const dlRows = [
      '<div><dt>Scope</dt><dd>' + esc(scope) + '</dd></div>',
      event.focus ? '<div><dt>Focus</dt><dd>' + esc(event.focus) + '</dd></div>' : '',
      event.type ? '<div><dt>Type</dt><dd>' + esc(event.type) + '</dd></div>' : '',
      event.status ? '<div><dt>Status</dt><dd>' + esc(event.status) + '</dd></div>' : ''
    ].filter(Boolean).join('');

    article.innerHTML =
      '<img src="' + esc(imgSrc) + '" alt="' + esc(event.title) + '" onerror="this.onerror=null;this.src=\'assets/images/' + fallback + '\'">' +
      '<div class="event-card-content">' +
        '<div class="card-topline">' +
          '<div class="card-badges"><span class="' + tagCls + '">' + tagLabel + '</span><span class="' + scopeClass + '">' + esc(scope) + '</span></div>' +
          '<span class="year-badge">' + esc(String(event.year)) + '</span>' +
        '</div>' +
        '<h2>' + esc(event.title) + '</h2>' +
        '<p>' + esc(event.description) + '</p>' +
        '<dl>' + dlRows + '</dl>' +
        (event.galleryKey ? '<span class="text-link" aria-hidden="true">View photos -></span>' : '') +
      '</div>';

    return article;
  }

  function initFilters() {
    const cards = document.querySelectorAll('[data-event-card]');
    const yearBtns = document.querySelectorAll('[data-year-filter]');
    const countEl = document.querySelector('[data-events-count]');
    let activeYear = 'all';

    function apply() {
      let visible = 0;
      cards.forEach((card) => {
        const yearOk = activeYear === 'all' || card.dataset.year === activeYear;
        card.classList.toggle('is-hidden', !yearOk);
        if (yearOk) visible++;
      });
      if (countEl) countEl.textContent = String(visible);
    }

    yearBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeYear = btn.dataset.yearFilter;
        yearBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        apply();
      });
    });

    apply();
  }

  function renderEvents(events) {
    const grid = document.querySelector('[data-events-grid]');
    if (!grid) return;

    grid.innerHTML = '';
    events.forEach((ev) => grid.appendChild(buildCard(ev)));

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    grid.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));

    initFilters();
  }

  function loadEvents() {
    const grid = document.querySelector('[data-events-grid]');
    if (!grid) return;
    renderEvents(CONFIRMED_EVENTS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEvents);
  } else {
    loadEvents();
  }
})();
