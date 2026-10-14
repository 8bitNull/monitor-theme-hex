import {build} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'node:path'
import {readFileSync,writeFileSync} from 'node:fs'
const standalone=process.argv.includes('--standalone')
const outDir=resolve(`artifacts/hex-world-map/${standalone?'standalone-build':'demo'}`)
await build({configFile:false,root:resolve('scripts/map-demo'),base:'./',plugins:[react()],resolve:{alias:{'@':resolve('src')}},build:{outDir,emptyOutDir:true,chunkSizeWarningLimit:1400,...(standalone?{rolldownOptions:{output:{codeSplitting:false}}}:{})}})
if(standalone){
 let html=readFileSync(resolve(outDir,'index.html'),'utf8')
 html=html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/,(_,path)=>`<script type="module">${readFileSync(resolve(outDir,path),'utf8').replaceAll('</script','<\\/script')}</script>`)
 html=html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/,(_,path)=>`<style>${readFileSync(resolve(outDir,path),'utf8')}</style>`)
 writeFileSync(resolve('artifacts/hex-world-map/hex-world-map-demo.html'),html)
}
