// Responsive SVG sizing for the static proposal; every chart uses the same data.
(() => {
 const series=window.proposalHistory;
 if(!series?.length)return;
 const namespace='http://www.w3.org/2000/svg';
 for(const svg of document.querySelectorAll('svg[data-history-chart]')){
  const draw=()=>{
   const width=svg.clientWidth,height=svg.clientHeight;if(!width||!height)return;
   svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
   const compact=svg.hasAttribute('data-compact'),left=compact?28:42,right=12,top=12,bottom=26;
   const plotWidth=width-left-right,plotHeight=height-top-bottom;
   const x=i=>left+i/(series.length-1)*plotWidth,y=value=>top+(50-value)/50*plotHeight;
   const line=series.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
   const name=compact?'phone-history-fill':'desktop-history-fill';
   svg.innerHTML=`<defs><linearGradient id="${name}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".15"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".005"/></linearGradient></defs>`;
   function add(tag,attrs,text){const el=document.createElementNS(namespace,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;svg.append(el);return el;}
   for(const value of compact?[0,25,50]:[0,10,20,30,40,50]){
    add('line',{x1:left,x2:width-right,y1:y(value),y2:y(value),stroke:'var(--line)','stroke-dasharray':'2 5'});
    add('text',{x:0,y:y(value)+3,fill:'var(--muted)','font-size':compact?9:10},`${value}%`);
   }
   add('path',{d:`${line}L${width-right},${height-bottom}H${left}Z`,fill:`url(#${name})`});
   add('path',{d:line,fill:'none',stroke:'var(--accent)','stroke-width':compact?1.7:2});
   for(const i of compact?[0,60,120]:[0,20,40,60,80,100,120]){
    const minute=series[i].minute,label=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
    add('text',{x:x(i),y:height-6,fill:'var(--muted)','font-size':compact?9:10,'text-anchor':i===0?'start':i===120?'end':'middle'},label);
   }
   if(!compact){add('line',{x1:x(80),x2:x(80),y1:top,y2:height-bottom,stroke:'var(--accent)','stroke-opacity':.3,'stroke-dasharray':'4 4'});add('circle',{cx:x(80),cy:y(series[80].value),r:4.5,fill:'var(--accent)',stroke:'var(--card)','stroke-width':2});}
   add('circle',{cx:x(120),cy:y(series[120].value),r:3,fill:'var(--accent)',stroke:'var(--card)','stroke-width':1.5});
   svg.dataset.ready='true';
  };
  const observer=new ResizeObserver(draw);observer.observe(svg);draw();
 }
})();
