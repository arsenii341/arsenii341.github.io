(() => {
  // Retain decoded images in the shell while its page iframe changes routes.
  const images = new Map();
  let started = false;
  async function warmImage(url) {
    if (images.has(url)) return;
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    images.set(url, image);
    image.src = url;
    try { await image.decode(); }
    catch { images.delete(url); }
  }
  async function queue(urls) {
    let next = 0;
    async function worker() {
      while (next < urls.length) await warmImage(urls[next++]);
    }
    await Promise.all([worker(), worker(), worker()]);
  }
  async function warmCollection() {
    const { works } = await import('/collection/works.js?v=20261010-copy');
    const urls = works.map(work => new URL(work.image, location.origin + '/collection/').href);
    urls.push(...['neutral', 'presenting-balanced', 'explaining'].map(name =>
      new URL(`/assets/character-buzz/${name}.png`, location.origin).href));
    await queue(urls);
  }
  async function warmProjectPreviews() {
    const response = await fetch('/projects/', { priority: 'low' });
    if (!response.ok) return;
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const urls = [...doc.querySelectorAll('.preview-cloud img')].map(img =>
      new URL(img.getAttribute('src'), location.origin + '/projects/').href);
    await queue([...new Set(urls)]);
  }
  function warmCode() {
    const urls = ['/collection/', '/collection/collection.css?v=20261009-ru',
      '/collection/collection.js?v=20261009-ru',
      '/collection/character-sprites.js?v=20260930-balanced',
      '/vendor/three.module.js', '/vendor/three.core.js'];
    return Promise.allSettled(urls.map(url => fetch(url, { priority: 'low' }).then(response => {
      if (response.ok) return response.arrayBuffer();
    })));
  }
  async function start() {
    if (started) return;
    started = true;
    // Collection first; project previews follow. Do not download all project videos.
    await Promise.allSettled([warmCollection(), warmCode()]);
    await warmProjectPreviews().catch(() => {});
  }
  addEventListener('portfolio-initial-ready', start, { once: true });
  if (document.querySelector('#site-loader').hidden) start();
})();
