// Test isolated source round selection logic without a WebGL canvas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import vm from 'node:vm';
const dir=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(resolve(dir,'../src/components/TriageScene.js'),'utf8');
const begin=source.indexOf('  // A browser refresh always starts a new operation in round 1.');
const end=source.indexOf('  const visuals = createPatientActors(scene, core);',begin);
assert.ok(begin>=0 && end>begin,'Round reset initialization is missing');
const initialization=source.slice(begin,end);
assert.match(source,/function replay\(\) \{ goToRound\(selectedRound\); \}/);

const storage=new Map();
let navigations=[];
function boot(href) {
  const loc={href,search:new URL(href).search,assign(next){navigations.push(next);}};
  const win={location:loc,history:{state:null,replaceState(_,__,url){loc.href=new URL(url,loc.href).href;loc.search=new URL(loc.href).search;}}};
  const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const context={
    window:win,sessionStorage:store,URL,URLSearchParams,Date,Math,JSON,
    MAX_ROUND:5,SCENARIOS:[0,1,2],
    createTriageCore:({round,seed,variant})=>({state:{round,seed,variant}}),
  };
  vm.runInNewContext(`${initialization}\nglobalThis.EXPORT={selectedRound,core,goToRound,replay};`,context,{filename:'TriageScene bootstrap'});
  return { ...context.EXPORT, loc };
}

// A stale URL or localStorage must not force round 4.
let game=boot('http://localhost:5188/?round=4');
assert.equal(game.selectedRound,1);
assert.equal(game.core.state.round,1);
assert.equal(game.loc.href,'http://localhost:5188/');
// User completes round 1 and explicitly navigates to round 2.
game.goToRound(2);
assert.equal(navigations.length,1);
assert.match(navigations[0],/round=2/);
game=boot(navigations.pop());
assert.equal(game.selectedRound,2);
assert.equal(game.loc.href,'http://localhost:5188/');
// Reload after successful transition starts over.
game=boot(game.loc.href);
assert.equal(game.selectedRound,1);
// Current round retry still works as a one-time transition.
game.goToRound(1);
game=boot(navigations.pop());
assert.equal(game.selectedRound,1);
console.log('PASS: stale round URL -> 1, next round transition -> 2, F5 -> 1, replay -> 1');
