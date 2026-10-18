const view = document.querySelector('#site-view');
const initialRoute = new URLSearchParams(location.search).get('route') || '/';
let pendingRoute = null;

function positionHomeMusic(data) {
  const top = Math.max(64, data.top) + 'px';
  const right = Math.max(8, data.right) + 'px';
  document.querySelector('#music-panel').style.top = top;
  document.querySelector('#music-panel').style.right = right;
  document.body.style.setProperty('--home-music-top', top);
  document.body.style.setProperty('--home-music-right', right);
}

function cleanRoute(route) {
  const url = new URL(route, location.origin);
  if (url.origin !== location.origin || url.pathname.startsWith('/app/')) return '/';
  url.searchParams.delete('embedded');
  return url.pathname + url.search + url.hash;
}

function embeddedRoute(route) {
  const url = new URL(cleanRoute(route), location.origin);
  url.searchParams.set('embedded', '1');
  return url.pathname + url.search + url.hash;
}

function showRoute(route, historyMode = 'push') {
  const target = cleanRoute(route);
  pendingRoute = target;
  if (historyMode === 'push') history.pushState({ portfolioRoute: target }, '', target);
  if (historyMode === 'replace') history.replaceState({ portfolioRoute: target }, '', target);
  // The shell owns navigation history; frame loads must not add extra Back steps.
  view.contentWindow.location.replace(embeddedRoute(target));
}

function activateRoute(data) {
  const target = cleanRoute(data.route);
  // Also reconcile pages restored directly by browser history / the back-forward cache.
  const expected = new URL(pendingRoute ?? cleanRoute(view.contentWindow.location.href), location.origin);
  const loaded = new URL(target, location.origin);
  if (expected.pathname !== loaded.pathname || expected.search !== loaded.search) return;
  if (target !== location.pathname + location.search + location.hash) {
    history.replaceState({ portfolioRoute: target }, '', target);
  }
  const pathname = new URL(target, location.origin).pathname;
  const home = pathname === '/' || pathname === '/index.html';
  document.body.classList.toggle('is-home', home);
  document.body.classList.toggle('is-collection', pathname.startsWith('/collection/'));
  document.body.classList.remove('collection-detail');
  if (!home && typeof window.setMusicOpen === 'function' &&
      !document.querySelector('#music-panel').hidden) window.setMusicOpen(false);
  if ((!home || matchMedia('(max-width:767px)').matches) && typeof window.collapseMusicWidget === 'function') window.collapseMusicWidget();
  if (data.anchor) positionHomeMusic(data.anchor);
  if (data.title) document.title = data.title;
  pendingRoute = null;
  if (typeof window.syncMusicState === 'function') window.syncMusicState();
}

showRoute(initialRoute, 'replace');

addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== view.contentWindow) return;
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;
  if (data.type === 'portfolio-frame-ready') {
    activateRoute(data);
    return;
  }
  if (pendingRoute !== null) return;
  if (data.type === 'portfolio-collection-view') {
    document.body.classList.toggle('collection-detail', data.open);
    document.body.style.setProperty('--collection-music-top', data.top + 'px');
    document.body.style.setProperty('--collection-music-right', data.right + 'px');
    if (data.open && matchMedia('(max-width:700px)').matches && !document.querySelector('#music-panel').hidden) window.setMusicOpen(false);
  } else if (data.type === 'portfolio-route-push') {
    showRoute(data.route, 'push');
  } else if (data.type === 'portfolio-home-music-anchor' && document.body.classList.contains('is-home')) {
    positionHomeMusic(data);
  } else if (data.type === 'portfolio-home-music-toggle' && document.body.classList.contains('is-home')) {
    positionHomeMusic(data);
    window.setMusicOpen(document.querySelector('#music-panel').hidden);
  } else if (data.type === 'portfolio-background-pointerdown') {
    if (typeof window.dismissMusicPanels === 'function') window.dismissMusicPanels();
  } else if (data.type === 'portfolio-route-replace') {
    const target = cleanRoute(data.route);
    if (location.pathname + location.search + location.hash !== target) {
      history.replaceState({ portfolioRoute: target }, '', target);
    }
    if (data.title) document.title = data.title;
  }
});

addEventListener('popstate', () => showRoute(location.pathname + location.search + location.hash, 'none'));
