import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const c={window:{}};
for(const name of ['schools','players'])vm.runInNewContext(fs.readFileSync(`data/${name}.js`,'utf8'),c);
const {SCHOOLS,PLAYERS}=c.window,by=id=>PLAYERS.find(p=>p.id===id);
let checks=0;const assert=(ok,msg)=>{if(!ok)throw Error(msg);checks++};
assert(PLAYERS.length===8,'Eight main profiles preserved');
for(const [id,ko,en]of [['keegan-mercer','오크빌','Oakville'],['august-caldwell','그리니치','Greenwich'],['alfred-chadwick','윔슬로','Wilmslow']])assert(by(id).family.ko.includes(ko)&&by(id).family.en.includes(en),'Family location localized: '+id);
for(const name of ['Rosalind','Cecily','Tabitha'])assert(by('alfred-chadwick').family.en.includes(name),'Named sister: '+name);
assert(by('juno-han').residence.en.includes('outskirts of Saratoga Springs'),'Juno home location');
assert(!/Raven Hunt|레이븐 헌트|레이븐헌트/.test(JSON.stringify(SCHOOLS.harrowgate)),'Deleted event absent from current school data');
assert(SCHOOLS.harrowgate.events.length===7,'Seven Harrowgate major events');
assert(SCHOOLS.aldermere.facilities.length===14&&SCHOOLS.harrowgate.facilities.length===14,'New facilities present');
assert(SCHOOLS.aldermere.womensTeam.people.length===4&&SCHOOLS.harrowgate.womensTeam.people.length===5,'Original women’s team cast counts');
for(const s of Object.values(SCHOOLS)){
 assert(s.localPlaces.length===4,'Four campus/local places');
 for(const p of s.localPlaces.filter(p=>['green-and-grind','common-grounds'].includes(p.id)))assert(!p.owner,'No invented café staff');
 assert(s.womensTeam.people.every(p=>!p.number&&!p.photo),'No invented numbers or portraits');
}
assert(SCHOOLS.harrowgate.supportingCast.find(p=>p.id==='dave-kowalski').details.en.includes('born in 2021'),'Miles has birth year, not permanently fixed age');
for(const p of PLAYERS)for(const sec of p.recordSections)for(const entry of sec.entries){const field={'Family Background':'family','Residence':'residence'}[entry.title.en];if(field)assert(JSON.stringify(entry.body)===JSON.stringify(p[field]),'Direct record mirrors new family/residence data')}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[];
try{
 for(const width of [320,390,768,1440])for(const lang of ['ko','en']){
  const context=await browser.newContext({viewport:{width,height:1000}});
  await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const go=async(school,route)=>{const u=pathToFileURL(path.resolve(school+'/'+route));u.searchParams.set('lang',lang);await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.locator('#main').waitFor()};
  const layout=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width+'/'+lang);
  for(const school of ['aldermere','harrowgate']){
   const model=SCHOOLS[school];
   await go(school,'athletics.html');
   await page.locator('.athletics-program-links a[href*="womens-lacrosse"]').click();await page.locator('.women-people').waitFor();
   assert(page.url().includes('womens-lacrosse.html?lang='+lang),'Women’s team reachable with language retained');
   assert(await page.locator('.women-people .record-entry').count()===model.womensTeam.people.length,'Women’s team listed');
   for(const p of model.womensTeam.people)assert((await page.locator('.women-people').innerText()).includes(p.name[lang]),'Public women’s name: '+p.id);
   assert((await page.locator('.women-people').textContent()).includes(model.womensTeam.reference[lang]),'Season reference visible');await layout();
   for(const p of model.womensTeam.people)assert((await page.locator('.women-people').innerText()).includes(p.details[lang]),'Women’s detail is directly public: '+p.id);
   assert(await page.locator('.profile-staff-cta,.staff-entry,.tabs a[href*="staff"]').count()===0,'No women-specific staff handoff');
   await go(school,'staff/index.html');
   if(await page.locator('[data-action="signin"]').count())await page.locator('[data-action="signin"]').click();
   assert(await page.locator('.women-people').count()===0,'Women’s records excluded from staff portal');
   assert(await page.locator('.table-scroll tbody tr').count()===4,'Men’s main roster remains intact');await layout();
   await go(school,'campus.html');
   assert(await page.locator('.map-hotspot').count()===14,'New facility hotspots present');
   for(const f of model.facilities.filter(f=>Number(f.id.split('-')[1])>=12)){
    await page.locator(`[data-facility="${f.id}"]`).click();assert(await page.locator('#map-selection').innerText()===f.name,'New facility hotspot resolves: '+f.name);
   }
   const dining=await page.locator('#campus-dining').innerText();
   for(const place of model.localPlaces){assert(dining.includes(place.name[lang])&&dining.includes(place.body[lang]),'Dining source content: '+place.id);if(place.owner)assert(dining.includes(place.owner.details[lang]),'Shopkeeper detail present')}
   await layout();
   if(school==='harrowgate'){
    await go(school,'traditions.html');await page.locator('[data-events="all"]').click();
    assert(!/Raven Hunt|레이븐 헌트/.test(await page.locator('#main').innerText()),'Deleted event absent from screen');
   }
  }
  for(const p of PLAYERS.filter(p=>p.school==='aldermere')){
   const u=pathToFileURL(path.resolve('aldermere/staff/index.html'));u.searchParams.set('lang',lang);u.searchParams.set('id',p.id);
   await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.locator('.record-sheet').waitFor();
   const content=await page.locator('#record-content').innerText();assert(content.includes(p.family[lang])&&content.includes(p.residence[lang]),'New family and residence readable: '+p.id);
  }
  await context.close();
 }
 assert(!errors.length,'No browser JavaScript errors');console.log(`PASS: ${checks} Nov 10 family, women’s teams, public women’s details, dining, map, deletion and responsive bilingual checks.`);
}finally{await browser.close()}
