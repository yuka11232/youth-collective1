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
      title: 'Marsol Expo · Local Enterprise Briefing',
      year: 2026,
      category: 'business',
      scope: 'National',
      imageUrl: 'assets/images/gallery/Marsol%20Expo/IMG_20260617_133626_817.jpg',
      galleryKey: 'marsol-expo',
      description: 'Youth Collective treated the exhibition as a micro-program in local enterprise learning, pairing close observation with a compact “production-and-community map” that traced how businesses present value, labor, and civic relevance.',
      goal: 'Understand how local companies describe their work, value chains, and community importance.',
      actions: 'Members attended the exhibition, asked questions about production choices and local impact, and conducted short interviews. They then ran a “pitch-versus-proof” audit on two exhibitor stands — cross-checking founders’ spoken narratives against their own production numbers and pricing claims, in the cross-examination style of a business-school case discussion — before drafting a concise note on recurring themes and a brief presentation framework linking business storytelling to community needs.',
      outcome: 'The team produced a one-page briefing with follow-up questions and a small set of presentation notes.',
      achievement: 'Completed a documented briefing and interview summary on local enterprise themes.'
    },
    {
      title: 'Azerbaijan Energy Week · Sustainability Briefing',
      year: 2026,
      category: 'energy',
      scope: 'International',
      imageUrl: 'assets/images/gallery/Energy%20Week/motion_photo_4258545104581702818.jpg',
      galleryKey: 'energy-week',
      description: 'The program framed energy week as a practical study in how sustainability questions are presented to a public audience, with particular attention to infrastructure, resilience, and the ethical language of transition.',
      goal: 'Explore how energy systems and sustainability ideas are introduced through exhibitions and public-facing discussion.',
      actions: 'Members attended exhibits, gathered questions on reliability and local relevance, and interviewed presenters about practical challenges. They staged a short shadow rebuttal panel, modeled on Model UN cross-examination, testing whether Global North transition frameworks — carbon pricing, subsidy phase-outs — travel to a hydrocarbon-reliant economy, then drafted a short synthesis and a compact “transition lens” note on public trust and long-term planning.',
      outcome: 'The team produced a brief research note and a discussion outline for later review.',
      achievement: 'Completed an internal briefing and a question set on energy and sustainability.'
    },
    {
      title: 'WUF13 · Urban Futures Briefing',
      year: 2026,
      category: 'forums',
      scope: 'International',
      imageUrl: 'assets/images/gallery/WUF13/20260521_111932.jpg',
      galleryKey: 'wuf13',
      description: 'Youth Collective treated the forum as a structured exercise in translating urban policy conversation into clear and accessible youth-facing analysis, with a particular focus on how technology and urbanism shape everyday life for minorities and expatriate communities.',
      goal: 'Translate urban forum discussions into approachable analysis of public space, governance, and youth participation.',
      actions: 'Members attended sessions, documented public-space and civic-engagement themes, prepared briefing notes after each session, and gathered questions for future debate. They also delivered original presentations and speeches on how smart-city technology and urban design choices shape digital exclusion for expatriate and minority residents, framed around the urbanist idea of the “right to the city.”',
      outcome: 'The team produced a compact record of themes, questions, and discussion prompts for later reflection.',
      achievement: 'Delivered a small program report and question bank grounded in observed sessions.'
    },
    {
      title: 'Baku Youth Ideas Lab',
      year: 2026,
      category: 'community',
      scope: 'Local',
      imageUrl: 'assets/images/gallery/John%20Locke/johnlocke-26.jpeg',
      galleryKey: 'john-locke',
      description: 'Using John Locke Essay Competition questions, this micro-program made philosophy, science, and public policy accessible through imagination, debate, and high-level critical thinking, turning formal ideas into an original workshop of argument and intellectual discipline.',
      goal: 'Make philosophy, science, and public policy more accessible through imaginative debate and disciplined reasoning.',
      actions: 'Members designed prompts from the competition questions, guided students through structured argument-building, and set the philosopher’s own theory of natural rights and the social contract against present-day debates on algorithmic governance — asking whether consent-based political theory can meaningfully apply to systems nobody explicitly agreed to. They encouraged counterarguments and used AI ethically to test logic, generate counterarguments, and identify research gaps without copying or producing final work, comparing scientific claims with policy claims throughout.',
      outcome: 'Students produced original argument outlines, question lists, and reflection notes showing stronger reasoning and clearer critical thinking.',
      achievement: 'Completed a verified micro-program with student argument outlines and ethics-guided AI reflection notes.'
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

    article.innerHTML =
      '<img src="' + esc(imgSrc) + '" alt="' + esc(event.title) + '" onerror="this.onerror=null;this.src=\'assets/images/' + fallback + '\'">' +
      '<div class="event-card-content">' +
        '<div class="card-topline">' +
          '<div class="card-badges"><span class="' + tagCls + '">' + tagLabel + '</span><span class="' + scopeClass + '">' + esc(scope) + '</span></div>' +
          '<span class="year-badge">' + esc(String(event.year)) + '</span>' +
        '</div>' +
        '<h2>' + esc(event.title) + '</h2>' +
        '<p class="program-intro">' + esc(event.description) + '</p>' +
        '<ul class="program-points">' +
          (event.goal ? '<li><strong>Goal</strong>' + esc(event.goal) + '</li>' : '') +
          (event.actions ? '<li><strong>Actions</strong>' + esc(event.actions) + '</li>' : '') +
          (event.outcome ? '<li><strong>Outcome</strong>' + esc(event.outcome) + '</li>' : '') +
          (event.achievement ? '<li><strong>Verified achievement</strong>' + esc(event.achievement) + '</li>' : '') +
        '</ul>' +
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
