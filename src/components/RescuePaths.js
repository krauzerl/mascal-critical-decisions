/**
 * Small deterministic 2D navigation utility for rescue-team visuals and timings.
 * XY ground, Z up. Pure JS; no Three.js required by tests.
 * Patient origins are never moved. Navigation shapes match static game props.
 */
export const EVAC_POINT = Object.freeze({ x: -104, y: -118 });
export const TEAM_STARTS = Object.freeze([
  { x: -106, y: -145 },
  { x: -118, y: -153 },
]);

// Approximate static footprint; extra margin permits passage around set dressing.
const obstructions = [
  { x: 80, y: 60, width: 112, depth: 34, rotation: 0.25, margin: 7 },
  { x: -65, y: -104, width: 52, depth: 20, rotation: Math.PI / 12, margin: 7 },
  { x: -131, y: 99, width: 34, depth: 44, rotation: -Math.PI / 2, margin: 6 },
  { x: 165, y: -112, width: 42, depth: 21, rotation: -Math.PI / 7, margin: 5 },
];
const bounds = { minX: -290, maxX: 290, minY: -270, maxY: 250 };
const STEP = 12;
const W = Math.floor((bounds.maxX - bounds.minX) / STEP) + 1;
const H = Math.floor((bounds.maxY - bounds.minY) / STEP) + 1;
const posOf = (ix, iy) => ({ x: bounds.minX + ix * STEP, y: bounds.minY + iy * STEP });
const cellOf = (p) => ({
  ix: Math.max(0, Math.min(W-1, Math.round((p.x - bounds.minX) / STEP))),
  iy: Math.max(0, Math.min(H-1, Math.round((p.y - bounds.minY) / STEP))),
});
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);

export function isRescueWalkable(p) {
  if (p.x < bounds.minX || p.x > bounds.maxX || p.y < bounds.minY || p.y > bounds.maxY) return false;
  for (const o of obstructions) {
    const dx=p.x-o.x, dy=p.y-o.y;
    const c=Math.cos(o.rotation), s=Math.sin(o.rotation);
    const lx= dx*c + dy*s;
    const ly=-dx*s + dy*c;
    if (Math.abs(lx) < o.width / 2 + o.margin && Math.abs(ly) < o.depth / 2 + o.margin) return false;
  }
  return true;
}

export function routeIsClear(a,b) {
  const length = dist(a,b);
  const n = Math.max(1,Math.ceil(length / 5));
  for (let i=1;i<n;i++) {
    const t=i/n;
    if (!isRescueWalkable({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})) return false;
  }
  return true;
}

export function routeDistance(path) {
  return path.slice(1).reduce((sum,p,i)=>sum+dist(path[i],p),0);
}

export function positionOnRoute(path, progress) {
  if (!path?.length) return { x:0,y:0 };
  if (path.length===1) return { ...path[0] };
  const length=routeDistance(path);
  const target=length*Math.max(0,Math.min(1,progress));
  let traveled=0;
  for (let i=1;i<path.length;i++) {
    const d=dist(path[i-1],path[i]);
    if (target<=traveled+d || i===path.length-1) {
      const t=d>0?Math.max(0,Math.min(1,(target-traveled)/d)):1;
      return {x:path[i-1].x+(path[i].x-path[i-1].x)*t,
        y:path[i-1].y+(path[i].y-path[i-1].y)*t};
    }
    traveled+=d;
  }
  return { ...path.at(-1) };
}

// Only 2 teams: short grid-based A* is cheap, and runs on assignment (not each frame).
export function planRescueRoute(start, end) {
  if (dist(start,end)<0.01) return [{...start},{...end}];
  if (routeIsClear(start,end)) return [{...start},{...end}];
  const source=cellOf(start), destination=cellOf(end);
  const index=(x,y)=>y*W+x;
  const open=[source];
  const origin=index(source.ix,source.iy), goal=index(destination.ix,destination.iy);
  const costs=new Float64Array(W*H).fill(Infinity);
  const parent=new Int32Array(W*H).fill(-1);
  const closed=new Uint8Array(W*H);
  costs[origin]=0;
  const heuristic=(ix,iy)=>Math.hypot(destination.ix-ix,destination.iy-iy)*STEP;
  const moves=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  let best=origin,bestDist=Infinity;
  let iterations=0;
  while(open.length && iterations++ < W*H) {
    let bestOpen=0, priority=Infinity;
    for(let i=0;i<open.length;i++) {
      const q=open[i], id=index(q.ix,q.iy);
      const score=costs[id]+heuristic(q.ix,q.iy);
      if(score<priority){priority=score; bestOpen=i;}
    }
    const node=open.splice(bestOpen,1)[0];
    const curr=index(node.ix,node.iy);
    if(closed[curr]) continue;
    closed[curr]=1;
    if(heuristic(node.ix,node.iy)<bestDist){bestDist=heuristic(node.ix,node.iy);best=curr;}
    if(curr===goal){best=curr;break;}
    for(const [dx,dy] of moves){
      const nx=node.ix+dx, ny=node.iy+dy;
      if(nx<0||ny<0||nx>=W||ny>=H) continue;
      const pt=posOf(nx,ny);
      if (!isRescueWalkable(pt)) continue;
      if (dx&&dy && (!isRescueWalkable(posOf(node.ix+dx,node.iy)) || !isRescueWalkable(posOf(node.ix,node.iy+dy)))) continue;
      const ni=index(nx,ny);
      const nd=costs[curr]+Math.hypot(dx,dy)*STEP;
      if(nd>=costs[ni]) continue;
      costs[ni]=nd;parent[ni]=curr;
      open.push({ix:nx,iy:ny});
    }
  }
  if(best===origin) return [{...start},{...end}];
  const cells=[];let current=best;let safety=0;
  while(current!==-1 && safety++<W*H){
    cells.push(posOf(current % W,Math.floor(current/W)));
    current=parent[current];
  }
  cells.reverse();
  const raw=[{...start},...cells,{...end}];
  // Relax final points even when a patient is next to an obstruction.
  const simplified=[raw[0]];
  let i=0;
  while(i<raw.length-1) {
    let next=i+1;
    for(let j=raw.length-1;j>i+1;j--){if(routeIsClear(raw[i],raw[j])){next=j;break;}}
    simplified.push(raw[next]);i=next;
  }
  return simplified;
}
