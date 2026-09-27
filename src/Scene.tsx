import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { paintCard, clearImageCache } from './charts';
import type { Card, Project, Settings } from './model';

export interface SceneHandle { capture(): Promise<Blob>; canvas(): HTMLCanvasElement | undefined; }
interface Props { project: Project; playing: boolean; time: number; onTime(t:number): void; onDrag(pitch:number,yaw:number): void; }
interface Panel { canvas:HTMLCanvasElement; texture:THREE.CanvasTexture; backTexture:THREE.Texture; front:THREE.Mesh<THREE.CylinderGeometry,THREE.MeshStandardMaterial>; back:THREE.Mesh<THREE.CylinderGeometry,THREE.MeshStandardMaterial>; card:Card; }
export const Scene = forwardRef<SceneHandle,Props>(function Scene({project,playing,time,onTime,onDrag},ref){
 const host=useRef<HTMLDivElement>(null),render=useRef<THREE.WebGLRenderer | undefined>(undefined);
 const live=useRef({project,playing,onTime,onDrag});live.current={project,playing,onTime,onDrag};
 const clock=useRef(time), phase=useRef(0);useEffect(()=>{clock.current=time;phase.current=time*live.current.project.settings.speed;},[time]);
 const [error,setError]=useState('');const [ready,setReady]=useState(false);const [attempt,setAttempt]=useState(0);
 useImperativeHandle(ref,()=>({capture:()=>new Promise((resolve,reject)=>{if(!render.current){reject(new Error('预览尚未准备好。'));return;}render.current.domElement.toBlob(b=>b?resolve(b):reject(new Error('图片导出失败。')),'image/png');}),canvas:()=>render.current?.domElement}),[]);
 useEffect(()=>{
  if(!host.current)return;setError('');setReady(false);
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}catch{setError('三维预览无法启动。请使用支持 WebGL 的浏览器，并确认硬件加速可用。');return;}
  render.current=renderer;renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const container=host.current;container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','旋转环带三维预览，可拖拽调整角度');renderer.domElement.setAttribute('role','img');
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);camera.position.set(0,0,14);camera.lookAt(0,0,0);
  const group=new THREE.Group(),rig=new THREE.Group();scene.add(rig);rig.add(group);const ambient=new THREE.AmbientLight(0xffffff);scene.add(ambient);const key=new THREE.DirectionalLight(0xffffff);scene.add(key);const fill=new THREE.DirectionalLight(0xc6d3ff,.3);fill.position.set(-5,2,-4);scene.add(fill);
  let panels:Panel[]=[],shapeKey='',oldCards:Card[]|null=null,w=1,h=1,lastPaint=-1,lastNotify=0,lastFrame=performance.now(),raf=0,lost=false;
  const dispose=()=>{panels.forEach(p=>{p.front.geometry.dispose();p.front.material.dispose();p.back.material.dispose();p.texture.dispose();p.backTexture.dispose();group.remove(p.front,p.back);});panels=[];};
  const build=(cards:Card[],s:Settings)=>{dispose();const n=cards.length;cards.forEach((card,i)=>{const canvas=document.createElement('canvas');canvas.width=720;canvas.height=480;paintCard(canvas,card,1.8);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const backTexture=texture.clone();backTexture.wrapS=THREE.RepeatWrapping;backTexture.repeat.x=-1;backTexture.offset.x=1;const angle=Math.PI*2/n;const span=angle*(1-s.gap/100);const geometry=new THREE.CylinderGeometry(s.radius,s.radius,s.height,48,1,true,i*angle-span/2,span);const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.FrontSide,transparent:true,alphaTest:.04,roughness:s.roughness,metalness:.02});const backMaterial=new THREE.MeshStandardMaterial({map:backTexture,side:THREE.BackSide,transparent:true,alphaTest:.04,roughness:1,depthWrite:false,color:'#c2beda',opacity:s.backOpacity});const front=new THREE.Mesh(geometry,material),back=new THREE.Mesh(geometry,backMaterial);back.renderOrder=0;front.renderOrder=1;group.add(back,front);panels.push({canvas,texture,backTexture,front,back,card});});};
  const resize=()=>{w=Math.max(1,container.clientWidth);h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);};const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const contextLost=(e:Event)=>{e.preventDefault();lost=true;setError('预览连接已中断。项目仍保存在本机，点击重试重新加载画布。');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  const tick=(now:number)=>{raf=requestAnimationFrame(tick);const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;if(lost||document.hidden)return;const {project:p,playing:play}=live.current;const s=p.settings;
   if(play){clock.current+=dt;phase.current+=dt*s.speed;}
   const nextKey=[p.cards.map(c=>c.id).join(','),s.radius,s.height,s.gap].join('|');if(shapeKey!==nextKey){build(p.cards,s);shapeKey=nextKey;oldCards=null;}
   const dirty=oldCards!==p.cards;const paint=dirty||now-lastPaint>33;
   panels.forEach((panel,i)=>{panel.card=p.cards[i];panel.front.material.roughness=s.roughness;panel.back.material.opacity=s.backOpacity;if(paint){paintCard(panel.canvas,panel.card,clock.current*s.chartSpeed+i*.43);panel.texture.needsUpdate=true;panel.backTexture.needsUpdate=true;}});if(paint)lastPaint=now;oldCards=p.cards;
   const d=Math.PI/180;rig.rotation.set(s.pitch*d,0,s.roll*d,'ZXY');group.rotation.y=(s.yaw+phase.current)*d;
   ambient.intensity=s.ambient;key.intensity=s.lightPower;key.color.set(s.lightColor);const a=s.lightAngle*d,e=s.lightElevation*d;key.position.set(10*Math.cos(e)*Math.sin(a),10*Math.sin(e),10*Math.cos(e)*Math.cos(a));fill.intensity=s.ambient*.13;
   const viewH=Math.max(5.4,7.7/(w/h))*100/s.zoom;camera.left=-viewH*w/h/2;camera.right=viewH*w/h/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();renderer.setClearColor(s.background);renderer.render(scene,camera);
   if(now-lastNotify>90){live.current.onTime(clock.current%12);lastNotify=now;}
  };raf=requestAnimationFrame(tick);setReady(true);
  let drag:{x:number;y:number;pitch:number;yaw:number}|null=null;
  const down=(e:PointerEvent)=>{if(e.button!==0)return;renderer.domElement.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,pitch:live.current.project.settings.pitch,yaw:live.current.project.settings.yaw};container.classList.add('dragging');};
  const move=(e:PointerEvent)=>{if(!drag)return;const yaw=((drag.yaw+(e.clientX-drag.x)*.3+540)%360)-180;live.current.onDrag(Math.max(-80,Math.min(80,drag.pitch+(e.clientY-drag.y)*.2)),yaw);};const up=()=>{drag=null;container.classList.remove('dragging');};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();dispose();clearImageCache();renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.dispose();renderer.domElement.remove();render.current=undefined;};
 },[attempt]);
 return <div className="scene-host" ref={host}>{!ready&&!error&&<div className="canvas-message">正在准备三维画布…</div>}{error&&<div className="canvas-message error" role="alert"><strong>画布暂不可用</strong><p>{error}</p><button onClick={()=>setAttempt(x=>x+1)}>重新加载</button></div>}</div>;
});
