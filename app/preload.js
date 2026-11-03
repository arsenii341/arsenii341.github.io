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
  async function queue(urls, warm = warmImage) {
    let next = 0;
    async function worker() {
      while (next < urls.length) await warm(urls[next++]);
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
  async function warmShirts() {
    const response = await fetch('/projects/t-shirts/', { priority: 'low' });
    if (!response.ok) return;
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const base = new URL('/projects/t-shirts/', location.origin);
    const sets = [...doc.querySelectorAll('.shirt-set')];
    const frameUrls = frame => [...frame.querySelectorAll('img')].flatMap(img => {
      const urls = [img.getAttribute('src')];
      const mask = img.getAttribute('style')?.match(/(?:-webkit-)?mask-image:\s*url\(([^)]+)\)/);
      if (mask) urls.push(mask[1].replace(/["']/g, ''));
      return urls.filter(Boolean).map(url => new URL(url, base).href);
    });
    const frames = sets.flatMap(set => [...set.querySelectorAll('.turntable-frame')]);
    const first = [...sets[0].querySelectorAll('.turntable-frame')];
    const next = sets.slice(1).map(set => set.querySelector('.turntable-frame'));
    const download = async url => { try { const result = await fetch(url, { priority: 'low' }); if (result.ok) await result.blob(); } catch {} };
    await queue([...new Set(first.flatMap(frameUrls))]);
    await queue([...new Set(next.flatMap(frameUrls))], download);
    await queue([...new Set(frames.flatMap(frameUrls))], download);
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
    // Warm the shared shirt frames and first views while visitors browse.
    await Promise.allSettled([warmCollection(), warmCode(), warmShirts()]);
    await warmProjectPreviews().catch(() => {});
  }
  addEventListener('portfolio-initial-ready', start, { once: true });
  if (document.querySelector('#site-loader').hidden) start();
})();
