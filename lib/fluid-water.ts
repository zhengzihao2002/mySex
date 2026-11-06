// One surface stays alive across navigation and recording. Opening the timer
// reuses the compiled program instead of creating a second graphics context.
const VERTEX = `attribute vec2 a_position;
void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAGMENT = `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
float hash(vec2 p){
  vec3 q=fract(vec3(p.xyx)*0.1031);
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
vec3 circle(vec2 p,vec2 center,float radius,float hue){
  vec2 d=(p-center)/radius;
  // Gaussian circles have no visible boundary or sharp center. The canvas
  // diffusion adds another layer of frost without deforming their round shape.
  float glow=exp(-dot(d,d)*1.8);
  vec3 blend=.5+.5*cos(6.2831853*(hue+vec3(0.,.333333,.666667)));
  blend*=blend;
  vec3 tint=(vec3(.24,.025,.105)*blend.x+vec3(.075,.035,.25)*blend.y+vec3(.025,.155,.18)*blend.z)/(blend.x+blend.y+blend.z);
  return tint*glow;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float aspect=u_resolution.x/u_resolution.y;
  vec2 p=(uv-.5)*vec2(aspect,1.);
  float t=u_time;
  vec3 color=vec3(.045,.018,.04);
  // Separate horizontal/vertical periods let each circle drift and reverse
  // independently. Aspect-correct distances keep circles round on every screen.
  color+=circle(p,vec2(.52*aspect*sin(t*.17+.4),.55*cos(t*.13+.7)),.34,t*.006+.94)*.85;
  color+=circle(p,vec2(.55*aspect*cos(t*.11+1.6),.53*sin(t*.19+2.3)),.28,t*.007+.60)*.75;
  color+=circle(p,vec2(.50*aspect*sin(t*.14+3.5),.56*cos(t*.09+4.1)),.37,t*.005+.29)*.70;
  color+=circle(p,vec2(.57*aspect*cos(t*.20+4.3),.51*sin(t*.12+.3)),.26,t*.008+.79)*.65;
  color+=circle(p,vec2(.54*aspect*sin(t*.08+2.4),.55*cos(t*.16+2.2)),.31,t*.006+.08)*.60;
  color+=(hash(gl_FragCoord.xy)-.5)*.003;
  gl_FragColor=vec4(color,1.);
}`;

function createSurface(canvas: HTMLCanvasElement) {
  const gl=(()=>{try{return canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});}catch{return null;}})();
  if(!gl)return null;
  const shaders:WebGLShader[]=[];
  let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;
  const dispose=()=>{if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));};
  try {
    for(const [type,source] of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]] as const){
      const shader=gl.createShader(type);if(!shader)throw new Error('Shader unavailable');
      shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Shader compilation failed');
    }
    program=gl.createProgram();if(!program)throw new Error('Program unavailable');
    shaders.forEach(shader=>gl.attachShader(program!,shader));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program linking failed');
    gl.useProgram(program);
    buffer=gl.createBuffer();if(!buffer)throw new Error('Buffer unavailable');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'a_position');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const resolution=gl.getUniformLocation(program,'u_resolution'),time=gl.getUniformLocation(program,'u_time');
    return {dispose,draw:(seconds:number)=>{gl.uniform1f(time,seconds);gl.drawArrays(gl.TRIANGLES,0,3);},fit:(width:number,height:number)=>{
      // Frosted diffusion doesn't need a high-DPI framebuffer. Cap the longest
      // side at 700px and render at 24fps to keep the ambient effect economical.
      const scale=Math.min(.75,700/Math.max(width,height));
      const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.uniform2f(resolution,w,h);
    }};
  }catch{dispose();return null;}
}

function createScene(){
  const hosts=new Map<HTMLElement,boolean>();
  const canvas=document.createElement('canvas');canvas.className='water-canvas';canvas.setAttribute('aria-hidden','true');
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let surface:ReturnType<typeof createSurface>=null,active:HTMLElement|null=null;
  let frame=0,initialization=0,last=0,lastDraw=0,elapsed=0,disposed=false,canAnimate=false;
  const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;};
  const blocked=()=>document.hidden||!!document.querySelector('dialog[open],[role="dialog"]');
  const tick=(now:number)=>{
    frame=0;if(disposed||!active||!surface||!canAnimate)return;
    if(last)elapsed+=Math.min(.1,(now-last)/1000);last=now;
    if(now-lastDraw>=1000/24){surface.draw(elapsed);lastDraw=now;}
    frame=requestAnimationFrame(tick);
  };
  const sync=()=>{
    if(!active||disposed)return;
    const paused=blocked(),reduced=preference.matches;
    canAnimate=!paused&&!reduced;
    active.dataset.waterState=paused?'paused':reduced?'still':'flowing';
    if(!canAnimate||!surface){stop();return;}
    if(!frame)frame=requestAnimationFrame(tick);
  };
  const fit=()=>{if(!disposed&&active&&surface){surface.fit(canvas.clientWidth,canvas.clientHeight);surface.draw(elapsed);}};
  const observer=new ResizeObserver(fit);
  const activate=()=>{
    const entries=[...hosts].filter(([host])=>host.isConnected);
    const next=entries.filter(([,contained])=>contained).at(-1)?.[0]??entries[0]?.[0]??null;
    if(next!==active){
      if(active){observer.unobserve(active);active.dataset.waterState='covered';delete active.dataset.waterRenderer;}
      active=next;
      if(active){active.appendChild(canvas);observer.observe(active);}
    }
    if(active){active.dataset.waterRenderer=surface?'webgl':'css';fit();}sync();
  };
  const initialize=()=>{if(disposed)return;surface=createSurface(canvas);activate();};
  initialization=requestAnimationFrame(initialize);
  const mutations=new MutationObserver(sync);
  mutations.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','data-state']});
  const preferenceChanged=()=>{fit();sync();};
  const lost=(event:Event)=>{event.preventDefault();surface=null;stop();if(active)active.dataset.waterRenderer='css';sync();};
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',initialize);
  document.addEventListener('visibilitychange',sync);preference.addEventListener('change',preferenceChanged);
  const destroy=()=>{
    disposed=true;stop();cancelAnimationFrame(initialization);observer.disconnect();mutations.disconnect();surface?.dispose();canvas.remove();
    canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',initialize);
    document.removeEventListener('visibilitychange',sync);preference.removeEventListener('change',preferenceChanged);
  };
  return {attach:(host:HTMLElement,contained:boolean)=>{
    hosts.set(host,contained);activate();
    return ()=>{if(!hosts.delete(host))return;activate();if(!hosts.size){destroy();shared=null;}};
  }};
}
let shared:ReturnType<typeof createScene>|null=null;
export function attachFluidWater(host:HTMLElement,contained:boolean){
  shared??=createScene();return shared.attach(host,contained);
}
