const eventCards = document.querySelectorAll('[data-event-card]');
const categoryButtons = document.querySelectorAll('[data-filter]');
const yearButtons = document.querySelectorAll('[data-year-filter]');
const eventCount = document.querySelector('[data-events-count]');
let activeCategory = 'all';
let activeYear = 'all';

function updateEventFilters() {
  let visibleCount = 0;
  eventCards.forEach((card) => {
    const categoryMatch = activeCategory === 'all' || card.dataset.category === activeCategory;
    const yearMatch = activeYear === 'all' || card.dataset.year === activeYear;
    const shouldShow = categoryMatch && yearMatch;
    card.classList.toggle('is-hidden', !shouldShow);
    if (shouldShow) visibleCount += 1;
  });
  if (eventCount) eventCount.textContent = String(visibleCount);
}

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    categoryButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    updateEventFilters();
  });
});

yearButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeYear = button.dataset.yearFilter;
    yearButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    updateEventFilters();
  });
});

updateEventFilters();
