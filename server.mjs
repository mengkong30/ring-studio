import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.RING_PORT||5186);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let target=path.resolve(root,'.'+pathname);if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');}catch{if(!path.extname(pathname))target=path.join(root,'index.html');}
  const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已在使用。请直接打开 http://127.0.0.1:${port}/，或关闭旧服务后重试。`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${port}/`;console.log(`\nRing Studio 已启动\n${url}\n\n保留此窗口以继续使用；按 Ctrl+C 停止服务。\n`);if(process.argv.includes('--open')){if(process.platform==='win32')spawn('cmd',['/c','start','',url],{windowsHide:true,stdio:'ignore'});else if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'});}});
