// SVG figures share exact data and drawing code between saved and interactive outputs.
const C={ink:'#263b39',teal:'#207d78',orange:'#bf603f',muted:'#6d7d78',grid:'#e5e9e3'};
const fmt=x=>Math.abs(x)>=100?Math.round(x).toLocaleString('en-US'):Number(x.toFixed(2)).toString();
const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${s}</text>`;
function frame(title,body) {return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 310" role="img" aria-label="${title}"><title>${title}</title><style>text{font-family:Arial,sans-serif;font-size:12px;fill:${C.ink}} .small{font-size:11px}</style>${body}</svg>`;}
export function histogram(values,{title,xlabel,domain,lines=[],shade,range}={}) {
  let lo=domain?.[0]??Math.min(...values), hi=domain?.[1]??Math.max(...values);
  if(hi===lo)hi=lo+1;
  const bins=40, counts=Array(bins).fill(0), step=(hi-lo)/bins;
  values.forEach(v=>counts[Math.max(0,Math.min(bins-1,Math.floor((v-lo)/step)))]++);
  const max=Math.max(...counts)/values.length*100, X=v=>58+(v-lo)/(hi-lo)*632, Y=v=>250-v/max*184;
  let body=text(58,22,title,'font-weight="bold"')+text(58,44,'Share of observations (%)','class="small"');
  for(let i=0;i<=4;i++){const v=max*i/4,y=Y(v);body+=`<path d="M58 ${y}H690" stroke="${C.grid}"/>`+text(50,y+4,fmt(v),'text-anchor="end"');}
  if(range)body+=`<rect x="${X(range[0])}" y="60" width="${X(range[1])-X(range[0])}" height="190" fill="${C.teal}" opacity=".1"/>`;
  counts.forEach((v,i)=>{const mid=lo+(i+.5)*step, y=Y(v/values.length*100);body+=`<rect x="${X(lo+i*step)+.4}" y="${y}" width="${632/bins-.8}" height="${250-y}" fill="${shade?.(mid)?C.orange:C.teal}" opacity=".8"><title>${fmt(lo+i*step)}–${fmt(lo+(i+1)*step)}: ${v} observations</title></rect>`;});
  for(let i=0;i<=4;i++)body+=text(X(lo+i*(hi-lo)/4),269,fmt(lo+i*(hi-lo)/4),'text-anchor="middle"');
  body+=text(374,298,xlabel,'text-anchor="middle"');
  lines.forEach((l,i)=>{let pos=Math.max(58,Math.min(690,X(l.value)));body+=`<path d="M${pos} 62V250" stroke="${l.color??C.orange}" stroke-width="2" stroke-dasharray="${l.dash?'5 4':'none'}"/>`+text(l.labelX??690,l.labelY??(36+i*15),`${l.label}: ${fmt(l.value)}`,`text-anchor="${l.labelX?'start':'end'}" class="small"`);});
  return frame(title,body);
}
export function coverageChart(rows,mu) {
  const shown=rows.slice(0,100),lo=Math.min(...shown.map(r=>r.low),mu),hi=Math.max(...shown.map(r=>r.high),mu), X=v=>58+(v-lo)/(hi-lo)*632;
  let body=text(58,22,'Figure 4 · Does each interval capture the truth?','font-weight="bold"')+text(58,43,'First '+shown.length+' independent samples · teal = covers μ; orange = misses μ','class="small"');
  shown.forEach((r,i)=>{let y=60+i*190/shown.length;body+=`<path d="M${X(r.low)} ${y}H${X(r.high)}" stroke="${r.covers?C.teal:C.orange}" stroke-width="1.4"><title>Sample ${i+1}: $${fmt(r.low)}–$${fmt(r.high)}; ${r.covers?'covers':'misses'}</title></path>`;});
  body+=`<path d="M${X(mu)} 52V252" stroke="${C.ink}" stroke-width="2"/>`;
  for(let i=0;i<=4;i++)body+=text(X(lo+i*(hi-lo)/4),272,fmt(lo+i*(hi-lo)/4),'text-anchor="middle"');
  body+=text(374,298,'Confidence interval for mean monthly spending ($)','text-anchor="middle"');return frame('Repeated-sample confidence interval coverage',body);
}
export function figures(d) {
 const p=d.parameters,s=d.sample,mu=p.mu;
 const domain=[0,Math.ceil(Math.max(...d.population)/1000)*1000];
 const observed=d.test.observed,c=d.test.critical;
 return {
 population:histogram(d.population,{title:'Figure 1 · The simulated population',xlabel:'Monthly household spending ($)',domain,lines:[{value:mu,label:'True mean μ'}]}),
 sample:histogram(s,{title:'Figure 2 · Your randomly drawn sample',xlabel:'Monthly household spending ($)',domain,lines:[{value:mu,label:'True mean μ',dash:true},{value:s.reduce((a,b)=>a+b)/s.length,label:'Sample mean',color:'#263b39'}]}),
 bootstrap:histogram(d.bootstrap,{title:'Figure 3 · Means from resampling your sample',xlabel:'Bootstrap sample mean ($)',domain:[Math.min(...d.bootstrap,mu)*.995,Math.max(...d.bootstrap,mu)*1.005],range:d.ci,lines:[{value:d.ci[0],label:'Lower CI',dash:true},{value:d.ci[1],label:'Upper CI',dash:true},{value:mu,label:'True mean μ',color:'#263b39',labelX:58,labelY:59}]}),
 coverage:coverageChart(d.coverage,mu),
 null:histogram(d.nullStats,{title:'Figure 5 · What happens if the null is true?',xlabel:'Test statistic t = (sample mean − null mean) / SE',domain:[Math.min(...d.nullStats,-Math.abs(observed))-.2,Math.max(...d.nullStats,Math.abs(observed))+.2],shade:v=>Math.abs(v)>=c,lines:[{value:observed,label:'Observed t',color:'#263b39'},{value:-c,label:'Rejection boundary',dash:true},{value:c,label:'Rejection boundary',dash:true}]}),
 pvalue:histogram(d.nullStats,{title:'Figure 6 · How extreme is your result?',xlabel:'Simulated null test statistic (standard errors)',domain:[Math.min(...d.nullStats,-Math.abs(observed))-.2,Math.max(...d.nullStats,Math.abs(observed))+.2],shade:v=>Math.abs(v)>=Math.abs(observed),lines:[{value:-Math.abs(observed),label:'−|observed t|',dash:true},{value:Math.abs(observed),label:'+|observed t|',dash:true}]})
 };
}
