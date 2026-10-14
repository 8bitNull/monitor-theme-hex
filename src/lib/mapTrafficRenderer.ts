import {AdditiveBlending,BufferGeometry,Color,Float32BufferAttribute,Mesh,OrthographicCamera,PlaneGeometry,Points,Scene,ShaderMaterial,SRGBColorSpace,WebGLRenderer} from 'three'
import {trafficPower} from './mapTraffic'

export type FlowRegion={code:string;x:number;y:number;tx:number;rx:number;available:boolean;online:boolean}
export type FlowFrame={width:number;height:number;regions:FlowRegion[];selected:string;upload:string;download:string}
export type TrafficRenderer={update:(frame:FlowFrame)=>void;dispose:()=>void}

const planeVertex='varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
const glowFragment=`uniform float time,up,down,chosen;uniform vec3 upload,download;varying vec2 uv0;
float ring(float r,float target,float width){return exp(-pow((r-target)/width,2.));}
void main(){float r=length(uv0-.5);float pu=fract(time*(.13+.28*up)),pd=fract(time*(.12+.25*down)+.45);
float u=ring(r,.10+pu*.28,.009)*(1.-pu)*up*.26;
float d=ring(r,.10+(1.-pd)*.28,.008)*pd*down*.23;
float aura=exp(-r*12.)*(up+down)*.055,edge=ring(r,.115,.005)*chosen*.20;
float alpha=u+d+aura+edge;
gl_FragColor=vec4((upload*(u+edge)+download*d+(upload+download)*aura*.5)/max(alpha,.0001),alpha);
#include <colorspace_fragment>
}`
const particleVertex=`attribute float angle,phase,lane,tail,index;uniform float time,up,down,pixelRatio;uniform vec3 upload,download;varying float strength;varying vec3 tint;
void main(){float p=lane<.5?up:down;float visibleCount=4.+p*37.;float progress=fract(phase+time*(.13+p*.6)-tail*.009);
float r=lane<.5?12.+progress*(22.+p*20.):12.+(1.-progress)*(22.+p*20.);
float a=angle+progress*.32;vec3 point=position+vec3(cos(a)*r,sin(a)*r,0.);
strength=(1.-tail*.22)*sin(progress*3.14159)*(.25+p*.7)*step(index,visibleCount)*step(.001,p);
tint=lane<.5?upload:download;gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.);gl_PointSize=(2.3+2.*p)*pixelRatio;}`
const particleFragment=`varying float strength;varying vec3 tint;
void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(tint,exp(-r*r*19.)*strength);
#include <colorspace_fragment>
}`

function particlesGeometry(){
 const values:{[key:string]:number[]}={position:[],angle:[],phase:[],lane:[],tail:[],index:[]}
 for(let lane=0;lane<2;lane++)for(let index=0;index<42;index++)for(let tail=0;tail<4;tail++){
  values.position.push(0,0,1);values.angle.push(index*2.39996+lane*.7);values.phase.push(index*.61803%1);values.lane.push(lane);values.tail.push(tail);values.index.push(index)
 }
 const geometry=new BufferGeometry()
 for(const [key,value] of Object.entries(values))geometry.setAttribute(key,new Float32BufferAttribute(value,key==='position'?3:1))
 return geometry
}

export function createMapTrafficRenderer(canvas:HTMLCanvasElement,onFailure:()=>void):TrafficRenderer{
 const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'})
 if(!context)throw new Error('WebGL unavailable')
 const renderer=new WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'})
 renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2))
 const scene=new Scene(),camera=new OrthographicCamera(0,1,1,0,.1,2000)
 camera.position.z=1000
 const plane=new PlaneGeometry(140,140),particles=particlesGeometry(),upload=new Color(),download=new Color()
 type Visual={glow:Mesh;points:Points;up:number;down:number;targetUp:number;targetDown:number}
 const visuals=new Map<string,Visual>()
 let frame:FlowFrame|null=null,disposed=false,failed=false,visible=false,request=0,previous=0,lastRender=0,elapsed=0,currentWidth=0,currentHeight=0
 const colorCanvas=document.createElement('canvas');colorCanvas.width=colorCanvas.height=1
 const colorContext=colorCanvas.getContext('2d')!
 const setColor=(target:Color,value:string)=>{
  colorContext.clearRect(0,0,1,1);colorContext.fillStyle=value;colorContext.fillRect(0,0,1,1)
  const data=colorContext.getImageData(0,0,1,1).data
  target.setRGB(data[0]/255,data[1]/255,data[2]/255,SRGBColorSpace)
 }
 function createVisual():Visual{
  const uniforms=()=>({time:{value:0},up:{value:0},down:{value:0},chosen:{value:0},upload:{value:upload},download:{value:download},pixelRatio:{value:renderer.getPixelRatio()}})
  const glow=new Mesh(plane,new ShaderMaterial({uniforms:uniforms(),vertexShader:planeVertex,fragmentShader:glowFragment,transparent:true,depthWrite:false}))
  const points=new Points(particles,new ShaderMaterial({uniforms:uniforms(),vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,blending:AdditiveBlending}))
  // The moving vertices extend beyond the base geometry's origin.
  points.frustumCulled=false
  scene.add(glow,points)
  return {glow,points,up:0,down:0,targetUp:0,targetDown:0}
 }
 function removeVisual(visual:Visual){scene.remove(visual.glow,visual.points);(visual.glow.material as ShaderMaterial).dispose();(visual.points.material as ShaderMaterial).dispose()}
 function fail(){if(failed||disposed)return;failed=true;cancelAnimationFrame(request);request=0;onFailure()}
 function draw(delta:number){
  if(disposed||failed||!frame)return
  const easing=1-Math.exp(-delta/.35)
  for(const visual of visuals.values()){
   visual.up+=(visual.targetUp-visual.up)*easing;visual.down+=(visual.targetDown-visual.down)*easing
   for(const material of [visual.glow.material,visual.points.material] as ShaderMaterial[]){material.uniforms.time.value=elapsed;material.uniforms.up.value=visual.up;material.uniforms.down.value=visual.down}
  }
  try{renderer.render(scene,camera)}catch{fail()}
 }
 function moving(){return [...visuals.values()].some(v=>v.points.visible&&(v.targetUp>0||v.targetDown>0||v.up>.0001||v.down>.0001))}
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
 const lost=(event:Event)=>{event.preventDefault();fail()}
 canvas.addEventListener('webglcontextlost',lost)
 return {
  update(next){
   if(disposed||failed)return
   frame=next
   if(next.width!==currentWidth||next.height!==currentHeight){
    currentWidth=next.width;currentHeight=next.height;renderer.setSize(next.width,next.height,false)
    camera.right=next.width;camera.top=next.height;camera.updateProjectionMatrix()
   }
   setColor(upload,next.upload);setColor(download,next.download)
   const codes=new Set(next.regions.map(r=>r.code))
   for(const [code,visual] of visuals)if(!codes.has(code)){removeVisual(visual);visuals.delete(code)}
   for(const region of next.regions){
    const visual=visuals.get(region.code)??createVisual();visuals.set(region.code,visual)
    visual.glow.position.set(region.x,next.height-region.y,0);visual.points.position.set(region.x,next.height-region.y,1)
    visual.targetUp=trafficPower(region.tx);visual.targetDown=trafficPower(region.rx)
    const enabled=region.online&&region.available
    visual.glow.visible=visual.points.visible=enabled
    if(!enabled){visual.up=visual.down=visual.targetUp=visual.targetDown=0}
    ;(visual.glow.material as ShaderMaterial).uniforms.chosen.value=next.selected===region.code?1:0
   }
   if(visible&&!document.hidden)draw(0)
   schedule()
  },
  dispose(){
   if(disposed)return;disposed=true;cancelAnimationFrame(request)
   intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost)
   for(const visual of visuals.values())removeVisual(visual)
   visuals.clear();plane.dispose();particles.dispose();renderer.dispose();renderer.forceContextLoss()
  },
 }
}
