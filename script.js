(() => {
  const video = document.querySelector('#background');
  if (!video) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'background-play';
  retry.textContent = 'Включить фоновое видео';
  retry.hidden = true;
  document.querySelector('.home').append(retry);
  let manualPlayback = false;
  let pending = false;

  async function updatePlayback() {
    if (document.hidden) { video.pause(); return; }
    if (reducedMotion.matches && !manualPlayback) {
      video.pause();
      retry.hidden = false;
      return;
    }
    if (pending || !video.paused) return;
    pending = true;
    // Set the property as well as the HTML attribute before each play attempt.
    video.muted = true;
    video.defaultMuted = true;
    try {
      await video.play();
      retry.hidden = true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        retry.hidden = false;
        console.warn('Background video could not start:', error.name);
      }
    } finally { pending = false; }
  }
  retry.addEventListener('click', () => {
    manualPlayback = true;
    updatePlayback();
  });
  video.addEventListener('canplay', updatePlayback);
  video.addEventListener('playing', () => { retry.hidden = true; });
  reducedMotion.addEventListener('change', () => {
    manualPlayback = false;
    updatePlayback();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  addEventListener('pageshow', updatePlayback);
  document.addEventListener('click', () => {
    if (!reducedMotion.matches && video.paused) updatePlayback();
  }, { capture: true });
  addEventListener('message', event => {
    if (event.origin === location.origin && event.source === parent &&
        event.data?.type === 'portfolio-initial-visible') updatePlayback();
  });
  updatePlayback();
})();
