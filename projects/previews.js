(() => {
  const links = [...document.querySelectorAll('.project-list a')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (min-width: 701px)');
  let active = null;
  let timer = null;
  let index = 0;
  const images = [...document.querySelectorAll('.preview-cloud img')];

  function sizePreviews() {
    const top = document.querySelector('.index h1').getBoundingClientRect().top;
    const last = links[links.length - 1];
    const height = Math.max(0, last.getBoundingClientRect().bottom - 4 - top);
    const left = Math.max(...links.map(link => link.getBoundingClientRect().right)) + 16;
    const width = Math.max(0, innerWidth - Math.max(24, innerWidth * .05) - left);
    // Tall previews sit beside the widget; wider previews stay above it.
    const widgetLeft = innerWidth - 24 - 320;
    const widgetTop = innerHeight - 56 - 112;
    const center = (left + widgetLeft - 12) / 2;
    const loaded = images.filter(img => img.naturalWidth && img.naturalHeight);
    if (!loaded.length) return;
    const area = height * height * .8;
    document.documentElement.style.setProperty('--preview-top', `${top}px`);
    document.documentElement.style.setProperty('--preview-left', `${left}px`);
    document.documentElement.style.setProperty('--preview-height', `${height}px`);
    document.documentElement.style.setProperty('--preview-stage-width', `${width}px`);
    function dimensions(img) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const imageHeight = Math.min(height, Math.sqrt(area / ratio));
      const imageWidth = imageHeight * ratio;
      const limit = top + imageHeight > widgetTop - 20
        ? Math.min(width, Math.max(0, widgetLeft - 12 - left)) : width;
      const scale = Math.min(1, limit / imageWidth);
      return { width: imageWidth * scale, height: imageHeight * scale };
    }
    // Use the same width as IDEM's horizontal slides for every VAZ spread.
    const idemHorizontal = loaded.find(img => img.getAttribute('src').includes('/idem/02.webp'));
    const vazWidth = idemHorizontal ? dimensions(idemHorizontal).width : null;
    loaded.forEach(img => {
      const size = dimensions(img);
      if (vazWidth !== null && img.getAttribute('src').includes('/vaz-2103/')) {
        size.width = vazWidth;
        size.height = vazWidth * img.naturalHeight / img.naturalWidth;
      }
      img.style.setProperty('--preview-width', `${size.width}px`);
      img.style.setProperty('--preview-height', `${size.height}px`);
      img.style.setProperty('--preview-offset', `${Math.max(0, center - left - size.width / 2)}px`);
    });
  }

  images.forEach(img => img.addEventListener('load', sizePreviews));
  window.addEventListener('resize', sizePreviews);
  new ResizeObserver(sizePreviews).observe(document.querySelector('.project-list'));
  document.fonts.ready.then(sizePreviews);
  sizePreviews();

  function stop() {
    clearInterval(timer);
    timer = null;
    if (active) {
      active.nextElementSibling.classList.remove('is-visible');
      active.nextElementSibling.querySelectorAll('img').forEach(img => img.classList.remove('is-current'));
    }
    active = null;
  }

  function run() {
    clearInterval(timer);
    timer = null;
    if (!active || document.hidden || motion.matches) return;
    const images = [...active.nextElementSibling.querySelectorAll('img')];
    if (images.length < 2) return;
    timer = setInterval(() => {
      const next = (index + 1) % images.length;
      // Keep the current image until the next asset has finished loading.
      if (!images[next].complete || !images[next].naturalWidth) return;
      images[index].classList.remove('is-current');
      index = next;
      images[index].classList.add('is-current');
    }, 600);
  }

  function start(link) {
    if (!hover.matches || active === link) return;
    stop();
    active = link;
    sizePreviews();
    index = 0;
    const cloud = link.nextElementSibling;
    cloud.querySelector('img').classList.add('is-current');
    cloud.classList.add('is-visible');
    run();
  }

  function leave(link) {
    if (active === link && !link.matches(':hover') && document.activeElement !== link) stop();
  }

  links.forEach(link => {
    link.addEventListener('pointerenter', () => start(link));
    link.addEventListener('pointerleave', () => leave(link));
    link.addEventListener('focus', () => start(link));
    link.addEventListener('blur', () => leave(link));
  });
  document.addEventListener('visibilitychange', run);
  motion.addEventListener('change', run);
  hover.addEventListener('change', () => { if (!hover.matches) stop(); });
  window.addEventListener('pagehide', stop);
})();
