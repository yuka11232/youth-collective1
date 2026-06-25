const navToggle = document.querySelector('[data-nav-toggle]');
const siteNav = document.querySelector('[data-site-nav]');
const header = document.querySelector('[data-header]');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-nav a').forEach((link) => {
  if (link.getAttribute('href') === currentPage) link.classList.add('active');
});

window.addEventListener('scroll', () => {
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 20);
});
