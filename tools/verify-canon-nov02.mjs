import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const c={window:{}};
for(const name of ['players','schools'])vm.runInNewContext(fs.readFileSync(`data/${name}.js`,'utf8'),c);
const {PLAYERS,SCHOOLS}=c.window,by=id=>PLAYERS.find(p=>p.id===id);
let count=0;const assert=(ok,why)=>{if(!ok)throw Error(why);count++};
const oldNames=/Bellweather|Whitmore|Marlowe|Rutherford|Westgate|Carroway|Vale Health|3F Light/;
assert(!oldNames.test(JSON.stringify(SCHOOLS.harrowgate)),'Harrowgate old facility names removed');
assert(SCHOOLS.aldermere.facilities.some(f=>f.name==='Bellweather Tower')&&SCHOOLS.aldermere.facilities.some(f=>f.name==='Vale Health Center'),'Aldermere original facility names retained');
assert(SCHOOLS.harrowgate.events.length===7&&!SCHOOLS.harrowgate.events.some(e=>e.name.en==='Fountain Run'),'Fountain Run removed from calendar');
assert(SCHOOLS.harrowgate.traditions.length===8&&SCHOOLS.harrowgate.traditions.some(t=>t.name==='Fountain Run'&&t.body.ko.includes('비공식')),'Fountain Run is an unofficial tradition');
assert(PLAYERS.length===8,'Main athletes preserved without invented profiles');
assert(SCHOOLS.aldermere.supportingCast.some(p=>p.id==='dorian-westcott')&&SCHOOLS.harrowgate.supportingCast.some(p=>p.id==='nico-valdes'),'Both new supporting players present');
assert(by('bastian-hartmann').family.en.includes('Henrike Hartmann'),'Henrike named');
assert(by('grant-westcott').restrictedRecords[0].body.en.includes('Dorian Westcott')&&!/two or three|두세/.test(JSON.stringify(by('grant-westcott'))),'Dorian link and exact three-year gap');
assert(by('august-caldwell').languages.ko.includes('예의가 기본'),'August courtesy baseline');
assert(by('tamoi-reo').privateRecords[0].body.ko.includes('연애감정')&&by('tamoi-reo').privateRecords[0].body.ko.includes('교제가 성립한 뒤에만'),'Romantic scope before or after dating');
assert(by('alfred-chadwick').residence.ko.includes('공동거주는 아니다'),'Alfie suite is not group residence');
for(const p of PLAYERS){
 for(const section of p.recordSections)for(const entry of section.entries){
  const field={'Family Background':'family','Languages & Speech':'languages','Residence':'residence','Training & Everyday Behavior':'training','Team Relationships & Communication':'staff'}[entry.title.en];
  if(field)assert(JSON.stringify(entry.body)===JSON.stringify(p[field]),`${p.id}: ${field} synchronized`);
 }
 assert(p.sealedRecords.every((entry,index)=>JSON.stringify(entry.body)===JSON.stringify(p.sensitiveRecords[index].body)),'Sensitive and legacy fields synchronized');
}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const errors=[];
try{
 for(const width of [390,1440])for(const lang of ['ko','en']){
  const ctx=await browser.newContext({viewport:{width,height:1000}});
  await ctx.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,route=>route.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  const go=async(school,route,id)=>{const u=pathToFileURL(path.resolve(school+'/'+route));u.searchParams.set('lang',lang);if(id)u.searchParams.set('id',id);await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.locator('#main').waitFor()};
  for(const school of ['aldermere','harrowgate']){
   const model=SCHOOLS[school];
   await go(school,'campus.html');
   const text=await page.locator('#main').innerText();
   for(const f of model.facilities)assert(text.includes(f.name),`${school}: facility directory ${f.name}`);
   if(school==='harrowgate')assert(!oldNames.test(text),'No old Harrowgate facility labels in campus');
   await page.locator('[data-facility="facility-1"]').click();
   assert(await page.locator('#map-selection').innerText()===model.facilities[1].name,'Map hotspot uses updated name');
   await page.locator('details.accordion').last().locator('summary').click();
   assert((await page.locator('#main').innerText()).includes(school==='aldermere'?'Vale Health Center':'Linden Health'),'Health accordion uses school-specific name');
   await go(school,'mens-lacrosse.html');
   assert(await page.locator('.team-people .facility').count()===5,'Five supporting people publicly accessible');
   const newcomer=school==='aldermere'?'dorian-westcott':'nico-valdes';
   assert((await page.locator('.team-people').innerText()).includes(model.supportingCast.find(p=>p.id===newcomer).name[lang]),'New supporting athlete shown');
   await go(school,'traditions.html');await page.locator('[data-events="all"]').click();
   if(school==='harrowgate'){
    assert(!(await page.locator('#events').innerText()).includes('Fountain Run'),'Fountain Run absent from events');
    assert((await page.locator('.tradition-grid').innerText()).includes('Fountain Run'),'Fountain Run visible in lore');
    for(const name of ['Open House Night']){
     const event=page.locator('.event').filter({has:page.getByRole('heading',{name:model.events.find(e=>e.name.en===name).name[lang],exact:true})});
     await event.locator('summary').click();assert((await event.innerText()).includes('Brier Commons'),'Updated event location');
    }
   }
   await go(school,'staff/index.html');
   if(await page.locator('[data-action="signin"]').count())await page.locator('[data-action="signin"]').click();
   assert(await page.locator('.team-people .record-entry').count()===5,'Five full supporting-person records accessible');
   assert((await page.locator('.team-people').innerText()).includes(model.supportingCast.find(p=>p.id===newcomer).details[lang]),'New supporting detail rendered');
  }
  for(const [id,needle]of [['bastian-hartmann','Henrike Hartmann'],['grant-westcott','Dorian Westcott'],['tamoi-reo',lang==='ko'?'교제가 성립한 뒤에만':'not limited to an established relationship'],['august-caldwell',lang==='ko'?'예의가 기본':'courtesy as the baseline'],['alfred-chadwick',lang==='ko'?'공동거주는 아니다':'not a shared residence']]){
   const p=by(id);await go(p.school,'staff/index.html',id);await page.locator('.record-sheet').waitFor();
   assert((await page.locator('#record-content').innerText()).includes(needle),'Updated athlete detail directly visible: '+id);
   assert(await page.locator('.sensitive-closed').isVisible(),'Sensitive area remains collapsed');
  }
  await ctx.close();
 }
 assert(!errors.length,'No browser JavaScript errors');
 console.log(`PASS: ${count} Nov 2 canon, campus names, events, cast, record synchronization and bilingual mobile/desktop checks.`);
}finally{await browser.close()}
