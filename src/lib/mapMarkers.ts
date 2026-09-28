// Marker centers are geographic anchors. Dense regions remain accessible via the selector.
export function placeMapMarkers<T extends {x:number;y:number}>(points:T[]){
 return points.map(point=>({...point,anchorX:point.x,anchorY:point.y}))
}
