import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname.replace(/^\/lacrosse/,''));
 if(!file.startsWith(root)){res.writeHead(403).end();return}
 fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(body)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/lacrosse/`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
let checks=0;const errors=[];
const assert=(v,m)=>{if(!v)throw Error(m);checks++};
try{
 for(const width of [320,390,768,1000,1440])for(const lang of ['ko','en']){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const inViewport=async(selector)=>{
   const b=await page.locator(selector).boundingBox();
   assert(b&&b.width>0&&b.x>=0&&b.x+b.width<=width+1,`${selector} visible and fits at ${width}/${lang}`);
  };
  for(const school of ['aldermere','harrowgate']){
   await page.goto(base+`${school}/index.html?lang=${lang}`);
   await inViewport('.utility [data-action="directory"]');
   await inViewport('.utility .staff-portal-link');
   await inViewport('.utility .language-switch');
   await page.locator('[data-action="directory"]').click();
   const other=school==='aldermere'?'harrowgate':'aldermere';
   await page.locator(`.school-choice a[href*="${other}/index.html"]`).click();
   assert(page.url().includes(`/${other}/index.html?lang=${lang}`),'Public school switch preserves language and repository prefix');
  }
  await page.goto(base+`aldermere/staff/index.html?lang=${lang}`);
  await page.locator('[data-action="signin"]').click();
  await page.locator('.sidebar a[href*="&id="]').first().click();await page.locator('.record-sheet').waitFor();
  await page.locator('.record-sheet').waitFor();assert(await page.locator('.record-sheet').count()===1,'Athlete record opens');
  for(const school of ['harrowgate','aldermere']){
   await inViewport('.staff-school-switch');
   await inViewport('.internal-header .language-switch');
   await page.locator(`.staff-school-switch a[href*="${school}/staff/"]`).click();
   await page.locator('.table-scroll tbody').waitFor();assert(await page.locator('[data-action="signin"]').count()===0,'No repeated sign-in across schools');
   assert(await page.locator('.table-scroll tbody tr').count()===4,'Destination school directory opens');
   assert(await page.locator('.staff-school-switch a[aria-current="true"]').getAttribute('href')==="../../"+school+'/staff/index.html?lang='+lang,'Correct active school and language');
   await page.locator('.table-scroll tbody a').first().click();await page.locator('.record-sheet').waitFor();
   assert(await page.locator('.record-sheet').count()===1,'Destination athlete record opens directly');
  }
  await page.locator('[data-action="signout"]').evaluate(b=>b.click());
  assert(await page.locator('[data-action="signin"]').count()===1,'Sign-out returns to login');
  await page.locator('.staff-school-switch a[href*="harrowgate/staff/"]').click();
  await page.locator('[data-action="signin"]').waitFor();assert(await page.locator('[data-action="signin"]').count()===1,'Sign-out clears both schools');
  await page.evaluate(()=>sessionStorage.setItem('aldermere-staff','active'));
  await page.reload();await page.locator('.table-scroll tbody').waitFor();
  assert(await page.locator('[data-action="signin"]').count()===0,'Existing legacy staff session works across schools');
  await context.close();
 }
 assert(errors.length===0,'No browser script errors');
 console.log(`PASS: ${checks} bilingual school-switch, mobile layout, shared session and GitHub subpath checks.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
