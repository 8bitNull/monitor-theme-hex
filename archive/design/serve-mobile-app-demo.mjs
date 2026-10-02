import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const directory=path.dirname(fileURLToPath(import.meta.url));
const files=new Map([
 ['/', ['mobile-app-demo.html','text/html; charset=utf-8']],
 ['/mobile-app-demo.html',['mobile-app-demo.html','text/html; charset=utf-8']],
 ['/mobile-app-demo-refinement.css',['mobile-app-demo-refinement.css','text/css; charset=utf-8']],
 ['/mobile-app-demo-refinement.js',['mobile-app-demo-refinement.js','application/javascript; charset=utf-8']],
 ['/mobile-app-demo-scenarios.js',['mobile-app-demo-scenarios.js','application/javascript; charset=utf-8']],
]);
http.createServer(async(req,res)=>{
 const entry=files.get(new URL(req.url,'http://localhost').pathname);
 if(!entry){res.writeHead(404).end();return;}
 try{const data=await readFile(path.join(directory,entry[0]));res.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-store'}).end(data);}
 catch{res.writeHead(500).end('Demo file unavailable');}
}).listen(4188,'127.0.0.1',()=>console.log('Mobile Demo: http://127.0.0.1:4188'));
