import timeline from './ae-timeline.json';
import source from './chart-source.json';
import { type Card, type CardKind } from './model';
const order: CardKind[]=['bar','line','rings','progress','donut','radar','wave','horizontal'];
type Point=[number,number];
const images=new Map<string,HTMLImageElement>();
export function clearImageCache(){images.clear();}
function progress(kind: CardKind, track: number, t: number, animated:boolean) {
 if(!animated)return 1;
 const card=timeline.cards.find(c=>c.name.startsWith(String(order.indexOf(kind)+1).padStart(2,'0')));
 const values=card?.tracks[track%Math.max(1,card.tracks.length)]?.values;
 if(!values)return 1;
 const f=((t%4+4)%4)*timeline.fps;const a=Math.floor(f),b=Math.min(a+1,values.length-1);
 return (values[a]+(values[b]-values[a])*(f-a))/100;
}
const originalLines = [1,6].map(index=>{
 const it=source[index].items.find(it=>it.kind==='path'&&'stroke-width' in it&&Number(it['stroke-width'])>=4);
 const sh=it && 'shape' in it ? it.shape : undefined;if(!sh)return [];
 const pts:Point[]=[];for(let k=1;k<sh.v.length;k++){const a=sh.v[k-1],b=sh.v[k],o=sh.o[k-1],i=sh.i[k];for(let j=0;j<=24;j++){const t=j/24,u=1-t;pts.push([u**3*a[0]+3*u*u*t*(a[0]+o[0])+3*u*t*t*(b[0]+i[0])+t**3*b[0],u**3*a[1]+3*u*u*t*(a[1]+o[1])+3*u*t*t*(b[1]+i[1])+t**3*b[1]]);}}return pts;
});
const seedLines=[[8,53,34,77,56,96],[44,95,20,67,42,88]];
function customCurve(values:number[]):Point[]{const out:Point[]=[];for(let i=0;i<values.length-1;i++){const a:Point=[28+i/(values.length-1)*304,222-values[i]*1.2],b:Point=[28+(i+1)/(values.length-1)*304,222-values[i+1]*1.2];for(let j=0;j<=24;j++){const t=j/24,e=t*t*(3-2*t);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*e]);}}return out;}
function trimLine(ctx:CanvasRenderingContext2D,pts:Point[],p:number){if(p<=.0001||!pts.length)return;let len=0;const lengths=[0];for(let i=1;i<pts.length;i++){len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lengths.push(len);}ctx.beginPath();ctx.moveTo(...pts[0]);const limit=len*p;for(let i=1;i<pts.length;i++){if(lengths[i]>limit){const f=(limit-lengths[i-1])/(lengths[i]-lengths[i-1]);ctx.lineTo(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f);break;}ctx.lineTo(...pts[i]);}ctx.stroke();}
function rgba(hex:string,a:number){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}
export function paintCard(canvas:HTMLCanvasElement,card:Card,time:number){
 const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(canvas.width/360,0,0,canvas.height/240,0,0);ctx.clearRect(0,0,360,240);ctx.save();ctx.beginPath();ctx.roundRect(0,0,360,240,22);ctx.clip();ctx.fillStyle=card.background;ctx.fillRect(0,0,360,240);
 const text=(s:string,x:number,y:number,size=18,color='#92939f',max=308)=>{ctx.fillStyle=color;ctx.font=`${size}px Arial, sans-serif`;while(ctx.measureText(s).width>max&&size>10){size--;ctx.font=`${size}px Arial, sans-serif`;}ctx.fillText(s,x,y,max);};
 const round=(x:number,y:number,w:number,h:number,c:string,r=8)=>{if(w<=0||h<=0)return;ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));ctx.fillStyle=c;ctx.fill();};
 const arc=(x:number,y:number,r:number,a:number,b:number,c:string,w=5)=>{if(b-a<.0001)return;ctx.beginPath();ctx.arc(x,y,r,a,b);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke();};
 const values=card.values;const p=(i=0)=>progress(card.kind,i,time,card.animated);const title=()=>text(card.title,26,35);
 if(card.kind==='image'){
  if(card.image){let img=images.get(card.image);if(!img){img=new Image();img.src=card.image;images.set(card.image,img);}if(img.complete&&img.naturalWidth){const scale=(card.fit==='cover'?Math.max:Math.min)(360/img.width,240/img.height);ctx.drawImage(img,(360-img.width*scale)/2,(240-img.height*scale)/2,img.width*scale,img.height*scale);}}
  else {text('上传自定义页面',103,116,20,'#555b6b');text('PNG · JPG · SVG',114,146,13);}
 }else if(card.kind==='bar'){
  title();text(card.value,26,75,34,'#20222a');const n=values.length;values.forEach((v,i)=>{const w=304/n;round(28+i*w,220-v*1.25*p(i),w*.75,v*1.25*p(i),i===n-1?card.color:rgba(card.color,.28+i/n*.2));});
 }else if(card.kind==='line'||card.kind==='wave'){
  title();text(card.value,26,75,34,'#20222a');ctx.strokeStyle='#e9e9ef';ctx.lineWidth=1.3;[113,142,171,200,224].forEach(y=>{ctx.beginPath();ctx.moveTo(26,y);ctx.lineTo(334,y);ctx.stroke();});const k=card.kind==='line'?0:1;ctx.strokeStyle=card.color;ctx.lineWidth=4.5;ctx.lineCap='round';ctx.lineJoin='round';trimLine(ctx,JSON.stringify(values)===JSON.stringify(seedLines[k])?originalLines[k]:customCurve(values),p());
 }else if(card.kind==='rings'){
  title();const vs=values.slice(0,3),colors=['#d9b432',card.color,'#64be78'];vs.forEach((v,i)=>{const x=180+(i-(vs.length-1)/2)*110;arc(x,135,40,-Math.PI/2,Math.PI*1.5,'#f0f1f4');arc(x,135,40,-Math.PI/2,-Math.PI/2+Math.PI*2*v/100*p(i),colors[i]);text(String(v),x-18,143,25,'#444653',50);});
 }else if(card.kind==='progress'){
  title();ctx.fillStyle=rgba(card.color,.14);ctx.beginPath();ctx.arc(180,137,62,0,Math.PI*2);ctx.fill();const v=values[0];for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4;arc(180,137,77,a,a+Math.PI/6*p(i),i/8<v/100?card.color:rgba(card.color,.35));}text(card.value||`${v}%`,151,146,27,card.color,105);
 }else if(card.kind==='donut'){
  title();const vs=values.slice(0,3),sum=vs.reduce((a,b)=>a+b,0);const colors=[card.color,'#e6ba32','#36b866'];let angle=-Math.PI/2;vs.forEach((v,i)=>{const width=sum?v/sum*Math.PI*2:0;arc(108,143,61,angle+.05,angle+.05+Math.max(0,width-.1)*p(i),colors[i],22);angle+=width;ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(211,98+i*40,5,0,Math.PI*2);ctx.fill();text(['Direct','Search','Social'][i],225,104+i*40,15,'#747784',72);text(`${sum?Math.round(v/sum*100):0}%`,300,104+i*40,15,'#343642',45);});
 }else if(card.kind==='radar'){
  title();const vs=values.length>=3?values:[...values,50,75];const poly=(r:number,fill=false)=>{ctx.beginPath();vs.forEach((v,i)=>{const a=-Math.PI/2+i*Math.PI*2/vs.length;const rr=fill?r*v/100:r;const x=180+rr*Math.cos(a),y=141+rr*Math.sin(a);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();};ctx.strokeStyle='#e3ddec';ctx.lineWidth=1.5;[29,53,79].forEach(r=>{poly(r);ctx.stroke();});for(let i=0;i<vs.length;i++){const a=-Math.PI/2+i*Math.PI*2/vs.length;ctx.beginPath();ctx.moveTo(180,141);ctx.lineTo(180+79*Math.cos(a),141+79*Math.sin(a));ctx.stroke();}poly(79*(.35+.65*p()),true);ctx.fillStyle=rgba(card.color,.35*p());ctx.fill();ctx.strokeStyle=rgba(card.color,p());ctx.lineWidth=3;ctx.stroke();
 }else{
  title();const colors=[card.color,'#659add','#83c991','#b291d3'];values.slice(0,4).forEach((v,i)=>{const y=77+i*42;text(['Organic','Direct','Social','Referral'][i],26,y+12,14,'#777a86',80);round(112,y,218,12,'#f0f1f5',6);round(112,y,218*v/100*p(i),12,colors[i],6);});
 }
 ctx.restore();
}
