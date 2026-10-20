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
const data={window:{}};
vm.runInNewContext(fs.readFileSync('data/players.js','utf8'),data);
if(fs.readdirSync('assets').some(name=>name.endsWith('-record.webp')))throw Error('Academic image remains in deployment');
if(fs.existsSync('_development/source-assets/records')&&fs.readdirSync('_development/source-assets/records').length)throw Error('Academic image remains in project source');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext();
await context.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
let checked=0;
try{
 for(const player of data.window.PLAYERS)for(const lang of ['ko','en']){
  await page.goto('file:///'+path.resolve(`${player.school}/staff/index.html`).replaceAll('\\','/')+`?id=${player.id}&lang=${lang}`,{waitUntil:'domcontentloaded'});
  if(await page.locator('[data-action="signin"]').count())await page.locator('[data-action="signin"]').click();
  await page.locator('[data-action="view-sensitive"]').click();
  await page.locator('[data-proceed="sensitive"]').click();
  if(await page.locator('.document,.sensitive-document,img[src*="-record.webp"]').count())throw Error('Academic image still rendered');
  const text=await page.locator('#record-content').innerText();
  for(const entry of player.sensitiveRecords)if(!text.includes(entry.body[lang]))throw Error('Written sensitive record lost');
  for(const section of player.recordSections)if(!await page.locator('#record-'+section.id).isVisible())throw Error('Written section lost');
  checked++;
 }
 if(errors.length)throw Error(errors.join(';'));
 console.log(`PASS: ${checked} athlete/language views retain written records and show no academic images, including after sensitive disclosure.`);
}finally{await browser.close()}
