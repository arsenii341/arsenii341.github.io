(() => {
  const loader = document.querySelector('#site-loader');
  const view = document.querySelector('#site-view');
  const percent = loader.querySelector('.loader-percent');
  const fill = loader.querySelector('.loader-fill');
  const startedAt = performance.now();
  const minimumDuration = 1000;
  const completed = new Set();
  const weights = { character: 20, type: 10, page: 25, pageType: 10, media: 35 };
  let finished = false;
  let frameChecked = false;
  let finishTimer;
  const cleanups = [];

  function dismiss() {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    clearTimeout(finishTimer);
    cleanups.forEach(cleanup => cleanup());
    loader.hidden = true;
    view.removeAttribute('aria-busy');
    view.contentWindow?.postMessage({ type: 'portfolio-initial-visible' }, location.origin);
    window.dispatchEvent(new Event('portfolio-initial-ready'));
  }
  function complete(task) {
    if (finished) return;
    completed.add(task);
    const progress = [...completed].reduce((sum, name) => sum + weights[name], 0);
    percent.textContent = `${progress}%`;
    loader.style.setProperty('--loader-progress', `${progress}%`);
    if (progress === 100 && !finishTimer) {
      const remaining = minimumDuration - (performance.now() - startedAt);
      finishTimer = setTimeout(dismiss, Math.max(300, remaining));
    }
  }
  // A slow or unavailable resource must never lock a visitor out of the site.
  const deadline = setTimeout(dismiss, 10000);
  view.setAttribute('aria-busy', 'true');
  if (fill.complete) complete('character');
  else {
    fill.addEventListener('load', () => complete('character'), { once: true });
    fill.addEventListener('error', dismiss, { once: true });
  }
  document.fonts.load('100 20px "Victor Mono"').then(() => complete('type'), dismiss);

  function inspectFrame() {
    if (finished || frameChecked) return;
    const doc = view.contentDocument;
    if (!doc || doc.location.href === 'about:blank') return;
    frameChecked = true;
    complete('page');
    doc.fonts.ready.then(() => complete('pageType'), dismiss);
    const video = doc.querySelector('#background');
    if (video?.error) { dismiss(); return; }
    if (!video || video.readyState >= 3) {
      complete('media');
      return;
    }
    const ready = () => complete('media');
    video.addEventListener('canplay', ready, { once: true });
    video.addEventListener('error', dismiss, { once: true });
    cleanups.push(() => {
      video.removeEventListener('canplay', ready);
      video.removeEventListener('error', dismiss);
    });
  }
  view.addEventListener('load', inspectFrame);
  cleanups.push(() => view.removeEventListener('load', inspectFrame));
})();
