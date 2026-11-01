import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.USERPROFILE||process.env.HOME,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const ctx={window:{}};for(const name of ['players','schools'])vm.runInNewContext(fs.readFileSync(`data/${name}.js`,'utf8'),ctx);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),context=await browser.newContext();
await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));let checks=0;
const assert=(x,message)=>{if(!x)throw Error(message);checks++};
const go=async(route,lang)=>{await page.goto(pathToFileURL(path.resolve(route)).href+(route.includes('?')?'&':'?')+'lang='+lang,{waitUntil:'domcontentloaded'});await page.waitForSelector('#main')};
// Build URLs separately so query characters are never escaped as filenames.
const visit=async(route,query,lang)=>{const u=pathToFileURL(path.resolve(route));u.searchParams.set('lang',lang);for(const[k,v]of Object.entries(query))u.searchParams.set(k,v);await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.waitForSelector('#main')};
try{
 for(const lang of ['ko','en'])for(const school of ['aldermere','harrowgate']){
  await go(`${school}/mens-lacrosse.html`,lang);
  const model=ctx.window.SCHOOLS[school];
  assert((await page.locator('#main').innerText()).includes(model.coach.name[lang]),'Head coach localized');
  assert(await page.locator('.team-people .facility').count()===model.supportingCast.length,'All supporting people shown publicly');
  assert(!(await page.locator('.team-people').innerText()).includes('Miles'),'Staff family detail excluded from public team page');
  await go(`${school}/staff/index.html`,lang);if(await page.locator('[data-action="signin"]').count())await page.locator('[data-action="signin"]').click();
  assert(await page.locator('.team-people .record-entry').count()===model.supportingCast.length,'Supporting details accessible in staff directory');
  for(const p of model.supportingCast)assert((await page.locator('.team-people').innerText()).includes(p.details[lang]),'Original supporting-person detail present');
  for(const p of ctx.window.PLAYERS.filter(p=>p.school===school)){
   await visit(`${school}/staff/index.html`,{id:p.id},lang);
   assert(!await page.locator('dialog[open]').count(),'Record remains directly readable');
   const text=await page.locator('#record-content').innerText();
   if(p.vehicle)assert(text.includes(p.vehicle[lang]),'Vehicle in restricted overview');
   if(p.id==='bastian-hartmann')assert(!text.includes(lang==='ko'?'수치·기술·의학':'Numerical, technical, medical'),'Deleted speech sentences remain removed');
  }
  if(school==='harrowgate'){
   await visit('harrowgate/player.html',{id:'tamoi-reo'},lang);
   assert(!(await page.locator('#main').innerText()).includes(lang==='ko'?'아버지가 반대':'father’s opposition'),'Private nationality context excluded from public origin');
   await go('harrowgate/traditions.html',lang);await page.locator('[data-events="all"]').click();
   const ball=page.locator('.event').filter({has:page.getByRole('heading',{name:lang==='ko'?'차터 볼':'Charter Ball',exact:true})});
   await ball.locator('summary').click();assert((await ball.innerText()).includes('Progressive Dance'),'Progressive Dance accessible in event detail');
  }
 }
 assert(errors.length===0,'No JavaScript errors');console.log(`PASS: ${checks} new-coach, supporting-cast, privacy, vehicle, direct-record and event checks.`);
}finally{await browser.close()}
if(process.argv.includes('--signatures'))await import('./verify-signatures.mjs');
