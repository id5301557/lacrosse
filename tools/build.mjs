import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=root;
const pages=['home','about','academics','campus','traditions','athletics','mens-lacrosse','womens-lacrosse','player','admissions','staff'];
for(const school of ['aldermere','harrowgate'])for(const page of [...pages,...(school==='harrowgate'?['ravens-house']:[])]){
 const file=page==='home'?'index.html':page==='staff'?'staff/index.html':page+'.html',base=page==='staff'?'../../':'../';
 fs.mkdirSync(path.dirname(path.join(dist,school,file)),{recursive:true});fs.writeFileSync(path.join(dist,school,file),html(school,page,base));
}
fs.writeFileSync(path.join(dist,'index.html'),html('aldermere','home',''));
function html(school,page,base){const name=school==='aldermere'?'Aldermere':'Harrowgate';return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${school==='aldermere'?'#123e31':'#14263f'}"><meta name="description" content="Discover ${name} University: campus, academics and Division I athletics."><title>${name} University</title><link rel="icon" href="${base}assets/${school}-mark.png"><link rel="stylesheet" href="${base}shared/styles.css"><link rel="stylesheet" href="${base}shared/revision.css"><script defer src="${base}data/schools.js"></script><script defer src="${base}data/players.js"></script><script defer src="${base}shared/app.js"></script></head><body class="${school}" data-school="${school}" data-page="${page}" data-base="${base}"><div id="app"></div><noscript><main><h1>${name} University</h1><p>Enable JavaScript to explore the university directory. / 대학 디렉터리를 탐색하려면 JavaScript를 활성화하세요.</p></main></noscript></body></html>`}
console.log('Built bilingual static entry pages. Existing campus asset slots preserved.');
