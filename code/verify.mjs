/** Numerical checks for the statistical teaching claims; run with Node. */
import assert from 'node:assert/strict';
import {population,mean,stats,quantile,interval,run,DEFAULTS,testResult,draw,bootstrap,rng} from './simulation.mjs';
assert.ok(Math.abs(mean(population(3000))-3000)<1e-8);
assert.equal(quantile([0,10,20],.25),5);
assert.equal(stats([1,2,3]).se,1/Math.sqrt(3));
const p={...DEFAULTS,B:337,R:53,M:701,confidence:93.7,n:87};
const d=run(p),repeat=run(p);
assert.deepEqual(d,repeat);
assert.equal(d.coverage.length,53);assert.equal(d.bootstrap.length,337);assert.equal(d.nullStats.length,701);
const sorted=[...d.bootstrap].sort((a,b)=>a-b);
assert.deepEqual(d.ci,[quantile(sorted,.0315),quantile(sorted,.9685)]);
const wide=interval(d.bootstrap,99),narrow=interval(d.bootstrap,80);
assert.ok(wide[0]<=narrow[0]&&wide[1]>=narrow[1]);
const farther=testResult(d.nullStats,d.sample,{...d.parameters,nullMean:5000});
assert.equal(farther.reject,true);
assert.equal(d.test.pvalue,(d.nullStats.filter(t=>Math.abs(t)>=Math.abs(d.test.observed)).length+1)/702);
assert.throws(()=>run({...p,M:100,alpha:.1}));
console.log('Passed: population mean, known quantile/SE, deterministic reproduction, arbitrary inputs, CI nesting, p-value count, rejection, simulation resolution.');

// Surveys cannot select a household twice; bootstrap resampling can.
const ids=Array.from({length:20000},(_,i)=>i);
for(const n of [10,150,1000,20000]) {
 const survey=draw(ids,n,rng(123));
 assert.equal(survey.length,n);assert.equal(new Set(survey).size,n);
 assert.ok(survey.every(i=>i>=0&&i<ids.length));
}
assert.throws(()=>draw([1,2],3,rng(1)));
assert.deepEqual(bootstrap([1,9],3,()=>0),[1,1,1]);
assert.deepEqual(draw([1,9],2,()=>0),[1,9]);
console.log('Passed: no repeated household IDs at all supported sample sizes, full-population draw, invalid size, bootstrap replacement preserved.');
