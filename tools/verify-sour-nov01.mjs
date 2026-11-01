import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const model={window:{}};
for(const name of ['players','schools'])vm.runInNewContext(fs.readFileSync(`data/${name}.js`,'utf8'),model);
const by=id=>model.window.PLAYERS.find(p=>p.id===id);
let checks=0;const assert=(ok,message)=>{if(!ok)throw Error(message);checks++};
const b=by('bastian-hartmann'),g=by('grant-westcott'),r=by('tamoi-reo');
assert(b.family.ko.includes('독일 외교관')&&b.family.ko.includes('재택 번역가')&&b.family.ko.includes('네 살 위')&&b.family.ko.includes('해외 발령'),'New family and upbringing canon');
assert(b.future.en==='He has not chosen a diplomatic career.','No invented career');
assert(!/Bundeswehr|military family|military career|고위 장교|군 진로|군 경력/.test(JSON.stringify(b)),'Outdated military background removed');
assert(g.family.ko.includes('해운·항만물류업')&&g.family.ko.includes('유복한')&&g.family.ko.includes('할아버지·아버지·삼촌'),'Family business and college lacrosse preserved');
assert(!/중산층|middle.class|rather than longstanding extreme wealth/.test(JSON.stringify(g)),'Old economic background removed');
assert(!/to black|검은색|흑발/.test(JSON.stringify(r.appearance)),'Reo hair fixed to dark brown');
assert(!/당황하거나 감정을 합리화할 때|Numerical, technical, medical|Explanations may lengthen/.test(JSON.stringify(b)),'Prior explicit speech deletion preserved');
assert(model.window.SCHOOLS.harrowgate.region.ko==='메릴랜드주 애나폴리스 근교','Short location preserved');
for(const p of [b,g,r])for(const section of p.recordSections)for(const entry of section.entries){
 const key={'Family Background':'family','Languages & Speech':'languages','Appearance':'appearance','Career Direction':'future'}[entry.title.en];
 if(key)assert(JSON.stringify(entry.body)===JSON.stringify(p[key]),`${p.id} ${key} mirrored into displayed record`);
}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const errors=[];
try{
 for(const width of [390,1440])for(const lang of ['ko','en']){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,route=>route.abort());
  const page=await context.newPage();page.on('pageerror',err=>errors.push(err.message));
  for(const p of [b,g,r]){
   const u=pathToFileURL(path.resolve('harrowgate/staff/index.html'));u.searchParams.set('lang',lang);u.searchParams.set('id',p.id);
   await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.locator('#main').waitFor();
   if(await page.locator('[data-action="signin"]').count())await page.locator('[data-action="signin"]').click();
   await page.locator('.record-sheet').waitFor();
   const content=await page.locator('#record-content').innerText();
   for(const key of p===b?['family','languages','future']:p===g?['family']:['appearance'])assert(content.includes(p[key][lang]),`${p.id}: updated ${key} is directly readable, ${lang}/${width}`);
   assert(await page.locator('.sensitive-closed').isVisible(),'Sensitive information stays collapsed');
   assert(!await page.locator('dialog[open]').count(),'Ordinary records need no extra warning');
  }
  await context.close();
 }
 assert(!errors.length,'No browser errors');
 console.log(`PASS: ${checks} Nov 1 canon, mirrored records, bilingual mobile/desktop rendering and privacy checks.`);
}finally{await browser.close()}
