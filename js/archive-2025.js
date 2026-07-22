const archiveItems = document.querySelectorAll('[data-archive-item]');
const archiveYearButtons = document.querySelectorAll('[data-archive-year-filter]');
const archiveTriggers = document.querySelectorAll('.timeline-card-trigger');
let activeArchiveYear = 'all';

function updateArchiveFilter() {
  let visibleCount = 0;
  archiveItems.forEach((item) => {
    const yearMatch = activeArchiveYear === 'all' || item.dataset.year === activeArchiveYear;
    item.classList.toggle('is-hidden', !yearMatch);
    if (yearMatch) visibleCount += 1;
  });
  const countEl = document.querySelector('[data-archive-count]');
  if (countEl) countEl.textContent = String(visibleCount);
}

archiveYearButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeArchiveYear = button.dataset.archiveYearFilter;
    archiveYearButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    updateArchiveFilter();
  });
});

archiveTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const card = trigger.closest('.timeline-card');
    if (!card) return;
    const expanded = card.classList.toggle('is-expanded');
    trigger.setAttribute('aria-expanded', String(expanded));
    if (expanded) {
      const panel = card.querySelector('.timeline-detail-panel');
      if (panel) panel.setAttribute('aria-hidden', 'false');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
});

updateArchiveFilter();
