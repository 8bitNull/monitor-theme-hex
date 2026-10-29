import {BufferGeometry,CircleGeometry,Color,DoubleSide,Float32BufferAttribute,Group,InstancedBufferAttribute,InstancedMesh,LineBasicMaterial,LineSegments,Matrix4,Mesh,MeshBasicMaterial,OrthographicCamera,PlaneGeometry,Points,QuadraticBezierCurve3,Scene,ShaderMaterial,ShapeGeometry,SRGBColorSpace,Vector3,WebGLRenderer} from 'three'
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js'
import {hexes,radius,land as landPath,graticule} from '../data/map-flat.json'
import {trafficPower} from './worldMapModel'
import type {MapLayer,MapTheme,MapView,ProjectedMapNode,ResolvedMapConnection} from './worldMapModel'

export type HexMapFrame={layer?:MapLayer;width:number;height:number;view:MapView;nodes:ProjectedMapNode[];connections:ResolvedMapConnection[];selected?:string;theme:MapTheme;maxPixelRatio?:number;overview?:boolean}
export type HexMapRenderer={update:(frame:HexMapFrame)=>void;dispose:()=>void}
export const mapColors={
  dark:{sea:'#111c28',land:'#243647',accent:'#91afe0',online:'#4ade80',warning:'#d6a35d',offline:'#637386',danger:'#e68e9a',unknown:'#8796a8'},
 light:{sea:'#f3f6fa',land:'#ccd7e3',accent:'#557cb5',online:'#229966',warning:'#aa741d',offline:'#96a2af',danger:'#b83e50',unknown:'#8796a8'},
}
const overviewColors={sea:'#172538',land:'#314965',accent:'#afc9ee',online:'#8bcab5',warning:'#e0be85',offline:'#8a9bb1',danger:'#e68e9a',unknown:'#8796a8'}
const planeVertex='varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
const pulseFragment=`uniform float time,enabled,up,down,chosen,traffic,probe;uniform vec3 color;varying vec2 uv0;
float ring(float r,float target,float width){return exp(-pow((r-target)/width,2.));}
void main(){float r=length(uv0-.5);float p=fract(time*(.24+.12*(up+down)));
float a=ring(r,.075+p*.24,.007)*(1.-p)*.36;
float q=fract(p+.5);a+=ring(r,.075+q*.24,.007)*(1.-q)*.24;
a=enabled*a*mix(.32,1.,traffic)+ring(r,.08,.008)*chosen*.45;
a+=probe*(ring(r,.13,.009)*.24+ring(r,.185,.007)*enabled*.12);
gl_FragColor=vec4(color,a);
#include <colorspace_fragment>
}`
const trafficVertex=`attribute float phase,angle,lane;uniform float time,up,down,pixelRatio;uniform vec3 upload,download;varying float opacity;varying vec3 tint;
void main(){float power=lane<.5?up:down;float p=fract(phase+time*(.12+power*.5));
float r=7.+(lane<.5?p:1.-p)*(9.+power*11.);float a=angle+p*.12;
vec3 pos=position+vec3(cos(a)*r,sin(a)*r,0.);opacity=sin(p*3.14159)*sqrt(power)*.8;
tint=lane<.5?upload:download;gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);gl_PointSize=(1.8+power*.8)*pixelRatio;}`
const pointFragment=`varying float opacity;varying vec3 tint;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(tint,exp(-r*r*18.)*opacity);
#include <colorspace_fragment>
}`
const flightVertex=`uniform float pixelRatio;attribute float strength;uniform vec3 color;varying float opacity;varying vec3 tint;
void main(){opacity=strength;tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=(2.+strength*2.)*pixelRatio;}`

/** Standard Three.js renderer. All coordinates are CSS pixels; view maps the 1000-unit atlas. */
export function createHexMapRenderer(canvas:HTMLCanvasElement,onFailure:()=>void):HexMapRenderer{
 const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power'})
 if(!context)throw new Error('WebGL2 unavailable')
 const renderer=new WebGLRenderer({canvas,context,antialias:true,powerPreference:'low-power'})
 renderer.outputColorSpace=SRGBColorSpace
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2))
 const scene=new Scene(),camera=new OrthographicCamera(0,1,1,0,.1,2000)
 camera.position.z=1000
 const landGeometry=new CircleGeometry(radius*.84,6)
 const signal=new Float32Array(hexes.length),targetSignal=new Float32Array(hexes.length),signalPhase=new Float32Array(hexes.length)
 const landColors=hexes.map(()=>new Color('#243647')),targetColors=landColors.map(color=>color.clone())
 hexes.forEach(([x,y],i)=>{signalPhase[i]=Number(x)*.045+Number(y)*.07})
 landGeometry.setAttribute('regionalSignal',new InstancedBufferAttribute(signal,1))
 landGeometry.setAttribute('signalPhase',new InstancedBufferAttribute(signalPhase,1))
 const landMaterial=new ShaderMaterial({side:DoubleSide,uniforms:{time:{value:0},accent:{value:new Color()}},vertexShader:`attribute float regionalSignal,signalPhase;varying vec3 tint;varying float power,phase;
void main(){tint=instanceColor;power=regionalSignal;phase=signalPhase;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float time;uniform vec3 accent;varying vec3 tint;varying float power,phase;
void main(){float wave=pow(.5+.5*sin(time*(.5+power*1.5)-phase),8.);gl_FragColor=vec4(mix(tint,accent,wave*power*.2),1.);
#include <colorspace_fragment>
}`})
 const land=new InstancedMesh(landGeometry,landMaterial,hexes.length),mapGroup=new Group()
 const matrix=new Matrix4(),baseColor=new Color(),accent=new Color(),online=new Color(),warning=new Color(),offline=new Color(),danger=new Color(),unknown=new Color()
 hexes.forEach(([x,y],i)=>{land.setMatrixAt(i,matrix.makeTranslation(Number(x),Number(y),0));land.setColorAt(i,new Color('#243647'))})
 const silhouette=new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${landPath}"/></svg>`)
 const foundationGeometry=new ShapeGeometry(silhouette.paths.flatMap(path=>SVGLoader.createShapes(path)))
 const foundationMaterial=new MeshBasicMaterial({side:DoubleSide}),foundation=new Mesh(foundationGeometry,foundationMaterial)
 foundation.position.z=-1
 function lineGeometry(path:string){
  const vertices:number[]=[]
  for(const ring of path.match(/M[^MZ]+Z?/g)??[]){
   const values=(ring.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)??[]).map(Number)
   for(let i=2;i<values.length;i+=2)vertices.push(values[i-2],values[i-1],.5,values[i],values[i+1],.5)
   if(ring.endsWith('Z'))vertices.push(values.at(-2)!,values.at(-1)!, .5,values[0],values[1],.5)
  }
  return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(vertices,3))
 }
 const coast=new LineSegments(lineGeometry(landPath),new LineBasicMaterial({transparent:true,opacity:.14,depthWrite:false}))
 const grid=new LineSegments(lineGeometry(graticule),new LineBasicMaterial({transparent:true,opacity:.065,depthWrite:false}))
 grid.position.z=-2
 land.instanceMatrix.needsUpdate=true;land.frustumCulled=false;mapGroup.add(foundation,land,coast,grid);scene.add(mapGroup)
 const haloGeometry=new PlaneGeometry(80,80),trafficGeometry=new BufferGeometry()
 const phase:number[]=[],angle:number[]=[],lane:number[]=[],position:number[]=[]
 for(let d=0;d<2;d++)for(let i=0;i<10;i++){phase.push(i*.61803%1);angle.push(i*2.39996);lane.push(d);position.push(0,0,2)}
 trafficGeometry.setAttribute('position',new Float32BufferAttribute(position,3))
 trafficGeometry.setAttribute('phase',new Float32BufferAttribute(phase,1))
 trafficGeometry.setAttribute('angle',new Float32BufferAttribute(angle,1))
 trafficGeometry.setAttribute('lane',new Float32BufferAttribute(lane,1))
 type NodeVisual={halo:Mesh<PlaneGeometry,ShaderMaterial>;particles:Points<BufferGeometry,ShaderMaterial>;up:number;down:number;targetUp:number;targetDown:number;enabled:number;targetEnabled:number;color:Color;targetColor:Color}
 type Flight={line:LineSegments<BufferGeometry,LineBasicMaterial>;particles:Points<BufferGeometry,ShaderMaterial>;curve:QuadraticBezierCurve3;connection:ResolvedMapConnection;seed:number}
 const nodes=new Map<string,NodeVisual>(),flights:Flight[]=[]
 let frame:HexMapFrame|null=null,disposed=false,failed=false,visible=false,request=0,lastRender=0,previous=0,elapsed=0,theme:MapTheme|null=null,flightsKey='',settling=false
 const weights={nodes:0,traffic:1,probe:0},targetWeights={...weights}
 function createNode():NodeVisual{
  const uniforms=()=>({time:{value:elapsed},enabled:{value:0},up:{value:0},down:{value:0},chosen:{value:0},traffic:{value:weights.traffic},probe:{value:weights.probe},color:{value:new Color()},upload:{value:accent},download:{value:online},pixelRatio:{value:renderer.getPixelRatio()}})
  const halo=new Mesh(haloGeometry,new ShaderMaterial({uniforms:uniforms(),vertexShader:planeVertex,fragmentShader:pulseFragment,transparent:true,depthWrite:false}))
  const particles=new Points(trafficGeometry,new ShaderMaterial({uniforms:uniforms(),vertexShader:trafficVertex,fragmentShader:pointFragment,transparent:true,depthWrite:false}))
  particles.frustumCulled=false;halo.frustumCulled=false;scene.add(halo,particles)
  return {halo,particles,up:0,down:0,targetUp:0,targetDown:0,enabled:0,targetEnabled:0,color:new Color(),targetColor:new Color()}
 }
 function removeNode(node:NodeVisual){scene.remove(node.halo,node.particles);node.halo.material.dispose();node.particles.material.dispose()}
 function clearFlights(){for(const flight of flights){scene.remove(flight.line,flight.particles);flight.line.geometry.dispose();flight.line.material.dispose();flight.particles.geometry.dispose();flight.particles.material.dispose()}flights.length=0}
 function wrap(point:Vector3){
  if(point.x<28)point.x+=944
  else if(point.x>972)point.x-=944
  return point
 }
 function screen(point:Vector3){
  const v=frame!.view;return new Vector3(point.x*v.k+v.x,frame!.height-point.y*v.k-v.y,point.z)
 }
 function buildFlights(){
  clearFlights()
  frame!.connections.forEach((connection,index)=>{
   const [x,y]=connection.start,[tx,ty]=connection.end,distance=Math.hypot(tx-x,ty-y)
   const curve=new QuadraticBezierCurve3(new Vector3(x,y,3),new Vector3((x+tx)/2,(y+ty)/2-Math.min(85,distance*.22),Math.min(50,distance*.1)),new Vector3(tx,ty,3))
   const vertices:number[]=[]
   let previous=wrap(curve.getPoint(0))
   for(let i=1;i<=100;i++){
    const point=wrap(curve.getPoint(i/100))
    if(Math.abs(point.x-previous.x)<472)vertices.push(...screen(previous).toArray(),...screen(point).toArray())
    previous=point
   }
   const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3))
   const line=new LineSegments(geometry,new LineBasicMaterial({color:accent,transparent:true,opacity:connection.loss!==null&&connection.loss>5?.2:.4,depthWrite:false}))
   const dots=new BufferGeometry();dots.setAttribute('position',new Float32BufferAttribute(new Float32Array(9*3),3));dots.setAttribute('strength',new Float32BufferAttribute([.85,.58,.34,.85,.58,.34,.85,.58,.34],1))
   const particles=new Points(dots,new ShaderMaterial({uniforms:{color:{value:accent},pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:flightVertex,fragmentShader:pointFragment,transparent:true,depthWrite:false}))
   particles.frustumCulled=false;particles.visible=connection.speed>0&&(connection.loss??0)<100
   scene.add(line,particles);flights.push({connection,curve,line,particles,seed:index*.17})
  })
 }
 function fail(){if(disposed||failed)return;failed=true;cancelAnimationFrame(request);request=0;onFailure()}
 function draw(delta:number){
  if(disposed||failed||!frame)return
  const easing=1-Math.exp(-delta/.35)
  settling=false
  function ease(value:number,target:number){
   const next=value+(target-value)*easing
   if(Math.abs(next-target)<.001)return target
   settling=true;return next
  }
  for(const layer of ['nodes','traffic','probe'] as const)weights[layer]=ease(weights[layer],targetWeights[layer])
  landMaterial.uniforms.time.value=elapsed
  let landChanged=false
  hexes.forEach((_,i)=>{
   const color=landColors[i],target=targetColors[i]
   if(Math.abs(signal[i]-targetSignal[i])>.00001||Math.abs(color.r-target.r)+Math.abs(color.g-target.g)+Math.abs(color.b-target.b)>.00001){
    signal[i]=ease(signal[i],targetSignal[i]);color.lerp(target,easing)
    if(Math.abs(color.r-target.r)+Math.abs(color.g-target.g)+Math.abs(color.b-target.b)<.00001)color.copy(target)
    else settling=true
    land.setColorAt(i,color);landChanged=true
   }
  })
  if(landChanged){land.instanceColor!.needsUpdate=true;landGeometry.getAttribute('regionalSignal').needsUpdate=true}
  for(const node of nodes.values()){
   node.up=ease(node.up,node.targetUp);node.down=ease(node.down,node.targetDown);node.enabled=ease(node.enabled,node.targetEnabled)
   node.color.lerp(node.targetColor,easing)
   if(Math.abs(node.color.r-node.targetColor.r)+Math.abs(node.color.g-node.targetColor.g)+Math.abs(node.color.b-node.targetColor.b)<.00001)node.color.copy(node.targetColor)
   else settling=true
   const uniforms=node.halo.material.uniforms
   uniforms.enabled.value=node.enabled;uniforms.traffic.value=weights.traffic;uniforms.probe.value=weights.probe;uniforms.color.value.copy(node.color)
   for(const material of [node.halo.material,node.particles.material]){material.uniforms.time.value=elapsed;material.uniforms.up.value=node.up*weights.traffic;material.uniforms.down.value=node.down*weights.traffic}
   node.particles.visible=(frame.layer??'traffic')==='traffic'&&node.up+node.down>0
  }
  for(const flight of flights){
   const positions=flight.particles.geometry.getAttribute('position')
   for(let i=0;i<9;i++){
    const progress=((elapsed*flight.connection.speed+flight.seed+Math.floor(i/3)/3-(i%3)*.007)%1+1)%1
    const point=screen(wrap(flight.curve.getPoint(progress)));positions.setXYZ(i,point.x,point.y,point.z+1)
   }
   positions.needsUpdate=true
  }
  try{renderer.render(scene,camera)}catch{fail()}
 }
 function moving(){return settling||[...nodes.values()].some(node=>node.enabled>0)||flights.some(f=>f.particles.visible)}
 function animate(now:number){
  request=0
  if(disposed||failed||!visible||document.hidden)return
  if(now-lastRender>=1000/30){const delta=previous?Math.min(.1,(now-previous)/1000):1/30;previous=now;lastRender=now;elapsed+=delta;draw(delta)}
  if(moving())request=requestAnimationFrame(animate)
 }
 function schedule(){if(!disposed&&!failed&&visible&&!document.hidden&&!request){previous=0;request=requestAnimationFrame(animate)}}
 function visibility(){if(document.hidden){cancelAnimationFrame(request);request=0}else schedule()}
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(request);request=0}else schedule()})
 intersection.observe(canvas);document.addEventListener('visibilitychange',visibility)
 const lost=(event:Event)=>{event.preventDefault();fail()};canvas.addEventListener('webglcontextlost',lost)
 return {
  update(next){
   if(disposed||failed||next.width<=0||next.height<=0)return
   const old=frame;frame=next
   const pixelRatio=Math.min(window.devicePixelRatio||1,next.maxPixelRatio??2)
   if(!old||next.width!==old.width||next.height!==old.height||renderer.getPixelRatio()!==pixelRatio){
    renderer.setPixelRatio(pixelRatio);renderer.setSize(next.width,next.height,false)
    camera.right=next.width;camera.top=next.height;camera.updateProjectionMatrix()
   }
   const colors=next.overview?overviewColors:mapColors[next.theme]
   coast.material.opacity=next.overview?.14:.28
   if(theme!==next.theme||old?.overview!==next.overview){theme=next.theme;renderer.setClearColor(colors.sea);baseColor.set(colors.land);accent.set(colors.accent);online.set(colors.online);warning.set(colors.warning);offline.set(colors.offline);danger.set(colors.danger);unknown.set(colors.unknown)
    foundationMaterial.color.copy(baseColor).lerp(new Color(colors.sea),.4);coast.material.color.copy(accent);grid.material.color.copy(accent);landMaterial.uniforms.accent.value.copy(accent)
   }
   mapGroup.position.set(next.view.x,next.height-next.view.y,0);mapGroup.scale.set(next.view.k,-next.view.k,1)
   const requested=next.layer??'traffic'
   for(const layer of ['nodes','traffic','probe'] as const)targetWeights[layer]=layer===requested?1:0
   const regions=new Map(next.nodes.map(node=>[node.id,node])),tint=new Color()
   function probeColor(node:ProjectedMapNode){
    if(!node.online)return offline
    if(!node.probeState||node.probeState==='unknown')return unknown
    if(node.probeState==='timeout'||node.probeState==='high')return danger
    return node.probeState==='slow'||node.probeState==='loss'?warning:accent
   }
   hexes.forEach(([x,y,code],i)=>{
    const node=regions.get(String(code)),known=node?.online&&node.probeState&&node.probeState!=='unknown'
    const power=node?.online?(requested==='traffic'?trafficPower((node.tx??0)+(node.rx??0)):requested==='nodes'?.12:known?(node.probeState==='healthy'?.16:.5):0):0
    const hash=Math.sin(Number(x)*12.9898+Number(y)*78.233)*43758.5453,variation=(hash-Math.floor(hash)-.5)*.012
    const strength=node?(requested==='probe'?(known?(node.probeState==='healthy'?.12:.22):0):.09+(requested==='traffic'?power*.18:0)):0
    tint.copy(baseColor).lerp(requested==='probe'&&node?probeColor(node):accent,strength)
    if(node&&next.selected===node.id)tint.lerp(accent,.18)
    tint.offsetHSL(0,0,variation);targetColors[i].copy(tint);targetSignal[i]=power
    if(!old){landColors[i].copy(tint);signal[i]=power;land.setColorAt(i,tint)}
   })
   if(!old){land.instanceColor!.needsUpdate=true;landGeometry.getAttribute('regionalSignal').needsUpdate=true}
   const ids=new Set(next.nodes.map(node=>node.id))
   for(const [id,node] of nodes)if(!ids.has(id)){removeNode(node);nodes.delete(id)}
   for(const point of next.nodes){
    const existing=nodes.get(point.id),node=existing??createNode();nodes.set(point.id,node)
    node.halo.position.set(point.x,next.height-point.y,3);node.particles.position.copy(node.halo.position)
    const nearest=Math.min(Infinity,...next.nodes.filter(other=>other.id!==point.id).map(other=>Math.hypot(other.x-point.x,other.y-point.y)))
    const scale=Math.max(.5,Math.min(1,nearest/48));node.halo.scale.setScalar(scale);node.particles.scale.setScalar(scale)
    const uniforms=node.halo.material.uniforms
    node.targetColor.copy(requested==='probe'?probeColor(point):!point.online?offline:point.attention?warning:online)
    if(!existing)node.color.copy(node.targetColor)
    node.targetEnabled=point.online&&(requested!=='probe'||!!point.probeState&&point.probeState!=='unknown')?1:0
    if(!node.targetEnabled)node.enabled=0
    uniforms.chosen.value=next.selected===point.id?1:0
    node.targetUp=requested==='traffic'&&point.online?trafficPower(point.tx??0):0;node.targetDown=requested==='traffic'&&point.online?trafficPower(point.rx??0):0
    node.particles.material.uniforms.pixelRatio.value=pixelRatio
   }
   const key=JSON.stringify([next.connections,next.view,next.width,next.height,next.theme,pixelRatio])
   if(key!==flightsKey){flightsKey=key;buildFlights()}
   if(visible&&!document.hidden)draw(0)
   schedule()
  },
  dispose(){
   if(disposed)return;disposed=true;cancelAnimationFrame(request)
   intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost)
   for(const node of nodes.values())removeNode(node)
   nodes.clear();clearFlights();land.dispose();landGeometry.dispose();landMaterial.dispose();foundationGeometry.dispose();foundationMaterial.dispose();coast.geometry.dispose();coast.material.dispose();grid.geometry.dispose();grid.material.dispose();haloGeometry.dispose();trafficGeometry.dispose()
   renderer.dispose();renderer.forceContextLoss()
  },
 }
}
