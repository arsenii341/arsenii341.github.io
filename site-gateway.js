(() => {
  const embedded = window.parent !== window;
  if (!embedded) {
    const route = location.pathname + location.search + location.hash;
    location.replace('/app/?route=' + encodeURIComponent(route));
    return;
  }

  document.documentElement.classList.add('site-embedded');

  const sendRoute = () => parent.postMessage({
    type: 'portfolio-route-replace',
    route: location.pathname + location.hash,
    title: document.title,
  }, location.origin);

  const sendMusicAnchor = () => {
    const button = document.querySelector('.home .music-toggle');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    parent.postMessage({
      type: 'portfolio-home-music-anchor',
      right: innerWidth - rect.right,
      top: rect.bottom + 12,
    }, location.origin);
  };

  const sendCollectionView = () => {
    if (!location.pathname.startsWith('/collection/')) return;
    const speech = document.querySelector('.speech');
    const open = document.body.classList.contains('viewing');
    const rect = speech?.getBoundingClientRect();
    parent.postMessage({ type: 'portfolio-collection-view', open,
      top: rect ? Math.min(innerHeight - 60, rect.bottom + 32) : innerHeight - 72,
      right: rect ? innerWidth - rect.right : 18,
    }, location.origin);
  };

  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Element && event.target.closest('.home .music-toggle')) return;
    parent.postMessage({ type: 'portfolio-background-pointerdown' }, location.origin);
  });

  document.addEventListener('click', event => {
    const homeMusicButton = event.target instanceof Element ? event.target.closest('.home .music-toggle') : null;
    if (homeMusicButton) {
      event.preventDefault();
      const rect = homeMusicButton.getBoundingClientRect();
      parent.postMessage({
        type: 'portfolio-home-music-toggle',
        right: innerWidth - rect.right,
        top: rect.bottom + 12,
      }, location.origin);
      return;
    }
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin) return;
    if (destination.pathname === location.pathname && destination.search === location.search &&
        destination.hash) return;
    event.preventDefault();
    parent.postMessage({
      type: 'portfolio-route-push',
      route: destination.pathname + destination.search + destination.hash,
    }, location.origin);
  }, true);

  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent ||
        event.data?.type !== 'portfolio-music-state') return;
    const homeMusicButton = document.querySelector('.home .music-toggle');
    if (homeMusicButton) {
      homeMusicButton.setAttribute('aria-expanded', String(event.data.open));
      homeMusicButton.classList.toggle('is-playing', event.data.playing && !event.data.open);
    }
  });

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    originalReplaceState(...args);
    sendRoute();
  };
  addEventListener('hashchange', sendRoute);
  addEventListener('resize', () => { sendMusicAnchor(); sendCollectionView(); });
  const sendFrameReady = () => {
    parent.postMessage({
      type: 'portfolio-frame-ready',
      title: document.title,
      route: location.pathname + location.search + location.hash,
      anchor: (() => {
        const button = document.querySelector('.home .music-toggle');
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { right: innerWidth - rect.right, top: rect.bottom + 12 };
      })(),
    }, location.origin);
    sendCollectionView();
  };
  addEventListener('pageshow', sendFrameReady);
  addEventListener('load', () => {
    sendMusicAnchor();
    new MutationObserver(sendCollectionView).observe(document.body, {attributes:true,attributeFilter:['class']});
    const speech = document.querySelector('.speech');
    if (speech) new ResizeObserver(sendCollectionView).observe(speech);
  });
})();
