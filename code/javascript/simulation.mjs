// Shared numerical engine: used unchanged by Node and the offline article.
export const DEFAULTS = {n:150, mu:3000, B:1200, confidence:95, R:1000, M:10000, nullMean:3000, alpha:5, seed:20261101};
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}
export const mean = x => x.reduce((a,b)=>a+b,0)/x.length;
export function stats(x) { const m=mean(x), s=Math.sqrt(x.reduce((a,b)=>a+(b-m)**2,0)/(x.length-1)); return {mean:m, sd:s, se:s/Math.sqrt(x.length)}; }
export function quantile(sorted,p) { const h=(sorted.length-1)*p, i=Math.floor(h); return sorted[i]+(h-i)*((sorted[i+1]??sorted[i])-sorted[i]); }
export function population(mu) {
  const random=rng(71023), x=[];
  for(let i=0;i<20000;i++) { const z=Math.sqrt(-2*Math.log(1-random()))*Math.cos(2*Math.PI*random()); x.push(Math.exp(.45*z)); }
  const scale=mu/mean(x); return x.map(v=>v*scale);
}
// Simple random sampling without replacement via a sparse partial shuffle.
// Each new survey starts from the full population; bootstrap() separately resamples with replacement.
export function draw(pop,n,random) {
  if (!Number.isInteger(n) || n<1 || n>pop.length) throw Error('Sample size must be between 1 and population size.');
  const swaps=new Map(), out=[];
  for(let i=0;i<n;i++) {
    const j=i+Math.floor(random()*(pop.length-i));
    const picked=swaps.get(j)??j, displaced=swaps.get(i)??i;
    swaps.set(j,displaced);
    out.push(pop[picked]);
  }
  return out;
}
export function bootstrap(x,B,random) {
  const out=[];
  for(let b=0;b<B;b++) { let sum=0; for(let i=0;i<x.length;i++) sum+=x[Math.floor(random()*x.length)]; out.push(sum/x.length); }
  return out;
}
export function interval(values,confidence) { const s=[...values].sort((a,b)=>a-b), tail=(1-confidence/100)/2; return [quantile(s,tail),quantile(s,1-tail)]; }
export function coverageTrial(pop,p,random) { const x=draw(pop,p.n,random), ci=interval(bootstrap(x,p.B,random),p.confidence); return {low:ci[0],high:ci[1],covers:ci[0]<=p.mu&&ci[1]>=p.mu}; }
export function nullDraw(pop,p,random) { const x=draw(pop,p.n,random), s=stats(x); return (s.mean-p.nullMean)/s.se; }
export function testResult(ts,x,p) {
  const s=stats(x), observed=(s.mean-p.nullMean)/s.se;
  const extreme=ts.filter(t=>Math.abs(t)>=Math.abs(observed)).length;
  const pvalue=(extreme+1)/(ts.length+1);
  // Absolute-statistic ordering defines a two-sided test even with asymmetric null draws.
  const absolute=ts.map(Math.abs).sort((a,b)=>a-b);
  const critical=absolute[Math.min(ts.length-1,Math.ceil((1-p.alpha/100)*(ts.length+1))-1)];
  return {observed,extreme,pvalue,critical,reject:pvalue<=p.alpha/100};
}
export function run(p=DEFAULTS,redraw=0) {
  if(p.alpha/100 < 1/(p.M+1)) throw Error('Null simulations cannot resolve the selected significance level.');
  const pop=population(p.mu), x=draw(pop,p.n,rng(p.seed+100+redraw));
  const boot=bootstrap(x,p.B,rng(p.seed+200+redraw));
  const random=rng(p.seed+300), coverage=Array.from({length:p.R},()=>coverageTrial(pop,p,random));
  const nullPop=population(p.nullMean), nr=rng(p.seed+400), nullStats=Array.from({length:p.M},()=>nullDraw(nullPop,p,nr));
  return {parameters:{...p},redraw,population:pop,sample:x,bootstrap:boot,ci:interval(boot,p.confidence),coverage,nullStats,test:testResult(nullStats,x,p)};
}
