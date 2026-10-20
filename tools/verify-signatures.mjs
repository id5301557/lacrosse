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
import {createHash} from 'node:crypto';
const originalHashes=JSON.parse(fs.readFileSync('tools/signature-sha256.json','utf8'));
const originals={'keegan-mercer':'키건','august-caldwell':'어거스트','juno-han':'주노','alfred-chadwick':'알피','bastian-hartmann':'바스티안','tamoi-reo':'레오','lachlan-fraser':'라키','grant-westcott':'그랜트'};
let passed=0;
const assert=(condition,message)=>{if(!condition)throw Error(message);passed++};
for(const id of Object.keys(originals))assert(createHash('sha256').update(fs.readFileSync(`assets/${id}-signature.png`)).digest('hex')===originalHashes[id],`Original signature preserved: ${id}`);
const data={window:{}};
vm.runInNewContext(fs.readFileSync('data/players.js','utf8'),data);
const juno=data.window.PLAYERS.find(p=>p.id==='juno-han');
const family=juno.restrictedRecords.find(r=>r.title.en==='Different forms of family support');
assert(family.body.ko==='부모는 학업을 중시하고 현실적이며, 라크로스 전향에는 미온적이었다. 일본의 외가 조부모는 비용과 기회를 적극 지원했다.','Juno factual Korean sentences preserved');
assert(family.body.en==='His practical, academically focused parents were lukewarm about the switch to lacrosse. His maternal grandparents in Japan actively supported costs and opportunities.','Juno factual English sentences preserved');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext();
await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base='file:///'+path.resolve('.').replaceAll('\\','/');
try{
 for(const width of [1440,1000,768,390]){
  await page.setViewportSize({width,height:1000});
  for(const lang of ['ko','en']){
   for(const player of data.window.PLAYERS){
    await page.goto(`${base}/${player.school}/player.html?id=${player.id}&lang=${lang}`);
    const image=page.locator('.profile-signature img');
    await image.evaluate(i=>i.decode());
    assert(await image.isVisible(),`Signature visible: ${player.id}, ${lang}, ${width}`);
    assert(await image.getAttribute('src')===`../assets/${player.id}-signature.png`,'Correct athlete signature');
    const copy=await page.locator('.profile-identity-copy').boundingBox(),signature=await image.boundingBox();
    assert(signature.x>=copy.x+copy.width-1||signature.y>=copy.y+copy.height-1,'Signature does not overlap name');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'Profile fits viewport');
   }
   await page.locator('[data-action="directory"]').first().evaluate(button=>button.click());
   await page.locator('dialog[open]').waitFor();
   const buttons=await page.locator('.school-choice .button').all();
   const boxes=await Promise.all(buttons.map(b=>b.boundingBox()));
   if(width>500)assert(Math.abs(boxes[0].y-boxes[1].y)<1,'University buttons align vertically');
   assert(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),'Directory fits viewport');
   await page.locator('dialog [data-action="close"]').click();
  }
 }
 assert(errors.length===0,'No browser errors');
 fs.writeFileSync('_development/verification-signatures.json',JSON.stringify({passed,errors,checkedAt:new Date().toISOString()},null,2));
 console.log(`PASS: ${passed} signature, original-image, profile-layout, directory-alignment and Juno-copy checks.`);
}finally{await browser.close()}
if(process.argv.includes('--full'))await import('./verify.mjs');
