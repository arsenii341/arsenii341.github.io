import * as T from '../vendor/three.module.js';
// Articulated low-poly study. Dimensions describe the silhouette, not a body scan.
export function createAvatar(){
 const root=new T.Group(),body=new T.Group();root.add(body);
 const mat=color=>new T.MeshStandardMaterial({color,roughness:.94,flatShading:true,side:T.DoubleSide});
 const skin=mat('#b8896c'),skinLight=mat('#c99e7d'),beard=mat('#503e32'),hair=mat('#514538'),grey=mat('#797d7c'),hem=mat('#626766'),blue=mat('#355777'),blueDark=mat('#2d4862'),green=mat('#43573a'),capDark=mat('#2d3c29'),brown=mat('#624535'),sole=mat('#b7a88e'),white=mat('#e1d9c8'),iris=mat('#6a736b'),black=mat('#292d29');
 function add(parent,geo,m,x=0,y=0,z=0){const mesh=new T.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh}
 function box(p,m,x,y,z,w,h,d){return add(p,new T.BoxGeometry(w,h,d),m,x,y,z)}
 function ell(p,m,x,y,z,w,h,d,detail=1){const a=add(p,new T.IcosahedronGeometry(1,detail),m,x,y,z);a.scale.set(w,h,d);return a}
 // Horizontal polygon rings make flat cloth panels and controlled facial planes.
 function loft(p,m,rings,n=8){
 const v=[],idx=[];
 for(const [y,w,d,z=0,x=0] of rings)for(let j=0;j<n;j++){const a=j/n*Math.PI*2;v.push(x+Math.sin(a)*w,y,z+Math.cos(a)*d)}
 for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++){const a=r*n+j,b=r*n+(j+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d)}
 for(let j=1;j<n-1;j++){idx.push(0,j,j+1);const k=(rings.length-1)*n;idx.push(k,k+j+1,k+j)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return add(p,g,m);
 }
 // Long straight trousers, a small break at the ankle, narrow suede sneakers.
 for(const s of [-1,1]){
 const leg=new T.Group();leg.position.set(s*.18,0,0);leg.rotation.z=s*.025;body.add(leg);
 loft(leg,blue,[[.20,.13,.14],[.28,.16,.15],[.69,.145,.14,-.015],[1.10,.17,.17],[1.47,.19,.18]]);
 loft(leg,blueDark,[[.19,.14,.15],[.26,.15,.15]]);
 const shoe=loft(leg,brown,[[.07,.145,.27,.075],[.12,.15,.29,.08],[.21,.13,.23,.025],[.25,.10,.12,-.03]]);
 box(leg,sole,0,.057,.085,.285,.065,.52);
 for(let j=0;j<3;j++){const lace=box(leg,white,0,.215-j*.014,.12+j*.045,.14,.012,.019);lace.rotation.y=j%2?.17:-.17}
 }
 // Slim underlying frame with a loose, straight hoodie rather than a spherical torso.
 loft(body,grey,[[1.35,.315,.215],[1.48,.345,.23],[1.82,.34,.235],[2.12,.405,.22],[2.23,.31,.18],[2.26,.20,.14]],10);
 loft(body,hem,[[1.34,.317,.216],[1.42,.325,.22]],10);
 loft(body,hem,[[1.48,.22,.025,.225],[1.66,.25,.035,.23],[1.77,.16,.025,.235]],8);
 ell(body,grey,0,2.23,-.115,.26,.245,.22,1);
 loft(body,skin,[[2.20,.115,.11],[2.40,.115,.115]],8);
 for(const s of [-1,1]){box(body,white,s*.115,2.025,.226,.012,.23,.013);box(body,hem,s*.115,1.9,.226,.018,.035,.02)}
 const head=new T.Group();head.position.set(0,2.67,.015);body.add(head);
 // Narrow temples, defined cheekbones and a longer jaw; front faces toward +Z.
 loft(head,skin,[[ -.30,.105,.125,.015],[-.22,.178,.178],[ -.08,.207,.199],[.07,.215,.205],[.22,.206,.195,-.015],[.31,.157,.15,-.025],[.345,.07,.075,-.025]],10);
 for(const s of [-1,1]){ell(head,skinLight,s*.213,.003,-.003,.043,.081,.041);ell(head,skin,s*.236,.005,.024,.016,.048,.017)}
 // Beard follows cheek edges; the upper face remains uncovered.
 const bVerts=[[-.195,-.045,.115],[-.15,-.12,.183],[-.105,-.145,.205],[0,-.14,.224],[.105,-.145,.205],[.15,-.12,.183],[.195,-.045,.115],[-.172,-.245,.11],[-.09,-.335,.143],[0,-.352,.161],[.09,-.335,.143],[.172,-.245,.11]];
 const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(bVerts.flat(),3));bg.setIndex([0,7,1,1,7,8,1,8,2,2,8,9,2,9,3,3,9,4,4,9,10,4,10,5,5,10,11,5,11,6]);bg.computeVertexNormals();add(head,bg,beard);
 // Mouth sits within the beard; a wedge gives a readable profile to the nose.
 box(head,skin,0,-.175,.221,.107,.040,.022);box(head,beard,0,-.146,.229,.115,.022,.02);box(head,beard,0,-.192,.239,.071,.009,.006);
 const ng=new T.BufferGeometry();ng.setAttribute('position',new T.Float32BufferAttribute([-.035,.077,.197,.035,.077,.197,-.04,-.105,.222,.04,-.105,.222,0,-.083,.305,0,.085,.205],3));ng.setIndex([0,2,4,0,4,5,5,4,1,1,4,3,2,3,4]);ng.computeVertexNormals();add(head,ng,skinLight);
 for(const s of [-1,1]){
 const eye=ell(head,white,s*.092,.045,.193,.039,.018,.015);eye.rotation.y=s*.12;
 ell(head,iris,s*.087,.045,.206,.012,.014,.005);ell(head,black,s*.087,.045,.211,.005,.009,.003);
 const brow=box(head,hair,s*.097,.095,.196,.085,.02,.012);brow.rotation.z=-s*.10;
 }
 // Six broad cap panels and a flat, extended visor.
 loft(head,green,[[.205,.224,.219,-.015],[.31,.214,.215,-.02],[.40,.162,.162,-.035],[.445,.042,.045,-.04]],8);
 loft(head,capDark,[[.195,.226,.219,-.015],[.222,.227,.22,-.015]],10);
 const shape=new T.Shape();shape.moveTo(-.21,0);shape.lineTo(.21,0);shape.lineTo(.235,.13);shape.lineTo(.17,.26);shape.lineTo(0,.295);shape.lineTo(-.17,.26);shape.lineTo(-.235,.13);shape.closePath();
 const brim=add(head,new T.ExtrudeGeometry(shape,{depth:.017,bevelEnabled:false}),green,0,.205,.10);brim.rotation.x=Math.PI/2+.08;
 const arms=[];
 for(const s of [-1,1]){
 const arm=new T.Group();arm.position.set(s*.365,2.145,0);body.add(arm);
 loft(arm,grey,[[.04,.12,.14],[-.14,.16,.16],[-.42,.13,.14]],8);
 const elbow=new T.Group();elbow.position.set(0,-.41,0);arm.add(elbow);
 loft(elbow,grey,[[.025,.13,.14],[-.26,.115,.12],[-.43,.092,.095]],8);
 loft(elbow,hem,[[-.40,.094,.098],[-.46,.09,.092]],8);
 const hand=ell(elbow,skinLight,0,-.535,.005,.075,.105,.064);hand.rotation.z=s*.1;
 ell(elbow,skin,s*.059,-.5,.027,.028,.06,.033);
 arms.push({arm,elbow});
 }
 function pose(n){
 body.rotation.set(0,0,-.025);head.rotation.set(.045,-.09,.015);
 arms.forEach(({arm,elbow},i)=>{arm.rotation.set(-.08,0,i===0?-.075:.065);elbow.rotation.set(-.22,0,0)});
 if(n===1){arms[0].arm.rotation.set(.12,0,-.57);arms[0].elbow.rotation.x=-1.0;arms[1].elbow.rotation.x=-.4;head.rotation.y=-.22}
 if(n===2){arms[1].arm.rotation.z=.32;arms[1].elbow.rotation.x=-1.15;head.rotation.z=-.055;body.rotation.z=.015}
 if(n===3){arms[0].elbow.rotation.x=-.68;arms[1].elbow.rotation.x=-.6;head.rotation.x=.085;head.rotation.y=.1}
 }
 pose(0);root.position.y=-1.5;
 return {root,pose,head};
}
