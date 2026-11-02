/** Build the offline interactive simulation; Python remains the main analysis entry. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run} from './simulation.mjs';
import {figures} from './charts.mjs';

const source = path.dirname(fileURLToPath(import.meta.url));
const results = path.resolve(source, '../../results');
const read = name => fs.readFileSync(path.join(source, name), 'utf8');
fs.mkdirSync(results, {recursive:true});
const data = run();
let html = read('interface.html');
const covered = data.coverage.filter(row => row.covers).length;
const values = {
  covered,
  coverage_pct: (100 * covered / data.parameters.R).toFixed(1),
  ci_dollars: data.ci.map(value => '$' + Math.round(value).toLocaleString('en-US')).join('–'),
  pvalue_number: data.test.pvalue.toFixed(3)
};
for (const [key, value] of Object.entries(values)) html = html.replaceAll('{{'+key+'}}', String(value));
for (const [key, svg] of Object.entries(figures(data))) html = html.replace('{{'+key+'}}', svg);
const engine = read('simulation.mjs').replaceAll('export ', '');
const charts = read('charts.mjs').replaceAll('export ', '');
html = html.replace('/*STYLE*/', () => read('interface.css'))
  .replace('/*ENGINE*/', () => engine)
  .replace('/*BASELINE*/', () => 'const BASELINE='+JSON.stringify(data)+';\n'+engine+'\n'+charts)
  .replace('/*APP*/', () => read('app.js'));
fs.writeFileSync(path.join(results, 'interactive.html'), html);
console.log('Built results/interactive.html');
