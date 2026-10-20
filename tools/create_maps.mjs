import {fileURLToPath as toolPath} from 'node:url';
process.chdir(toolPath(new URL('../',import.meta.url)));
import {mkdirSync as ensureToolReports} from 'node:fs';
ensureToolReports('_development',{recursive:true});
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../assets/',import.meta.url),ctx={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../data/schools.js',import.meta.url),'utf8'),ctx);
const svg=(body,title)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850" role="img" aria-label="${title}"><defs><pattern id="grain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#17392b" opacity=".08"/></pattern><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#c4d3dc"/><stop offset="1" stop-color="#f0e8d7"/></linearGradient></defs>${body}<rect width="1200" height="850" fill="url(#grain)"/></svg>`;
function block(x,y,w,h,brick=false,tower=false){const wall=brick?'#a66653':'#c8bb92',roof=brick?'#384957':'#647965';let out=`<g transform="translate(${x} ${y})"><path d="M0 0h${w}v${h}H0z" fill="${wall}" stroke="#786c58" stroke-width="2"/><path d="M0 0l12-17h${w}l-12 17z" fill="${roof}"/><path d="M${w} 0l12-17v${h}l-12 17z" fill="#78685e"/>`;for(let yy=15;yy<h-8;yy+=20)for(let xx=12;xx<w-6;xx+=22)out+=`<rect x="${xx}" y="${yy}" width="8" height="11" fill="#314c52"/><path d="M${xx-1} ${yy+12}h10" stroke="#e5d8bc"/>`;if(tower)out+=`<path d="M${w/2-17} 0v-70h34v70" fill="${wall}" stroke="#786c58"/><path d="M${w/2-20}-70l20-32 20 32z" fill="${roof}"/><circle cx="${w/2}" cy="-45" r="11" fill="#f3e4be"/><path d="M${w/2}-53v8l6 4" stroke="#354852" fill="none"/>`;return out+'</g>'}
const tree=(x,y,r=20)=>`<g><ellipse cx="${x+4}" cy="${y+8}" rx="${r}" ry="${r*.65}" fill="#2c4b39" opacity=".15"/><circle cx="${x}" cy="${y}" r="${r}" fill="#567755"/><circle cx="${x-5}" cy="${y-5}" r="${r*.65}" fill="#83955f"/></g>`;
for(const [key,s] of Object.entries(ctx.window.SCHOOLS)){
 const h=key==='harrowgate';let body=`<rect width="1200" height="850" fill="${h?'#e4ddcb':'#dce6c9'}"/>`;
 if(h){body+='<path d="M1040 0h160v850h-150Q985 655 1050 480T1040 0Z" fill="#8db0b7"/><path d="M1027 0Q1090 285 1028 520T1040 850" stroke="#c5bfa7" stroke-width="19" fill="none"/><path d="M70 90h900M80 650h900M110 90v660M680 80v665" stroke="#c1b9a5" stroke-width="32"/><path d="M390 260h290v225H390Z" fill="#809578" stroke="#dfccb1" stroke-width="25"/><path d="M525 260v225M390 375h290" stroke="#e4d6b8" stroke-width="9"/><circle cx="525" cy="375" r="24" fill="#bbc4bf"/><circle cx="525" cy="375" r="14" fill="#8ba9ad"/><path d="M1080 690h100v28h-100" fill="#8c735b"/><path d="M1030 450h-120" stroke="#e5d8b9" stroke-width="20"/>';
 }else{body+='<ellipse cx="585" cy="428" rx="255" ry="190" fill="#9db782"/><ellipse cx="585" cy="428" rx="285" ry="216" fill="none" stroke="#e8dcc2" stroke-width="17"/><path d="M585 100v660M260 280L910 665M250 680L945 260" stroke="#ece0c8" stroke-width="13" fill="none"/><path d="M65 115C40 330 95 720 280 785M960 90Q1110 420 995 780" stroke="#c2c6aa" stroke-width="25" fill="none"/><path d="M990 375h170v195H990z" fill="#658956" stroke="#e6dfc8" stroke-width="8"/><path d="M1075 375v195M990 472h170" stroke="#e6dfc8" stroke-width="3"/><ellipse cx="1075" cy="472" rx="30" ry="45" fill="none" stroke="#e6dfc8" stroke-width="3"/>'}
 for(let i=0;i<s.facilities.length;i++){const f=s.facilities[i],x=f.point[0]*12,y=f.point[1]*8.5;if(i===0||i===1||f.name==='River Walk'||f.name==='Harrow Dock'||/Field/.test(f.name))continue;body+=block(x-48,y-20,100,50,h,false)}
 const tower=s.facilities[1];body+=block(tower.point[0]*12-48,tower.point[1]*8.5-20,65,75,h,true);
 const coords=h?[[80,200],[920,80],[780,530],[930,610],[325,730],[580,650],[95,530],[720,740],[330,200],[860,350]]:[[350,170],[720,140],[870,190],[280,420],[900,665],[600,710],[330,700],[120,310],[1050,700],[70,560],[650,570],[430,300],[730,410],[450,600]];for(const [x,y] of coords)body+=tree(x,y,h?18:27);
 body+=`<text x="${h?450:480}" y="${h?438:465}" font-family="Georgia,serif" font-size="29" fill="#355542">${h?'OLD QUAD':'FOUNDERS’ GREEN'}</text><text x="45" y="820" font-family="Georgia,serif" font-size="25" fill="#344f46">${s.name.toUpperCase()} · CAMPUS DIRECTORY</text>`;
 const target=new URL(s.assets.map.src,root);if(s.assets.map.src===key+'-map.svg'&&(!fs.existsSync(target)||process.argv.includes('--refresh-map='+key)))fs.writeFileSync(target,svg(body,s.name+' conceptual campus map'));
}
const ald=new URL('aldermere-panorama.svg',root);if(!fs.existsSync(ald))fs.copyFileSync(new URL('aldermere-campus.svg',root),ald);
const har=new URL('harrowgate-panorama.svg',root);if(!fs.existsSync(har)){
 let body='<rect width="1200" height="850" fill="url(#sky)"/><path d="M0 500Q400 380 1200 450v400H0Z" fill="#a5ad8e"/><path d="M0 695Q500 610 1200 735v115H0Z" fill="#8fadb4"/><path d="M0 665Q460 555 1200 665" stroke="#dbcfb4" stroke-width="35" fill="none"/><path d="M400 525l420 65-280 80-400-70z" fill="#c8b9a0"/>';
 body+=block(140,330,285,235,true)+block(610,285,410,275,true)+block(500,230,100,300,true,true)+block(25,410,120,145,true);
 body+='<path d="M465 650h120l20-22H480z" fill="#a88b68"/><path d="M490 646v-55q24-44 50 0v57" fill="#283e4b"/><path d="M755 682l180 32 15 15-180-32z" fill="#9b7858"/><path d="M782 702v36m124-12v30" stroke="#684f3b" stroke-width="8"/>';
 for(const [x,y,r] of [[75,630,53],[1050,595,48],[390,560,32],[960,675,35],[1180,560,70]])body+=tree(x,y,r);
 fs.writeFileSync(har,svg(body,'Harrowgate red-brick and stone panorama'));
}
console.log('Distinct campus map slots and panorama slots prepared; existing replacement files preserved.');
