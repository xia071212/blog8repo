/** Reproduce Blog 8 without network access or third-party packages. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run,DEFAULTS,stats} from './simulation.mjs';
import {figures} from './charts.mjs';

// 1. Setup: project-relative paths; fixed seeds are defined in simulation.mjs.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=path.join(root,'data'),results=path.join(root,'results');
for(const p of [data,results,path.join(results,'figures')])fs.mkdirSync(p,{recursive:true});
const read=name=>fs.readFileSync(path.join(root,'code',name),'utf8');
const save=(name,value)=>fs.writeFileSync(path.join(root,name),value);
const csv=(name,header,rows)=>save(name,header+'\n'+rows.map(row=>row.join(',')).join('\n')+'\n');

// 2. Generate the synthetic population and draw the baseline survey.
// 3. Bootstrap, repeat independent surveys, and simulate the null distribution.
// The shared engine is also embedded verbatim in the browser's worker.
const d=run(DEFAULTS),s=stats(d.sample);
csv('data/population.csv','household_id,monthly_spending',d.population.map((x,i)=>[i+1,x]));
const householdIds=new Map(d.population.map((x,i)=>[x,i+1]));
csv('data/sample.csv','draw_id,household_id,monthly_spending',d.sample.map((x,i)=>[i+1,householdIds.get(x),x]));
csv('results/bootstrap.csv','resample_id,mean',d.bootstrap.map((x,i)=>[i+1,x]));
csv('results/coverage.csv','experiment_id,lower,upper,covers_true_mean',d.coverage.map((x,i)=>[i+1,x.low,x.high,Number(x.covers)]));
csv('results/null_statistics.csv','simulation_id,t',d.nullStats.map((x,i)=>[i+1,x]));
const summary={parameters:d.parameters,sample:s,ci:d.ci,coverage:d.coverage.filter(x=>x.covers).length/d.parameters.R,test:d.test,runtime:process.version};
save('results/summary.json',JSON.stringify(summary,null,2)+'\n');

// 4. Draw and save figures, then assemble the offline article from its source.
const rendered=figures(d);
for(const [key,svg] of Object.entries(rendered))save('results/figures/'+key+'.svg',svg);
let html=read('article.html');
html=html.replace('{{illustration}}','data:image/png;base64,'+fs.readFileSync(path.join(root,'assets','household-sampling.png')).toString('base64'));
// Populate prose from actual baseline outputs rather than maintaining copied numbers.
const articleValues={covered:d.coverage.filter(x=>x.covers).length,coverage_pct:(100*summary.coverage).toFixed(1),ci_dollars:d.ci.map(x=>'$'+Math.round(x).toLocaleString('en-US')).join('–'),pvalue:d.test.pvalue.toFixed(3)};
for(const [key,value] of Object.entries(articleValues)) html=html.replaceAll('{{'+key+'}}',String(value));
for(const [key,svg] of Object.entries(rendered))html=html.replace('{{'+key+'}}',svg);
const engine=read('simulation.mjs').replaceAll('export ','');
const charts=read('charts.mjs').replaceAll('export ','');
html=html.replace('/*STYLE*/',()=>read('style.css')).replace('/*ENGINE*/',()=>engine)
 .replace('/*BASELINE*/',()=>'const BASELINE='+JSON.stringify(d)+';\n'+engine+'\n'+charts)
 .replace('/*APP*/',()=>read('app.js'));
save('results/blog8.html',html);
const prose=[...html.matchAll(/<p class="prose[^\"]*">([\s\S]*?)<\/p>/g)].map(m=>m[1].replace(/<[^>]+>/g,'')).join(' ');
console.log(JSON.stringify({...summary,prose_words:prose.split(/\s+/).length},null,2));
