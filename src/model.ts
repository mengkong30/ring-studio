export const kinds = ['bar', 'line', 'rings', 'progress', 'donut', 'radar', 'wave', 'horizontal', 'image'] as const;
export type CardKind = typeof kinds[number];
export const kindNames: Record<CardKind, string> = { bar: '柱状图', line: '折线图', rings: '圆环指标', progress: '百分比', donut: '环形图', radar: '雷达图', wave: '趋势图', horizontal: '条形图', image: '自定义页面' };
export interface Card { id: string; kind: CardKind; title: string; value: string; color: string; background: string; values: number[]; image?: string; fit: 'contain' | 'cover'; animated: boolean; }
export interface Settings { pitch: number; yaw: number; roll: number; radius: number; height: number; gap: number; zoom: number; speed: number; background: string; backOpacity: number; lightAngle: number; lightElevation: number; lightPower: number; ambient: number; lightColor: string; roughness: number; chartSpeed: number; }
export interface Project { version: 1; name: string; settings: Settings; cards: Card[]; }
export const defaults: Settings = { pitch: -9, yaw: 0, roll: 15, radius: 3.1, height: 1.8, gap: 5, zoom: 100, speed: 30, background: '#adacc6', backOpacity: 0.32, lightAngle: -35, lightElevation: 45, lightPower: 2.2, ambient: 1.7, lightColor: '#ffffff', roughness: 0.65, chartSpeed: 1 };
const seed: [CardKind, string, string, string, number[]][] = [
  ['bar', 'Revenue', '$34 021', '#1cd548', [38,75,61,100]],
  ['line', 'Active Customers', '1845', '#e849ce', [8,53,34,77,56,96]],
  ['rings', 'Performance', '', '#3f86db', [30,83,62]],
  ['progress', 'Goal completion', '65%', '#e86895', [65]],
  ['donut', 'Traffic sources', '', '#3f83ea', [44,31,25]],
  ['radar', 'Audience profile', '', '#ae91d3', [82,60,94,67,85,51]],
  ['wave', 'Weekly activity', '+24.8%', '#6698d6', [44,95,20,67,42,88]],
  ['horizontal', 'Channel overview', '', '#dfc245', [86,65,77,50]],
];
export function newCard(kind: CardKind): Card { const s = seed.find(s => s[0] === kind); return { id: crypto.randomUUID(), kind, title: s?.[1] ?? '我的页面', value: s?.[2] ?? '', color: s?.[3] ?? '#7487f5', background: '#fdfdfe', values: s ? [...s[4]] : [50,70,90], fit: 'contain', animated: true }; }
export function newProject(): Project { return { version: 1, name: '旋转图表研究', settings: { ...defaults }, cards: seed.map(s => newCard(s[0])) }; }
export const ranges: Record<keyof Omit<Settings, 'background'|'lightColor'>, [number, number]> = { pitch: [-80,80], yaw: [-180,180], roll: [-180,180], radius: [1.5,5], height: [.5,3.5], gap: [0,25], zoom: [40,150], speed: [-90,90], backOpacity: [0,1], lightAngle: [-180,180], lightElevation: [-80,80], lightPower: [0,6], ambient: [0,4], roughness: [0.05,1], chartSpeed: [.2,3] };
const hex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
export function parseProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new Error('项目文件格式不正确。');
  const p = raw as Record<string, unknown>;
  if(p.version !== 1 || typeof p.name !== 'string' || !Array.isArray(p.cards) || p.cards.length > 16 || !p.settings || typeof p.settings !== 'object') throw new Error('仅支持 Ring Studio v1 项目，最多 16 张卡片。');
  const s = p.settings as Record<string, unknown>; const settings = { ...defaults };
  for(const k of Object.keys(ranges) as (keyof typeof ranges)[]) { const v=s[k]; if(typeof v !== 'number' || !Number.isFinite(v)) throw new Error('项目参数缺失或无效。'); settings[k]=Math.max(ranges[k][0],Math.min(ranges[k][1],v)); }
  if(!hex(s.background) || !hex(s.lightColor)) throw new Error('颜色参数不正确。');
  settings.background=s.background;settings.lightColor=s.lightColor;
  const ids=new Set<string>();
  const cards=p.cards.map((raw): Card=>{if(!raw||typeof raw!=='object')throw new Error('卡片数据不正确。');const c=raw as Record<string,unknown>;
    if(typeof c.id!=='string'||ids.has(c.id)||!kinds.includes(c.kind as CardKind)||typeof c.title!=='string'||typeof c.value!=='string'||!hex(c.color)||!hex(c.background)||!Array.isArray(c.values)||c.values.length<1||c.values.length>12||!c.values.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100))throw new Error('卡片字段或数值无效（数值范围 0–100）。');
    if(c.image!==undefined&&(typeof c.image!=='string'||c.image.length>8000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.image)))throw new Error('自定义图片格式无效。');
    ids.add(c.id);return {id:c.id,kind:c.kind as CardKind,title:c.title.slice(0,80),value:c.value.slice(0,40),color:c.color,background:c.background,values:c.values as number[],image:c.image as string|undefined,fit:c.fit==='cover'?'cover':'contain',animated:c.animated!==false};
  }); return {version:1,name:p.name.slice(0,80),settings,cards};
}
export function download(blob: Blob, name: string) { const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000); }
