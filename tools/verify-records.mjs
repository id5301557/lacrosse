import {fileURLToPath as toolPath} from 'node:url';
process.chdir(toolPath(new URL('../',import.meta.url)));
import {mkdirSync as ensureToolReports} from 'node:fs';
ensureToolReports('_development',{recursive:true});
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.USERPROFILE||process.env.HOME,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const ctx={window:{}};
for(const name of ['players','schools'])vm.runInNewContext(fs.readFileSync(`data/${name}.js`,'utf8'),ctx);
const {PLAYERS,SCHOOLS}=ctx.window,checks=[],errors=[];
const assert=(condition,message)=>{if(!condition)throw Error(message);checks.push(message)};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext();
await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,route=>route.abort());
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
const base='file:///'+path.resolve('.').replaceAll('\\','/');
const go=async(route,lang)=>{await page.goto(`${base}/${route}${route.includes('?')?'&':'?'}lang=${lang}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('#main')};
const visibleText=()=>page.locator('#main').innerText();
async function layout(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'No horizontal page overflow');const bad=await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async i=>{i.loading='eager';try{await i.decode()}catch{}}));return images.filter(i=>!i.naturalWidth).map(i=>i.src)});assert(!bad.length,'All images decode: '+bad.join(','))}
const productionMeta=/정보.{0,12}제공되지|기록.{0,12}제공되지|자료.{0,12}제공되지|미제공|미기재|not (?:been )?(?:supplied|provided)|not specified|author unspecified|Tier [123]/i;
try{
 for(const width of [1440,1000,768,390]){
  console.log(`Checking single-page records and event details at ${width}px`);
  await page.setViewportSize({width,height:1000});
  for(const lang of ['ko','en']){
   for(const school of ['aldermere','harrowgate'])for(const route of ['index','about','academics','campus','athletics','admissions']){
    await go(`${school}/${route}.html`,lang);await layout();
    assert(!productionMeta.test(await visibleText()),'Public page contains no production placeholders');
    assert(await page.locator('.staff-portal-link').isVisible(),'Staff Portal visible on every public page');
   }
   for(const p of PLAYERS){
    await go(`${p.school}/staff/index.html?id=${p.id}`,lang);
    if(await page.locator('[data-action="signin"]').count())await page.locator('[data-action="signin"]').click();
    assert(await page.locator('.record-title h1').innerText()===p.name[lang],'Selected athlete opens directly');
    assert(await page.locator('dialog[open]').count()===0,'Reading ordinary detail requires no warning');
    assert(await page.locator('[data-staff-tab]').count()===0,'No nested record tabs');
    const text=await visibleText();
    for(const section of p.recordSections){
     assert(await page.locator(`#record-${section.id}`).isVisible(),`Section is directly readable: ${section.id}`);
     for(const entry of section.entries)assert(text.includes(entry.body[lang]),'Existing detail is rendered without a tier gate');
    }
    for(const secret of p.sensitiveRecords)assert(!text.includes(secret.body[lang]),'Sensitive text remains absent until acknowledgement');
    assert(await page.locator('.document').count()===0,'Sensitive attachment absent before acknowledgement');
    assert(!productionMeta.test(text),'Record contains no production placeholders');
    await layout();
    const entries=await page.locator('.record-entry').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n.querySelector('p'));return {size:parseFloat(s.fontSize),font:s.fontFamily}}));
    assert(entries.every(x=>x.size>=15&&!x.font.includes('Serif')),'Record uses readable sans-serif body');
   }
   for(const school of ['aldermere','harrowgate']){
    await go(`${school}/traditions.html`,lang);
    await page.locator('[data-events="all"]').click();
    assert(await page.locator('.tradition').count()===SCHOOLS[school].traditions.length,'All source traditions retained');
    const details=page.locator('.event-details');
    assert(await details.count()===(school==='aldermere'?6:9),'All major events have detail');
    for(const detail of await details.all()){
     await detail.locator('summary').click();
     assert(await detail.locator('.event-moments li').count()>=4,'Event detail includes original small activities');
    }
    await layout();
    await go(`${school}/mens-lacrosse.html`,lang);await layout();assert(!productionMeta.test(await visibleText()),'Team page contains no production placeholders');
   }
   await go('harrowgate/ravens-house.html',lang);await layout();
   assert((await visibleText()).includes(lang==='ko'?'훈련복·스틱·테이프·간식':'Training clothes, sticks, tape and snacks'),'House everyday details restored');
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const p of PLAYERS){
  console.log('Checking disclosure flow: '+p.id);
  await go(`${p.school}/staff/index.html`, 'ko');await page.evaluate(()=>sessionStorage.clear());
  await go(`${p.school}/player.html?id=${p.id}`, 'ko');
  assert(await page.locator('.profile-staff-cta a').innerText()==='제한 기록 보기 ↗','Public CTA clearly names restricted record');
  await page.locator('.profile-staff-cta a').click();await page.waitForSelector('[data-action="signin"]');
  await page.locator('[data-action="signin"]').click();
  assert(await page.locator('.record-title h1').innerText()===p.name.ko,'Authentication retains exact athlete target');
  const originalUrl=page.url();
  await page.locator('[data-action="view-sensitive"]').click();
  assert(await page.locator('dialog[open]').count()===1,'Sensitive click displays caution modal first');
  assert((await page.locator('dialog').innerText()).includes('당사자의 동의된 공개 정보'),'Warning includes consented disclosure caution');
  assert(await page.locator('#sensitive-information').count()===0,'Warning does not prematurely reveal information');
  await page.locator('[data-action="cancel-record"]').click();
  assert(await page.locator('#sensitive-information').count()===0&&await page.locator('dialog[open]').count()===0,'Cancel keeps sensitive area closed');
  await page.locator('[data-action="view-sensitive"]').click();await page.keyboard.press('Escape');
  assert(await page.locator('#sensitive-information').count()===0,'Escape keeps sensitive area closed');
  await page.locator('[data-action="view-sensitive"]').click();await page.locator('[data-proceed="sensitive"]').click();
  assert(page.url()===originalUrl,'Sensitive disclosure stays on same page and URL');
  assert(await page.locator('#sensitive-information').isVisible(),'Acknowledgement expands inline content');
  assert(await page.locator('.document,.sensitive-document,img[src*="-record.webp"]').count()===0,'Academic images are removed even after sensitive disclosure');
  for(const secret of p.sensitiveRecords)assert((await visibleText()).includes(secret.body.ko),'Acknowledged sensitive detail preserved');
  await layout();
  await page.locator('[data-language="en"]').click();
  assert(await page.locator('dialog[open]').count()===0,'Language switch retains current disclosure');
  for(const secret of p.sensitiveRecords)assert((await visibleText()).includes(secret.body.en),'English sensitive localization remains available inline');
  await page.locator('[data-action="hide-sensitive"]').click();
  assert(await page.locator('#sensitive-information').count()===0,'Collapse removes private content from DOM');
  await page.locator('.record-anchor-nav a[href="#record-family"]').click();
  assert(await page.locator('#record-family').isVisible()&&page.url().endsWith('#record-family'),'Family uses same-page anchor navigation');
  const next=PLAYERS.find(other=>other.school===p.school&&other.id!==p.id);
  await page.locator(`.sidebar a[href*="id=${next.id}"]`).click();
  assert(await page.locator('[data-action="signin"]').count()===0,'Staff session persists for another athlete');
  assert(await page.locator('#sensitive-information').count()===0,'Sensitive access does not leak to another athlete');
  await go(`${p.school}/staff/index.html?id=${p.id}&tab=sealed`,'ko');
  assert(await page.locator('dialog[open]').count()===0&&await page.locator('#sensitive-information').count()===0,'Old sealed deep link opens one record without revealing private data');
  assert(await page.locator('#record-overview').count()===1,'Legacy routes preserve full one-page record');
 }
 const allText=JSON.stringify(PLAYERS.flatMap(p=>p.recordSections));
 assert(!productionMeta.test(allText),'Data contains no production placeholders');
 for(const id of ['keegan-mercer','august-caldwell','juno-han','alfred-chadwick'])assert(PLAYERS.find(p=>p.id===id).recordSections.some(section=>section.entries.some(entry=>entry.title.en==='Drinking & Lifestyle')),'SWEET drinking details directly available');
 assert(PLAYERS.find(p=>p.id==='juno-han').recordSections.some(section=>section.entries.some(entry=>entry.body.ko.includes('원정 스트리밍'))),'Juno basketball hobby retained');
 assert(PLAYERS.find(p=>p.id==='tamoi-reo').nationality.ko.includes('20세 전에'),'Reo nationality correction preserved in unified field');
 assert(PLAYERS.find(p=>p.id==='grant-westcott').restrictedRecords.some(n=>n.body.ko.includes('할아버지·아버지·삼촌 모두')),'Grant grandfather correction preserved');
 await context.route('http://university.test/**',async route=>{const relative=decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/repository\//,''));const file=path.resolve('.',relative);if(!file.startsWith(path.resolve('.')+path.sep)||!fs.existsSync(file)){await route.fulfill({status:404,body:'Not found'});return}await route.fulfill({path:file,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf'}[path.extname(file)]||'application/octet-stream'})});
 await page.goto('http://university.test/repository/aldermere/player.html?id=juno-han&lang=ko');await page.waitForSelector('#main');await layout();
 await page.locator('.profile-staff-cta a').click();await page.waitForSelector('[data-action="signin"]');await page.locator('[data-action="signin"]').click();
 assert(page.url().includes('/repository/aldermere/staff/index.html')&&await page.locator('.record-title h1').innerText()==='주노 한','GitHub repository subpath and selected athlete work');
 await page.locator('[data-action="view-sensitive"]').click();await page.locator('[data-proceed="sensitive"]').click();await layout();
 assert(errors.length===0,'No JavaScript runtime errors');
 fs.writeFileSync('_development/verification-records.json',JSON.stringify({passed:checks.length,errors,widths:[1440,1000,768,390],languages:['ko','en'],checkedAt:new Date().toISOString()},null,2));
 console.log(`PASS: ${checks.length} checks; one-page records, warning/cancel/inline disclosure, sessions, original details, events, mobile, images and GitHub paths.`);
}finally{await browser.close()}
