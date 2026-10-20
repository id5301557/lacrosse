import {fileURLToPath as toolPath} from 'node:url';
process.chdir(toolPath(new URL('../',import.meta.url)));
import {mkdirSync as ensureToolReports} from 'node:fs';
ensureToolReports('_development',{recursive:true});
import './verify-records.mjs';
