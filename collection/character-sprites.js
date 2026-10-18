import * as T from '../vendor/three.module.js';

// All three images share a canvas and baseline: poses switch without tweening.
export function createAvatar(){
 const root=new T.Group(),loader=new T.TextureLoader();
 const textures=[],ready=[];
 let requested=0;
 const material=new T.SpriteMaterial({transparent:true,depthWrite:false,toneMapped:false});
 const sprite=new T.Sprite(material);
 sprite.center.set(.5,0);
 sprite.scale.set(2,3,1);
 sprite.visible=false;
 root.add(sprite);
 function show(){
  const index=ready[requested]?requested:ready.findIndex(Boolean);
  if(index<0)return;
  material.map=textures[index];material.needsUpdate=true;sprite.visible=true;
 }
 ['neutral','presenting-balanced','explaining'].forEach((name,i)=>{
  textures[i]=loader.load(`../assets/character-buzz/${name}.png`,texture=>{
   texture.colorSpace=T.SRGBColorSpace;ready[i]=true;show();
  });
 });
 return {root,pose(index){requested=index%3;show()},dispose(){textures.forEach(t=>t.dispose());material.dispose()}};
}
