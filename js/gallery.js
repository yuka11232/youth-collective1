const photoCards = document.querySelectorAll('[data-gallery-card]');
const yearButtons = document.querySelectorAll('[data-gallery-year]');
const galleryCount = document.querySelector('[data-gallery-count]');
const uploadInput = document.querySelector('[data-photo-upload]');
const previewGrid = document.querySelector('[data-preview-grid]');
const previewHeading = document.querySelector('[data-preview-heading]');
let activeGalleryYear = 'all';

function updateGalleryFilters() {
  let visibleCount = 0;
  photoCards.forEach((card) => {
    const yearMatch = activeGalleryYear === 'all' || card.dataset.year === activeGalleryYear;
    card.classList.toggle('is-hidden', !yearMatch);
    if (yearMatch) visibleCount += 1;
  });
  if (galleryCount) galleryCount.textContent = String(visibleCount);
}

yearButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeGalleryYear = button.dataset.galleryYear;
    yearButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    updateGalleryFilters();
  });
});

updateGalleryFilters();

if (uploadInput && previewGrid) {
  uploadInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    previewGrid.innerHTML = '';
    if (!files.length) {
      if (previewHeading) previewHeading.hidden = true;
      return;
    }
    if (previewHeading) previewHeading.hidden = false;
    files.slice(0, 12).forEach((file) => {
      const url = URL.createObjectURL(file);
      const item = document.createElement('div');
      item.className = 'preview-item';
      const image = document.createElement('img');
      image.src = url;
      image.alt = file.name.replace(/[-_]/g, ' ');
      image.onload = () => URL.revokeObjectURL(url);
      item.appendChild(image);
      previewGrid.appendChild(item);
    });
  });
}
