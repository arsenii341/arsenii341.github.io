import * as T from '../vendor/three.module.js';
import {works} from './works.js?v=20261010-copy';
import {createAvatar} from './character-sprites.js?v=20260930-balanced';
const $=s=>document.querySelector(s), stage=$('#stage'), detail=$('#detail');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let current=-1,poseStep=0,paused=reduce.matches,lastFocus=null,scene,camera,renderer,avatar,frame=0,poseTimer=null,speechLayoutDirty=true;
let yaw=.35,pitch=.12,drag=null,hover=-1,previous=0;
const cards=[], ray=new T.Raycaster(),pointer=new T.Vector2(),destination=new T.Vector3();
// Use projected artwork bounds to fold the subtitle only when space is occupied.
const subtitle=$('.page-title p');
let subtitleWidth=0,lastSubtitleCheck=0;
function measureSubtitle(){
 subtitle.classList.remove('has-work-overlap');
 const range=document.createRange();range.selectNodeContents(subtitle);subtitleWidth=range.getBoundingClientRect().width;
}
function updateSubtitle(ms){
 if(current>=0||ms-lastSubtitleCheck<120)return;
 lastSubtitleCheck=ms;
 const rect=subtitle.getBoundingClientRect(),lineHeight=parseFloat(getComputedStyle(subtitle).lineHeight);
 const bounds={left:rect.left,top:rect.top,right:rect.left+subtitleWidth,bottom:rect.top+lineHeight};
 camera.updateMatrixWorld();
 const overlapping=bounds.right>innerWidth-20||cards.some(c=>{
  if(!c.mesh.visible)return false;
  c.mesh.updateMatrixWorld();
  const corners=[[-.46,-.615],[.46,-.615],[-.46,.615],[.46,.615]].map(([x,y])=>{
   const point=new T.Vector3(x,y,0).applyMatrix4(c.mesh.matrixWorld).project(camera);
   return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};
  });
  const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x));
  const top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
  return left<bounds.right+12&&right>bounds.left-12&&top<bounds.bottom+8&&bottom>bounds.top-8;
 });
 subtitle.classList.toggle('has-work-overlap',overlapping);
}
const backgroundNodes=[$('.topbar'),$('.page-title'),$('.bottom-bar'),$('#fallback')];
const poseNames=['neutral','presenting-balanced','explaining'];
const originalDetailScale=.88*1.1;
function setPose(index){
 poseStep=index%3;
 avatar?.pose(poseStep);
 $('#guide-image').src=`../assets/character-buzz/${poseNames[index%3]}.png`;
}
function positionGuide(){
 const guide=$('#guide-image');
 if(innerWidth<700){guide.removeAttribute('style');return}
 const foot=avatar.root.position.clone().project(camera);
 const depth=avatar.root.position.clone().applyMatrix4(camera.matrixWorldInverse);
 const pixels=innerHeight/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*(-depth.z));
 const height=3*avatar.root.scale.y*pixels;
 guide.style.width=`${2*avatar.root.scale.x*pixels}px`;
 guide.style.height=`${height}px`;
 guide.style.left=`${(foot.x+1)*innerWidth/2}px`;
 guide.style.top=`${(1-foot.y)*innerHeight/2+(innerWidth<700?0:height-3*originalDetailScale*pixels)}px`;
}
function changePose(){setPose((poseStep+1+Math.floor(Math.random()*2))%3)}
function stopPoses(){clearTimeout(poseTimer);poseTimer=null}
function startPoses(){
 stopPoses();
 if(current<0||reduce.matches||document.hidden)return;
 poseTimer=setTimeout(()=>{
  changePose();startPoses();
 },2400+Math.random()*3800);
}
document.addEventListener('visibilitychange',startPoses);
let workAnimation=null,workChange=0;
function cancelWorkAnimation(){
 workChange++;
 if(workAnimation){workAnimation.forEach(a=>a.cancel());workAnimation=null}
 const departing=detail.querySelector('.departing');departing?.querySelector('video')?.pause();departing?.remove();
}
function orbitFrames(from,to){
 const mobile=innerWidth<=700;
 const width=detail.querySelector(".artwork").getBoundingClientRect().width;
 // Equal angular spacing on one cylinder; endpoints clear the viewport.
 const radius=mobile?(innerWidth+width+80)/(2*Math.sin(65*Math.PI/180)):innerWidth*1.2;
 return Array.from({length:25},(_,n)=>{
  const angle=(from+(to-from)*n/24)*Math.PI/180;
  return {transform:`translate3d(${Math.sin(angle)*radius}px,0,${(Math.cos(angle)-1)*radius}px) rotateY(${angle*180/Math.PI}deg)`,offset:n/24};
 });
}
async function switchWork(direction){
 if(current<0||workAnimation)return;
 const next=(current+direction+works.length)%works.length;
 const change=++workChange;
 const image=new Image();image.src=works[next].image;
 try{await image.decode()}catch{}
 if(change!==workChange||current<0)return;
 if(reduce.matches){openWork(next);return}
 const artwork=detail.querySelector('.artwork');
 const outgoing=artwork.cloneNode(true);
 outgoing.classList.add('departing');outgoing.setAttribute('aria-hidden','true');
 outgoing.removeAttribute('id');outgoing.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
 const outgoingVideo=outgoing.querySelector('video'),playingVideo=$('#work-video');
 if(!playingVideo.hidden){outgoingVideo.currentTime=playingVideo.currentTime;outgoingVideo.muted=true;outgoingVideo.play().catch(()=>{})}
 artwork.before(outgoing);
 openWork(next);
 const mobile=innerWidth<=700;
 const options={duration:mobile?620:1000,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'};
 const arc=mobile?65:85;
 const leaving=outgoing.animate(orbitFrames(0,-direction*arc),options);
 const arriving=artwork.animate(orbitFrames(direction*arc,0),options);
 workAnimation=[leaving,arriving];
 await Promise.allSettled(workAnimation.map(a=>a.finished));
 outgoingVideo.pause();outgoing.remove();
 if(change===workChange){leaving.cancel();arriving.cancel();workAnimation=null}
}
function positionSpeechTail(){
 const tail=$('#speech-tail'),speech=$('.speech');
 if(current<0||!avatar)return;
 if(innerWidth<=700){
  const guide=$('#guide-image').getBoundingClientRect(),box=speech.getBoundingClientRect(),group=$('.speech-group').getBoundingClientRect();
  const y=guide.top+guide.height*.08;
  const base=Math.max(box.top+15,Math.min(y+12,box.bottom-15));
  tail.setAttribute('points',`${box.left-group.left+1},${base-group.top-9} ${box.left-group.left+1},${base-group.top+9} ${box.left-group.left-24},${base-group.top+Math.max(-10,Math.min(10,y-base))}`);
  return;
 }
 camera.updateMatrixWorld();
 const head=avatar.root.position.clone();
 // Keep the connector tip fixed while the displayed character grows.
 head.y+=2.98*originalDetailScale;
 head.project(camera);
 const x=(head.x+1)*innerWidth/2,y=(1-head.y)*innerHeight/2-8;
 speech.style.top=`${Math.max(76,Math.min(innerHeight*.22,y-speech.offsetHeight-28))}px`;
 const box=speech.getBoundingClientRect();
 const base=Math.max(box.left+24,Math.min(x+10,box.right-30));
 tail.setAttribute('points',`${base},${box.bottom-1} ${base+24},${box.bottom-1} ${x},${Math.max(box.bottom+12,y)}`);
}
function updateSpeech(){
 $('#speech-text').textContent=works[current].description;
 speechLayoutDirty=true;
}
function openWork(i){
 if(i<0||i>=works.length)return;
 const opening=current<0;
 if(opening)lastFocus=document.activeElement;
 current=i;changePose();const w=works[i];
 detail.querySelector('.artwork').style.setProperty('--media-scale',w.displayScale||1);
 const video=$('#work-video');video.pause();
 $('#work-image').hidden=!!w.video;video.hidden=!w.video;
 if(w.video){video.src=w.video;video.poster=w.image;video.setAttribute('aria-label',`${w.title} — ${w.category}`);video.muted=true;video.play().catch(()=>{})}
 else{video.removeAttribute('src');video.load()}
 $('#work-image').src=w.image;$('#work-image').alt=`${w.title} — ${w.category}`;$('#work-title').textContent=w.title;$('#work-number').textContent=`${w.id} / ${String(works.length).padStart(2,'0')}`;
 detail.hidden=false;document.body.classList.add('viewing');backgroundNodes.forEach(e=>e.inert=true);$('#hover-label').style.opacity=0;updateSpeech();if(opening)detail.focus({preventScroll:true});
 history.replaceState(null,'',`#${w.id}`);startPoses();
}
function closeWork(){
 cancelWorkAnimation();stopPoses();$('#work-video').pause();current=-1;detail.hidden=true;document.body.classList.remove('viewing');backgroundNodes.forEach(e=>e.inert=false);setPose(0);
 history.replaceState(null,'',location.pathname);(lastFocus?.isConnected?lastFocus:$('#spin')).focus();
}
$('#close').onclick=closeWork;
$('#previous-work').onclick=()=>switchWork(-1);$('#next-work').onclick=()=>switchWork(1);
function setPause(){ const button=$('#spin');button.querySelector('path').setAttribute('d',paused?'M8 5v14l11-7z':'M7 5h4v14H7zM14 5h4v14h-4z');button.setAttribute('aria-label',paused?'Включить вращение':'Остановить вращение');button.setAttribute('aria-pressed',String(paused)) }
$('#spin').onclick=()=>{paused=!paused;setPause()};reduce.addEventListener('change',()=>{paused=reduce.matches;setPause();startPoses()});setPause();
document.addEventListener('keydown',e=>{
 if(current>=0){
 if(e.key==='Escape'){closeWork();return}
 if(e.key==='ArrowLeft'){e.preventDefault();switchWork(-1)}
 if(e.key==='ArrowRight'){e.preventDefault();switchWork(1)}
 if(e.key==='Tab'){const buttons=[...detail.querySelectorAll('button')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }
});
function fallback(){
 document.body.classList.add('no-webgl');stage.hidden=true;const grid=$('#fallback');grid.hidden=false;
 $('#instruction').textContent='Выберите работу для просмотра';$('#spin').hidden=true;
 works.forEach((w,i)=>{const b=document.createElement('button'),im=document.createElement('img');im.src=w.image;im.alt=w.title;b.append(im,document.createTextNode(w.title));b.onclick=()=>openWork(i);grid.append(b)});
}
function resize(){
 measureSubtitle();speechLayoutDirty=true;const w=innerWidth,h=innerHeight;renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio,2));camera.aspect=w/h;camera.position.z=w<700?17.5:12.5;camera.updateProjectionMatrix();
}
function hit(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(cards.map(c=>c.mesh))[0]?.object.userData.index??-1}
try{
 renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setClearColor(0x080808,1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;stage.append(renderer.domElement);
 scene=new T.Scene();camera=new T.PerspectiveCamera(40,1,.1,70);camera.position.set(0,.15,12.5);camera.lookAt(0,.05,0);
 scene.add(new T.HemisphereLight(0xf7f5e7,0x404857,2.8));
 const key=new T.DirectionalLight(0xffead5,4);key.position.set(-3,5,7);scene.add(key);
 const rim=new T.DirectionalLight(0xb6c5e7,3);rim.position.set(3,2,-4);scene.add(rim);
 avatar=createAvatar();avatar.root.rotation.y=-.13;scene.add(avatar.root);
 const loader=new T.TextureLoader();
 // Equal-area points form a sphere; slight vertical compression keeps posters in view.
 works.forEach((w,i)=>{
 const y=1-2*(i+.5)/works.length,angle=i*Math.PI*(3-Math.sqrt(5));
 const base=new T.Vector3(Math.cos(angle)*Math.sqrt(1-y*y)*3.5,y*2.65,Math.sin(angle)*Math.sqrt(1-y*y)*3.5);
 const material=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,transparent:false,opacity:1});
 const mesh=new T.Mesh(new T.PlaneGeometry(.92,1.23),material);mesh.userData.index=i;scene.add(mesh);
 const card={mesh,base,ready:false};cards.push(card);
 loader.load(w.image,texture=>{texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());material.map=texture;material.needsUpdate=true;mesh.scale.set((texture.image.width/texture.image.height)/(.7466667)*(w.displayScale||1),w.displayScale||1,1);card.ready=true},undefined,()=>{card.ready=false;$('#instruction').textContent='Не все работы загрузились. Обновите страницу.'});
 });
 resize();addEventListener('resize',resize);
 stage.addEventListener('pointerdown',e=>{if(current>=0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};stage.setPointerCapture(e.pointerId)});
 stage.addEventListener('pointermove',e=>{
 if(current>=0)return;
 if(drag){const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.moved ||= Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6;if(drag.moved){yaw+=dx*.006;pitch=T.MathUtils.clamp(pitch+dy*.004,-.8,.8)}drag.lastX=e.clientX;drag.lastY=e.clientY;$('#hover-label').style.opacity=0}
 else{hover=hit(e);stage.style.cursor=hover>=0?'pointer':'grab';const label=$('#hover-label');label.textContent=hover>=0?works[hover].title:'';label.style.opacity=hover>=0?1:0;label.style.left=`${Math.min(e.clientX+15,innerWidth-190)}px`;label.style.top=`${e.clientY+20}px`}
 });
 stage.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(!moved){const i=hit(e);if(i>=0)openWork(i)}});
 stage.addEventListener('pointercancel',()=>drag=null);stage.addEventListener('pointerleave',()=>{$('#hover-label').style.opacity=0;hover=-1});
 $('#loading').hidden=true;
 function render(ms){
 frame=requestAnimationFrame(render);const dt=Math.min((ms-previous)/1000,.04);previous=ms;
 if(document.hidden)return;
 if(!paused&&!drag&&current<0)yaw+=dt*.12;
 const mobile=innerWidth<700,aspect=innerWidth/innerHeight;
 cards.forEach((c,i)=>{
 const v=c.base.clone();v.applyAxisAngle(new T.Vector3(0,1,0),yaw);v.applyAxisAngle(new T.Vector3(1,0,0),pitch);
 if(mobile)v.multiplyScalar(.79);
 c.mesh.position.copy(v);c.mesh.quaternion.copy(camera.quaternion);

 c.mesh.visible=c.ready&&current<0;
 });
 // Convert viewport proportions to the camera's world units so the guide sits beside the dialog.
 const halfH=Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.position.z;
 const x=mobile?-halfH*aspect*.61:halfH*aspect*.62;
 destination.set(x,mobile?-halfH*.66:-halfH*.58,1);
 avatar.root.position.copy(current>=0?destination:new T.Vector3(0,mobile?-1.26:-1.35,.65));
 const scale=mobile?(current>=0?.61:.9):(current>=0?.97:1);avatar.root.scale.setScalar(scale*1.1);
 avatar.root.rotation.y=-.13;
 
 
 avatar.root.visible=current<0;
 if(speechLayoutDirty){camera.updateMatrixWorld();if(current>=0)positionGuide();positionSpeechTail();speechLayoutDirty=false}
 updateSubtitle(ms);
 renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(render);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);fallback()});
}catch(error){console.warn('3D view unavailable',error);fallback()}
const initial=works.findIndex(w=>`#${w.id}`===location.hash);if(initial>=0)openWork(initial);
addEventListener('pagehide',()=>{$('#work-video').pause();cancelWorkAnimation();stopPoses();cancelAnimationFrame(frame);avatar?.dispose();renderer?.dispose()});

$('#work-image').draggable=false;
detail.addEventListener('dragstart',e=>e.preventDefault());
$('#guide-image').addEventListener('load',()=>speechLayoutDirty=true);
let detailGesture=null;
detail.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('button,a,video'))return;
 detailGesture={id:e.pointerId,x:e.clientX,y:e.clientY,background:!e.target.closest('.artwork img,.artwork video,.work-caption,.speech-group,#guide-image')};
 detail.setPointerCapture(e.pointerId);
});
detail.addEventListener('pointerup',e=>{
 if(!detailGesture||detailGesture.id!==e.pointerId)return;
 const dx=e.clientX-detailGesture.x,dy=e.clientY-detailGesture.y,background=detailGesture.background;detailGesture=null;
 if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3)switchWork(dx<0?1:-1);
 else if(background&&Math.hypot(dx,dy)<8&&!workAnimation)closeWork();
});
detail.addEventListener('pointercancel',()=>detailGesture=null);
