// Enlarge the geographic content, not the panel; keep every node/label in view.
(() => {
 for(const svg of document.querySelectorAll('.world-map[data-auto-frame]')){
  const draw=()=>{
   const width=svg.clientWidth,height=svg.clientHeight;if(!width||!height)return;
   const panel=svg.closest('.map-panel'),scene=svg.querySelector('.proposal-map-camera');
   const land=svg.querySelector('.proposal-map-land').getBBox(),targets=svg.querySelector('.proposal-map-targets').getBBox();
   if(!land.width||!targets.width||!targets.height)return;
   const bounds=svg.getBoundingClientRect(),heading=panel.querySelector('.map-heading').getBoundingClientRect(),footer=panel.querySelector('.map-footer').getBoundingClientRect();
   const left=18,right=width-18,top=Math.max(12,heading.bottom-bounds.top+8),bottom=Math.min(height-12,footer.top-bounds.top-8);
   const desiredFill=panel.closest('.map-workspace') ? 0.9 : 0.86;
   const scale=Math.min(width*desiredFill/land.width,(right-left)/targets.width,(bottom-top)/targets.height);
   const centered=(width-land.width*scale)/2-land.x*scale;
   const x=Math.max(left-targets.x*scale,Math.min(centered,right-(targets.x+targets.width)*scale));
   const y=(top+bottom)/2-(targets.y+targets.height/2)*scale;
   svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
   scene.setAttribute('transform',`translate(${x} ${y}) scale(${scale})`);
   svg.dataset.mapReady='true';
   svg.dataset.landFill=(land.width*scale/width).toFixed(3);
  };
  new ResizeObserver(draw).observe(svg);
  draw();document.fonts.ready.then(draw);
 }
})();
