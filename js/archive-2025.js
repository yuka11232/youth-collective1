const archiveItems = document.querySelectorAll('[data-archive-item]');
const archiveYearButtons = document.querySelectorAll('[data-archive-year-filter]');
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

updateArchiveFilter();
