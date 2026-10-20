const music = document.querySelector('.music');
const toggle = document.querySelector('.music-toggle');
const panel = document.querySelector('#music-panel');
const quickPlay = document.querySelector('.music-quick-play');
const miniPlayer = document.querySelector('.mini-player');
const miniReopen = document.querySelector('.mini-reopen');
const miniSeek = document.querySelector('.mini-seek');
const miniElapsed = document.querySelector('.mini-elapsed');
const miniDuration = document.querySelector('.mini-duration');
const tracks = [
  { title: 'Думай и богатей', artist: 'YASMI', id: '2411554623', url: 'https://soundcloud.com/yasmi-166296910/dumai-i-bogatei' },
  { title: 'Fall', artist: 'Vraell', id: '529178034', url: 'https://soundcloud.com/vraell/vraell-fall' },
  { title: 'Мотивы', artist: 'Ollane, Эндшпиль', id: '2342148719', url: 'https://soundcloud.com/just_musicsc/ollane-motivy-feat-endshpil' },
  { title: 'Космос', artist: 'Ёлка', id: '1150114993', url: 'https://soundcloud.com/velvetmusic/yolka-kosmos' },
  { title: 'О счастливчик', artist: 'Скриптонит, 104', id: '935021812', url: 'https://soundcloud.com/skryptonite36/o-schastlivchik-feat-104' },
];
const playButton = document.querySelector('.music-play');
const note = document.createElement('p');
const sourceLink = document.querySelector('.music-source');
const elapsed = document.querySelector('.music-elapsed');
const total = document.querySelector('.music-duration');
const seek = document.querySelector('.music-seek');
let duration = 0, scrubbing = false;
const engine = document.querySelector('.music-engine');
let widget = null, playing = false, ready = false, hasLoaded = false, generation = 0, loadTimer;
let pendingAutoplay = false, loadStartedAt = 0;
let playbackTimer, playbackRetries = 0, lastPlaybackPosition = 0, playbackStartPosition = 0;
const playbackFeedback = [panel, miniPlayer].map(container => {
  const box = document.createElement('div');
  box.className = 'music-feedback';
  box.hidden = true;
  box.setAttribute('role', 'status');
  const message = document.createElement('span');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Повторить';
  retry.addEventListener('click', () => { playbackRetries = 0; loadTrack(true); });
  const link = document.createElement('a');
  link.textContent = 'Открыть SoundCloud ↗';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  box.append(message, retry, link);
  container.append(box);
  return { box, message, link };
});
function clearPlaybackError() {
  playbackFeedback.forEach(({ box }) => { box.hidden = true; });
}
function showPlaybackError(message) {
  playbackFeedback.forEach(feedback => {
    feedback.message.textContent = message;
    feedback.link.href = tracks[selectedTrack].url;
    feedback.box.hidden = false;
  });
}
function startPlayback() {
  clearTimeout(playbackTimer);
  clearPlaybackError();
  const current = generation;
  playbackStartPosition = lastPlaybackPosition;
  panel.dataset.musicStage = 'starting';
  playbackTimer = setTimeout(() => {
    if (current !== generation || lastPlaybackPosition >= playbackStartPosition + 1000) return;
    if (playbackRetries++ === 0) {
      loadTrack(true);
      return;
    }
    widget?.pause();
    setPlaying(false);
    panel.dataset.musicStage = 'stalled';
    showPlaybackError('SoundCloud не запустил звук. Повторите запуск или проверьте трек в SoundCloud.');
  }, 12000);
  widget.play();
}
let sdkPromise;
const character = document.querySelector('.music-character');
const characterImage = character.querySelector('img');
const characterMotion = matchMedia('(prefers-reduced-motion: reduce)');
const poseImages = ['idle-putting-on-v2', 'down', 'up', 'side'].map(name => {
  const img = new Image();
  img.src = `/assets/music-character/${name}.png`;
  return img;
});
let poseTimer, introTimer, introVisible = false, poseStep = 0;
const poseSequence = [1, 2, 1, 3, 2, 3];
const noteSequence = [1, 3, 0, 2, 1, 2];
function showMusicPose(index) {
  const img = poseImages[index];
  characterImage.src = img.src;
  if (index === 0) character.removeAttribute('data-note-frame');
  else character.dataset.noteFrame = String(noteSequence[poseStep % noteSequence.length]);
}
function updateCharacter() {
  clearTimeout(poseTimer);
  character.hidden = panel.hidden;
  const active = playing && !panel.hidden && !document.hidden;
  character.classList.toggle('is-playing', active && !characterMotion.matches);
  if (introVisible && !panel.hidden) { showMusicPose(0); return; }
  if (!active || characterMotion.matches) { showMusicPose(active ? 1 : 0); return; }
  function nextPose() {
    showMusicPose(poseSequence[poseStep % poseSequence.length]);
    poseStep++;
    poseTimer = setTimeout(nextPose, 700 + Math.random() * 400);
  }
  nextPose();
}
characterMotion.addEventListener('change', updateCharacter);
document.addEventListener('visibilitychange', updateCharacter);
function sdk() {
  if (window.SC?.Widget) return Promise.resolve();
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    const timer = setTimeout(() => { script.remove(); sdkPromise = null; reject(new Error('timeout')); }, 30000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); sdkPromise = null; reject(new Error('network')); };
    document.head.append(script);
  });
  return sdkPromise;
}
function syncMusicState() {
  miniReopen.classList.toggle('is-playing', playing);
  document.querySelector('#site-view').contentWindow?.postMessage({
    type: 'portfolio-music-state', open: !panel.hidden, playing,
  }, location.origin);
}
function setPlaying(value) {
  playing = value;
  syncMusicState();
  if (value && introVisible) {
    clearTimeout(introTimer);
    introTimer = setTimeout(() => { introVisible = false; updateCharacter(); }, 900);
  }
  updateCharacter();
  playButton.setAttribute('aria-label', value ? 'Пауза' : 'Включить');
  quickPlay.setAttribute('aria-label', value ? 'Остановить музыку' : 'Включить музыку');
  quickPlay.setAttribute('aria-pressed', String(value));
  quickPlay.innerHTML = value
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h3v16H7zM14 4h3v16h-3z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4 20 12 8 20Z"/></svg>';
  playButton.innerHTML = value
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8Z"/></svg>';
}
function clock(ms) {
  const seconds = Math.floor((ms || 0) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
function resetTrackState() {
  clearTimeout(loadTimer);
  clearTimeout(playbackTimer);
  clearPlaybackError();
  lastPlaybackPosition = 0;
  ready = false;
  duration = 0;
  scrubbing = false;
  seek.disabled = true;
  seek.max = 0;
  miniSeek.disabled = true;
  miniSeek.max = 0;
  updatePosition(0);
  total.textContent = '—';
  miniDuration.textContent = '—';
  setPlaying(false);
}
function handleWidgetReady() {
  if (ready || !widget) return;
  clearTimeout(loadTimer);
  ready = true;
  playButton.disabled = false;
  panel.dataset.musicStage = playing ? 'playing' : 'ready';
  panel.dataset.musicLoadMs = String(Date.now() - loadStartedAt);
  note.textContent = playing ? 'Играет' : 'Готов к воспроизведению';
  const current = generation;
  widget.getDuration(ms => {
    if (!ready || current !== generation) return;
    duration = Number(ms) || 0;
    total.textContent = clock(duration);
    miniDuration.textContent = clock(duration);
    seek.max = duration;
    seek.disabled = duration <= 0;
    miniSeek.max = duration;
    miniSeek.disabled = duration <= 0;
  });
  if (pendingAutoplay) { pendingAutoplay = false; startPlayback(); }
}
async function loadTrack(autoplay = false) {
  hasLoaded = true;
  generation++;
  const current = generation;
  resetTrackState();
  pendingAutoplay = autoplay;
  loadStartedAt = Date.now();
  note.textContent = 'Загрузка SoundCloud…';
  playButton.disabled = false;
  panel.dataset.musicStage = 'loading';
  function fail() {
    if (current !== generation) return;
    clearTimeout(loadTimer);
    pendingAutoplay = false;
    panel.dataset.musicStage = 'slow';
    note.textContent = 'Не удалось загрузить. Попробуйте снова или откройте SoundCloud.';
    showPlaybackError('Не удалось подключиться к SoundCloud. Повторите запуск или откройте трек напрямую.');
  }
  loadTimer = setTimeout(() => {
    if (current !== generation || ready) return;
    panel.dataset.musicStage = 'slow';
    note.textContent = 'SoundCloud долго отвечает. Попробуйте включить ещё раз.';
    showPlaybackError('SoundCloud долго отвечает. Повторите запуск или откройте трек напрямую.');
  }, 18000);
  try {
    await sdk();
    if (current !== generation) return;
    const options = {
      auto_play: false, color: '#999999',
      buying: false, sharing: false, download: false, show_artwork: false, show_comments: false,
    };
    const trackUrl = 'https://api.soundcloud.com/tracks/' + tracks[selectedTrack].id;
    const reuse = Boolean(widget);
    let player = widget;
    if (reuse) {
      player.pause();
      Object.values(window.SC.Widget.Events).forEach(event => player.unbind(event));
    } else {
      const frame = document.createElement('iframe');
      frame.title = 'SoundCloud audio player';
      frame.allow = 'autoplay';
      frame.tabIndex = -1;
      frame.src = 'https://w.soundcloud.com/player/?' + new URLSearchParams({ url: trackUrl, ...options });
      engine.append(frame);
      player = window.SC.Widget(frame);
    }
    widget = player;
    const onReady = () => {
      if (current === generation) handleWidgetReady();
    };
    if (!reuse) player.bind(window.SC.Widget.Events.READY, onReady);
    player.bind(window.SC.Widget.Events.PLAY, () => {
      if (current !== generation || !ready) return;
      setPlaying(true); note.textContent = 'Играет';
      panel.dataset.musicStage = 'playing';
    });
    player.bind(window.SC.Widget.Events.PAUSE, () => {
      if (current !== generation) return;
      if (ready && panel.dataset.musicStage !== 'starting' && panel.dataset.musicStage !== 'stalled') {
        setPlaying(false); note.textContent = 'На паузе'; panel.dataset.musicStage = 'paused';
      }
    });
    player.bind(window.SC.Widget.Events.PLAY_PROGRESS, event => {
      if (current !== generation || !ready) return;
      if (Number(event.currentPosition) >= playbackStartPosition + 1000) {
        clearTimeout(playbackTimer);
        clearPlaybackError();
      }
      lastPlaybackPosition = Number(event.currentPosition) || 0;
      if (ready && !scrubbing) updatePosition(event.currentPosition);
    });
    player.bind(window.SC.Widget.Events.FINISH, () => {
      if (current !== generation) return;
      if (ready) selectTrack(selectedTrack + 1, true);
    });
    player.bind(window.SC.Widget.Events.ERROR, () => {
      if (current !== generation) return;
      clearTimeout(loadTimer);
      clearTimeout(playbackTimer);
      ready = false;
      setPlaying(false);
      note.textContent = 'Трек не играет. Откройте SoundCloud или выберите другой.';
      panel.dataset.musicStage = 'error';
      showPlaybackError('SoundCloud не может воспроизвести трек. Выберите другой или откройте SoundCloud.');
    });
    // Keep the same audio frame across songs and retries instead of resetting its browser permissions.
    if (reuse) player.load(trackUrl, { ...options, callback: onReady });
  } catch { fail(); }
}
function updatePosition(ms) {
  const position = Math.max(0, Math.min(Number(ms) || 0, duration));
  seek.value = position;
  seek.style.setProperty('--played', `${duration ? position / duration * 100 : 0}%`);
  miniSeek.value = position;
  miniSeek.style.setProperty('--played', `${duration ? position / duration * 100 : 0}%`);
  seek.setAttribute('aria-valuetext', `${clock(position)} из ${clock(duration)}`);
  miniSeek.setAttribute('aria-valuetext', `${clock(position)} из ${clock(duration)}`);
  elapsed.textContent = clock(position);
  miniElapsed.textContent = clock(position);
}
seek.addEventListener('input', () => {
  scrubbing = true;
  updatePosition(seek.value);
});
seek.addEventListener('change', () => {
  if (ready && widget && duration > 0) widget.seekTo(Number(seek.value));
  scrubbing = false;
});
seek.addEventListener('pointercancel', () => { scrubbing = false; });
seek.addEventListener('blur', () => { scrubbing = false; });
miniSeek.addEventListener('input', () => {
  scrubbing = true;
  updatePosition(miniSeek.value);
});
miniSeek.addEventListener('change', () => {
  if (ready && widget && duration > 0) widget.seekTo(Number(miniSeek.value));
  scrubbing = false;
});
miniSeek.addEventListener('pointercancel', () => { scrubbing = false; });
miniSeek.addEventListener('blur', () => { scrubbing = false; });
function togglePlayback() {
  playbackRetries = 0;
  if (!ready) {
    if (panel.dataset.musicStage === 'slow' || panel.dataset.musicStage === 'error' || !widget && panel.dataset.musicStage !== 'loading') loadTrack(true);
    else { pendingAutoplay = true; note.textContent = 'Ожидание SoundCloud…'; }
    return;
  }
  if (playing || panel.dataset.musicStage === 'starting') {
    clearTimeout(playbackTimer);
    pendingAutoplay = false;
    panel.dataset.musicStage = 'paused';
    widget.pause();
    setPlaying(false);
  } else { note.textContent = 'Запуск…'; startPlayback(); }
}
playButton.addEventListener('click', togglePlayback);
quickPlay.addEventListener('click', togglePlayback);
let selectedTrack = 0;
const list = document.querySelector('.music-track-list');
const trackButtons = tracks.map((track, index) => {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.className = 'music-track';
  const number = document.createElement('span');
  number.className = 'music-track-number';
  number.textContent = String(index + 1).padStart(2, '0');
  const text = document.createElement('span');
  text.className = 'music-track-text';
  const title = document.createElement('span');
  title.textContent = track.title;
  const artist = document.createElement('span');
  artist.className = 'music-track-artist';
  artist.textContent = track.artist;
  text.append(title, artist);
  button.append(number, text);
  button.addEventListener('click', () => selectTrack(index, true));
  item.append(button);
  list.append(item);
  return button;
});
function selectTrack(index, autoplay = false) {
  playbackRetries = 0;
  selectedTrack = (index + tracks.length) % tracks.length;
  const track = tracks[selectedTrack];
  sourceLink.href = track.url;
  sourceLink.setAttribute('aria-label', `${track.title} — ${track.artist} в SoundCloud`);
  updatePosition(0);
  total.textContent = '—';
  const titleElement = document.querySelector('.music-title');
  titleElement.textContent = track.title;
  titleElement.title = track.title;
  document.querySelector('.music-artist').textContent = track.artist;
  document.querySelector('.mini-title').textContent = track.title;
  document.querySelector('.mini-title').title = track.title;
  document.querySelector('.mini-artist').textContent = track.artist;
  trackButtons.forEach((button, i) => {
    if (i === selectedTrack) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  if (!panel.hidden || autoplay || hasLoaded) loadTrack(autoplay);
}
document.querySelector('.music-previous').addEventListener('click', () => selectTrack(selectedTrack - 1, playing));
document.querySelector('.music-next').addEventListener('click', () => selectTrack(selectedTrack + 1, playing));
document.querySelector('.mini-previous').addEventListener('click', () => selectTrack(selectedTrack - 1, playing));
document.querySelector('.mini-next').addEventListener('click', () => selectTrack(selectedTrack + 1, playing));
selectTrack(0);
function collapseMusicWidget() {
  if (!panel.hidden) setMusicOpen(false);
  miniPlayer.hidden = true;
  miniReopen.hidden = document.body.classList.contains('is-home');
}
function dismissMusicPanels() {
  if (!panel.hidden) setMusicOpen(false);
  if (!miniPlayer.hidden) collapseMusicWidget();
}
function setMusicOpen(open, restoreFocus = false) {
  music.classList.toggle('is-open', open);
  panel.hidden = !open;
  clearTimeout(introTimer);
  introVisible = open;
  poseStep = 0;
  updateCharacter();
  if (open && playing) {
    introTimer = setTimeout(() => { introVisible = false; updateCharacter(); }, 900);
  }
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', `${open ? 'Закрыть' : 'Открыть'} музыку`);
  syncMusicState();
  if (open && !ready && panel.dataset.musicStage !== 'loading') loadTrack();
  if (!open) {
    introVisible = false;
    showMusicPose(0);
  }
  if (restoreFocus) toggle.focus();
}
toggle.addEventListener('click', () => setMusicOpen(panel.hidden));
document.querySelector('.music-close').addEventListener('click', () => setMusicOpen(false, true));
document.querySelector('.mini-close').addEventListener('click', () => {
  miniPlayer.hidden = true;
  miniReopen.hidden = false;
});
miniReopen.addEventListener('click', () => {
  miniPlayer.hidden = false;
  miniReopen.hidden = true;
  quickPlay.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !panel.hidden) setMusicOpen(false, true);
});
document.addEventListener('pointerdown', event => {
  if (!music.contains(event.target)) dismissMusicPanels();
});
