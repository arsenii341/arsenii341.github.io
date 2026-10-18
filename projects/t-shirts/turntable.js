(() => {
 const viewer=document.querySelector('.shirt-viewer');
 if(!viewer)return;
 const sets=[...viewer.querySelectorAll('.shirt-set')];
 const frames=sets.map(set=>[...set.querySelectorAll('.turntable-frame')]);
 const frameImages=frame=>[...frame.querySelectorAll('img')];
 const decodeFrame=frame=>Promise.all(frameImages(frame).map(image=>image.decode().catch(()=>{})));
 const stage=viewer.querySelector('.turntable-stage');
 const pause=viewer.querySelector('[data-turn-pause]');
 const front=viewer.querySelector('[data-turn-front]');
 const back=viewer.querySelector('[data-turn-back]');
 const name=viewer.querySelector('.shirt-name');
 const counter=viewer.querySelector('.shirt-counter');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let shirt=0,current=0,playing=!reduced.matches,timer=null,switching=false;
 function show(index){
  current=(index+frames[shirt].length)%frames[shirt].length;
  frames.forEach(group=>group.forEach((image,i)=>image.hidden=i!==current));
 }
 function markView(index){
  front.setAttribute('aria-pressed',String(index===0));
  back.setAttribute('aria-pressed',String(index===3));
 }
 function schedule(){
  clearTimeout(timer);
  pause.querySelector('path').setAttribute('d',playing?'M7 5h4v14H7zM14 5h4v14h-4z':'M8 5v14l11-7z');
  pause.setAttribute('aria-label',playing?'Остановить вращение':'Включить вращение');
  pause.setAttribute('aria-pressed',String(!playing));
  if(playing)markView(null);
  if(playing&&!document.hidden&&!switching)timer=setTimeout(()=>{show(current+1);schedule()},450);
 }
 async function changeShirt(direction){
  if(switching||sets.length<2)return;
  switching=true;schedule();
  const next=(shirt+direction+sets.length)%sets.length;
  const outgoing=sets[shirt],incoming=sets[next];
  await decodeFrame(frames[next][current]);
  if(frameImages(frames[next][current]).some(image=>!image.naturalWidth)){switching=false;schedule();return}
  incoming.hidden=false;
  if(!reduced.matches){
   const options={duration:420,easing:'cubic-bezier(.22,.61,.36,1)'};
   const animations=[outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*110}%)`}],options),incoming.animate([{transform:`translateX(${direction*110}%)`},{transform:'translateX(0)'}],options)];
   await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
  }
  outgoing.hidden=true;shirt=next;
  name.textContent=incoming.dataset.shirtName;name.title=name.textContent;
  counter.textContent=`${String(shirt+1).padStart(2,'0')} / ${String(sets.length).padStart(2,'0')}`;
  counter.setAttribute('aria-label',`Футболка ${shirt+1} из ${sets.length}`);
  switching=false;show(current);playing=true;schedule();
 }
 viewer.querySelector('[data-shirt-prev]').addEventListener('click',()=>changeShirt(-1));
 viewer.querySelector('[data-shirt-next]').addEventListener('click',()=>changeShirt(1));
 pause.addEventListener('click',()=>{playing=!playing;schedule()});
 function select(index){if(switching)return;playing=false;show(index);markView(index);schedule()}
 front.addEventListener('click',()=>select(0));
 back.addEventListener('click',()=>select(3));
 let gesture=null;
 stage.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;gesture={x:event.clientX,y:event.clientY,id:event.pointerId};stage.setPointerCapture(event.pointerId)});
 stage.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3)changeShirt(dx<0?1:-1)});
 stage.addEventListener('pointercancel',()=>gesture=null);
 stage.addEventListener('dragstart',event=>event.preventDefault());
 document.addEventListener('visibilitychange',schedule);
 addEventListener('pagehide',()=>clearTimeout(timer));
 markView(null);show(0);schedule();
 Promise.all(frames.flat().map(decodeFrame));
})();
