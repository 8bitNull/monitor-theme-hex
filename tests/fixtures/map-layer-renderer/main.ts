import {createHexMapRenderer} from '../../../src/lib/mapHexRenderer'
import type {HexMapFrame,HexMapRenderer} from '../../../src/lib/mapHexRenderer'

let renderer:HexMapRenderer
let frame:HexMapFrame={width:1000,height:400,view:{x:0,y:0,k:1},theme:'dark',nodes:[],connections:[]}
const api={
 failures:0,
 mount(){renderer=createHexMapRenderer(document.querySelector('canvas')!,()=>{api.failures++});renderer.update(frame)},
 update(patch:Partial<HexMapFrame>){frame={...frame,...patch};renderer.update(frame)},
 dispose(){renderer.dispose()},
}
Object.assign(window,{mapFixture:api})
api.mount()
