(function () {
  const EW = 'assets/images/gallery/Energy%20Week/';
  const MX = 'assets/images/gallery/Marsol%20Expo/';
  const WF = 'assets/images/gallery/WUF13/';
  const JL = 'assets/images/gallery/John%20Locke/';

  const galleries = {
    'energy-week': {
      title: 'Azerbaijan Energy Week',
      photos: [
        EW + 'IMG-20260603-WA0029.jpg',
        EW + 'IMG-20260603-WA0064.jpg',
        EW + 'IMG-20260603-WA0115.jpg',
        EW + 'IMG-20260603-WA0117.jpg',
        EW + 'IMG-20260603-WA0130.jpg',
        EW + 'IMG-20260603-WA0136.jpg',
        EW + 'IMG-20260603-WA0145.jpg',
        EW + 'IMG-20260603-WA0147.jpg',
        EW + 'IMG-20260603-WA0183.jpg',
        EW + 'IMG-20260603-WA0244%281%29.jpg',
        EW + 'IMG-20260604-WA0012.jpg',
        EW + '20260603_101030.jpg',
        EW + 'Image11.png',
        EW + 'motion_photo_4258545104581702818.jpg',
      ],
    },
    'marsol-expo': {
      title: 'Local Companies Exhibition - Marsol Expo',
      photos: [
        MX + '20260617_101824.jpg',
        MX + '20260617_102537.jpg',
        MX + '20260617_102611.jpg',
        MX + '20260617_103542.jpg',
        MX + '20260617_112440.jpg',
        MX + 'IMG-20260617-WA0029.jpg',
        MX + 'IMG-20260617-WA0043.jpg',
        MX + 'IMG-20260617-WA0056.jpg',
        MX + 'IMG-20260617-WA0065.jpg',
        MX + 'IMG-20260617-WA0068.jpg',
        MX + 'IMG-20260617-WA0184.jpg',
        MX + 'IMG-20260617-WA0191.jpg',
        MX + 'IMG_20260617_133626_817.jpg',
        MX + 'IMG_20260617_133631_311.jpg',
      ],
    },
    'wuf13': {
      title: 'WUF13 — World Urban Forum',
      photos: [
        WF + '20260521_111932.jpg',
        WF + '20260521_121641.jpg',
        WF + '20260521_122946.jpg',
        WF + '20260521_133708.jpg',
        WF + 'IMG-20260521-WA0239.jpg',
        WF + 'IMG-20260521-WA0245.jpg',
        WF + 'IMG-20260521-WA0255.jpg',
        WF + 'IMG-20260521-WA0274.jpg',
        WF + 'IMG-20260521-WA0285.jpg',
        WF + 'IMG-20260521-WA0344.jpg',
        WF + 'IMG-20260522-WA0060.jpg',
        WF + 'IMG-20260522-WA0070.jpg',
        WF + 'IMG-20260522-WA0078.jpg',
        WF + 'IMG-20260522-WA0081.jpg',
        WF + 'IMG-20260522-WA0101.jpg',
        WF + 'IMG-20260522-WA0132.jpg',
        WF + 'IMG-20260522-WA0237.jpg',
        WF + 'IMG-20260522-WA0303.jpg',
        WF + 'IMG_20260521_112947.jpg',
        WF + 'IMG_20260521_121646.jpg',
        WF + 'IMG_20260521_133749.jpg',
        WF + 'IMG_20260521_151848.jpg',
        WF + 'IMG_20260521_202117_078.jpg',
        WF + 'IMG_20260521_202117_179.jpg',
      ],
    },
    'john-locke': {
      title: 'Baku Youth Ideas Lab',
      photos: [
        JL + 'johnlocke-01.jpeg',
        JL + 'johnlocke-02.jpeg',
        JL + 'johnlocke-03.jpeg',
        JL + 'johnlocke-04.jpeg',
        JL + 'johnlocke-05.jpeg',
        JL + 'johnlocke-06.jpeg',
        JL + 'johnlocke-07.jpeg',
        JL + 'johnlocke-08.jpeg',
        JL + 'johnlocke-09.jpeg',
        JL + 'johnlocke-10.jpeg',
        JL + 'johnlocke-11.jpeg',
        JL + 'johnlocke-12.jpeg',
        JL + 'johnlocke-13.jpeg',
        JL + 'johnlocke-14.jpeg',
        JL + 'johnlocke-15.jpeg',
        JL + 'johnlocke-16.jpeg',
        JL + 'johnlocke-17.jpeg',
        JL + 'johnlocke-18.jpeg',
        JL + 'johnlocke-19.jpeg',
        JL + 'johnlocke-20.jpeg',
        JL + 'johnlocke-21.jpeg',
        JL + 'johnlocke-22.jpeg',
        JL + 'johnlocke-23.jpeg',
        JL + 'johnlocke-24.jpeg',
        JL + 'johnlocke-25.jpeg',
        JL + 'johnlocke-26.jpeg',
        JL + 'johnlocke-27.jpeg',
        JL + 'johnlocke-28.jpeg',
        JL + 'johnlocke-29.jpeg',
        JL + 'johnlocke-30.jpeg',
        JL + 'johnlocke-31.jpeg',
        JL + 'johnlocke-32.jpeg',
        JL + 'johnlocke-33.jpeg',
        JL + 'johnlocke-34.jpeg',
        JL + 'johnlocke-35.jpeg',
        JL + 'johnlocke-36.jpeg',
        JL + 'johnlocke-37.jpeg',
        JL + 'johnlocke-38.jpeg',
      ],
    },
  };

  let currentGallery = null;
  let currentIndex = 0;
  let box, img, prevBtn, nextBtn, title, counter, dotsContainer;

  function build() {
    box = document.createElement('div');
    box.id = 'ycLightbox';
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo gallery');

    box.innerHTML = `
      <button class="lightbox-close" aria-label="Close gallery">&#x2715;</button>
      <button class="lightbox-prev" aria-label="Previous photo">&#x2039;</button>
      <button class="lightbox-next" aria-label="Next photo">&#x203A;</button>
      <div class="lightbox-stage">
        <img class="lightbox-img" src="" alt="" draggable="false" />
      </div>
      <div class="lightbox-dots"></div>
      <div class="lightbox-bar">
        <span class="lightbox-title"></span>
        <span class="lightbox-counter"></span>
      </div>
    `;

    document.body.appendChild(box);

    img         = box.querySelector('.lightbox-img');
    prevBtn     = box.querySelector('.lightbox-prev');
    nextBtn     = box.querySelector('.lightbox-next');
    title       = box.querySelector('.lightbox-title');
    counter     = box.querySelector('.lightbox-counter');
    dotsContainer = box.querySelector('.lightbox-dots');

    box.querySelector('.lightbox-close').addEventListener('click', close);
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () =>  navigate(1));

    box.addEventListener('click', (e) => {
      if (e.target === box || e.target.classList.contains('lightbox-stage')) close();
    });

    // touch swipe
    let startX = null;
    box.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  function open(galleryKey, startAt) {
    const data = galleries[galleryKey];
    if (!data) return;
    currentGallery = data;
    currentIndex = startAt || 0;
    buildDots();
    showPhoto(currentIndex);
    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox-close').focus();
  }

  function close() {
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    img.src = '';
  }

  function buildDots() {
    dotsContainer.innerHTML = '';
    currentGallery.photos.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'lightbox-dot' + (i === currentIndex ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Photo ' + (i + 1));
      dot.addEventListener('click', () => { currentIndex = i; showPhoto(i); });
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    dotsContainer.querySelectorAll('.lightbox-dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === currentIndex);
    });
  }

  function showPhoto(index) {
    const photos = currentGallery.photos;
    currentIndex = Math.max(0, Math.min(index, photos.length - 1));

    img.classList.add('is-loading');
    img.onload = () => img.classList.remove('is-loading');
    img.onerror = () => img.classList.remove('is-loading');
    img.src = photos[currentIndex];
    img.alt = currentGallery.title + ' — photo ' + (currentIndex + 1);

    title.textContent = currentGallery.title;
    counter.textContent = (currentIndex + 1) + ' / ' + photos.length;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === photos.length - 1;

    updateDots();

    // preload adjacent
    if (currentIndex + 1 < photos.length) new Image().src = photos[currentIndex + 1];
    if (currentIndex - 1 >= 0)            new Image().src = photos[currentIndex - 1];
  }

  function navigate(dir) {
    showPhoto(currentIndex + dir);
  }

  function onKey(e) {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   navigate(-1);
    if (e.key === 'ArrowRight')  navigate(1);
  }

  function triggerFromEvent(e) {
    const trigger = e.target.closest('[data-lightbox]');
    if (!trigger) return;
    // don't intercept real navigation links inside the card
    const link = e.target.closest('a[href]');
    if (link) return;
    e.preventDefault();
    open(trigger.dataset.lightbox, 0);
  }

  function init() {
    build();
    document.addEventListener('click', triggerFromEvent);
    document.addEventListener('keydown', (e) => {
      if (box.classList.contains('is-open')) { onKey(e); return; }
      if (e.key === 'Enter' || e.key === ' ') {
        const trigger = e.target.closest('[data-lightbox]');
        if (trigger) { e.preventDefault(); open(trigger.dataset.lightbox, 0); }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
