document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('.slide')];
  const counter = carousel.querySelector('[data-counter]');
  let current = Math.max(0, Math.min(slides.length - 1, Number(carousel.dataset.start) || 0));
  let moving = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  async function show(next, animate = true) {
    if (moving) return;
    const target = (next + slides.length) % slides.length;
    if (target === current) return;
    const outgoing = slides[current], incoming = slides[target];
    const direction = next > current ? 1 : -1;
    moving = true;
    const image = incoming.querySelector('img');
    if (image) { image.loading = 'eager'; try { await image.decode(); } catch {} }
    incoming.hidden = false;
    if (animate && !reduced.matches) {
      const options = {duration:420,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'};
      const animations = [
        outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction * 100}%)`}],options),
        incoming.animate([{transform:`translateX(${direction * 100}%)`},{transform:'translateX(0)'}],options),
      ];
      await Promise.allSettled(animations.map(a=>a.finished));
      outgoing.hidden = true;
      animations.forEach(a=>a.cancel());
    } else outgoing.hidden = true;
    current = target;
    counter.textContent = `${current + 1} / ${slides.length}`;
    moving = false;
  }
  let gesture = null;
  const surface = carousel.querySelector('.slides');
  surface.querySelectorAll('img').forEach(image=>image.draggable=false);
  surface.addEventListener('dragstart',event=>event.preventDefault());
  surface.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    gesture = {id:event.pointerId,x:event.clientX,y:event.clientY};
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)*1.3) show(current + (dx < 0 ? 1 : -1));
  });
  surface.addEventListener('pointercancel',()=>gesture=null);
  carousel.querySelector('[data-prev]').addEventListener('click', () => show(current - 1));
  carousel.querySelector('[data-next]').addEventListener('click', () => show(current + 1));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  slides.forEach((slide,i)=>slide.hidden=i!==current);
  counter.textContent = `${current + 1} / ${slides.length}`;
});

// Muted inline video can autoplay on phones; pause only outside the viewport.
const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(({target,isIntersecting}) => {
    if (isIntersecting) target.play().catch(()=>{});
    else target.pause();
  });
}, {threshold:0.05});
document.querySelectorAll('video').forEach(video => {
  video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
  videoObserver.observe(video);
});
