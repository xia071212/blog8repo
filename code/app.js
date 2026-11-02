const $=id=>document.getElementById(id);
const dollars=x=>'$'+x.toLocaleString('en-US',{maximumFractionDigits:2});
let current=BASELINE;
const controls=['n','mu','seed','B','confidence','R','nullMean','M','alpha'];
function render(d) {
 const f=figures(d),p=d.parameters,s=stats(d.sample),t=d.test;
 for(const [key,id] of Object.entries({population:'population',sample:'sample',bootstrap:'bootstrap-figure',coverage:'coverage-figure',null:'null-figure',pvalue:'pvalue-figure'}))$(id).innerHTML=f[key];
 $('sample-result').textContent=`${p.n} distinct households · sample mean ${dollars(s.mean)} · true mean ${dollars(p.mu)} · difference ${dollars(s.mean-p.mu)}. Redraw ${d.redraw}; seed ${p.seed}.`;
 $('bootstrap-result').textContent=`${p.B.toLocaleString()} resamples · ${p.confidence}% CI: ${dollars(d.ci[0])} to ${dollars(d.ci[1])}. ${d.ci[0]<=p.mu&&d.ci[1]>=p.mu?'This interval contains':'This interval misses'} the known true mean.`;
 const k=d.coverage.filter(r=>r.covers).length,rate=k/p.R,mc=100*Math.sqrt(rate*(1-rate)/p.R);
 $('coverage-result').textContent=`${k.toLocaleString()} / ${p.R.toLocaleString()} intervals contain μ: ${(100*rate).toFixed(1)}% coverage. Target: ${p.confidence}%. Monte Carlo standard error (noise from a finite number of simulations): ${mc.toFixed(2)} percentage points. Every interval uses ${p.B} bootstrap resamples of ${p.n} fresh draws.`;
 $('test-statistic').textContent=`t = (${dollars(s.mean)} − ${dollars(p.nullMean)}) / ${dollars(s.se)} = ${t.observed.toFixed(3)}`;
 $('test-result').textContent=`${t.extreme.toLocaleString()} of ${p.M.toLocaleString()} null statistics are at least as extreme. p = (${t.extreme} + 1) / (${p.M} + 1) = ${t.pvalue.toFixed(5)}. At α = ${p.alpha}%, ${t.reject?'reject':'do not reject'} H₀. Rejection boundaries: ±${t.critical.toFixed(3)}; shaded bins approximate the exact boundaries. Simulation noise in the estimated p-value (Monte Carlo standard error) ≈ ${Math.sqrt(t.pvalue*(1-t.pvalue)/p.M).toFixed(4)}.`;
}
function read(keys) {
 const p={...current.parameters};
 for(const id of keys){const el=$(id);if(!el.reportValidity())throw Error('Please correct the highlighted input.');p[id]=Number(el.value);}
 if(p.alpha/100 < 1/(p.M+1))throw Error('Increase null simulations or significance: the smallest attainable p-value is 1 / (simulations + 1).');
 if(p.n*p.B*p.R>500000000)throw Error('This combination exceeds 500 million bootstrap draws. Reduce sample size, resamples, or experiments and try again.');
 return p;
}
// Run heavy simulations off the main thread, keeping the article responsive.
const workerCode=document.getElementById('engine').textContent+`\nonmessage = ({data}) => { const {p,redraw,mode,previous}=data; if(mode==='test'){const np=population(p.nullMean),r=rng(p.seed+400);const ns=Array.from({length:p.M},()=>nullDraw(np,p,r));postMessage({...previous,parameters:p,nullStats:ns,test:testResult(ns,previous.sample,p)});}else postMessage(run(p,redraw)); };`;
async function update(mode){
 let p;try{p=read(mode==='sample'?['n','mu','seed']:mode==='bootstrap'?['B','confidence','R']:['nullMean','M','alpha']);}catch(e){$('status').textContent=e.message;return;}
 const redraw=mode==='sample'?current.redraw+1:current.redraw;
 document.querySelectorAll('button,input').forEach(e=>e.disabled=true);
 $('status').textContent='Computing actual samples and resamples…';
 const url=URL.createObjectURL(new Blob([workerCode],{type:'text/javascript'})),worker=new Worker(url);
 worker.onmessage=({data})=>{current=data;render(current);finish('Updated. All figures and readouts show the applied settings.');};
 worker.onerror=e=>finish('Simulation could not finish: '+e.message);
 function finish(message){worker.terminate();URL.revokeObjectURL(url);document.querySelectorAll('button,input').forEach(e=>e.disabled=false);$('status').textContent=message;}
 worker.postMessage({p,redraw,mode,previous:mode==='test'?current:null});
}
$('redraw').onclick=()=>update('sample');$('resample').onclick=()=>update('bootstrap');$('test').onclick=()=>update('test');
$('reset').onclick=()=>{current=BASELINE;controls.forEach(k=>$(k).value=DEFAULTS[k]);render(current);$('status').textContent='Reproducible baseline restored.';};
controls.forEach(id=>$(id).addEventListener('input',()=>{$('status').textContent='Settings edited. Use the button in that section to apply them; figures still show the previous applied settings.';}));
render(current);
