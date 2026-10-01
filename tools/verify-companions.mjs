/** No art is embedded: verify the external migrated packages through public APIs. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {importPackage, analyzePerformance} from '../../DigitalCardFramework/src/presentation/index.js';
const root=path.resolve(process.argv[2]??'../PortableCardAssets');
const catalog=JSON.parse(await readFile(path.join(root,'cards.json'),'utf8'));
const results=[];
for(const side of ['night','day']){
  const record=catalog.find(c=>c.id.endsWith('.'+side));
  const pkg=await importPackage(new Uint8Array(await readFile(path.join(root,record.archive))));
  assert.equal(pkg.digest,record.digest);
  assert.equal(pkg.manifest.title,side==='night'?'Under the Same Sky':'Thinking of You');
  const nodes=pkg.scenes.get(pkg.manifest.faces.front.scene).nodes, byId=new Map(nodes.map(n=>[n.id,n]));
  assert.equal(byId.get('water-highlight').material.kind,'water');
  assert.ok(byId.has('lake'));assert.ok(byId.has('trees'));
  assert.ok(!JSON.stringify(nodes).includes('time.active'),'Companions must not gain an idle GIF-style loop');
  if(side==='night'){
    for(const id of ['gold','pink','cyan']){assert.equal(byId.get(id).material.kind,'bloom');assert.ok(byId.get(id).material.feather>0);}
    assert.equal(nodes.filter(n=>n.id.startsWith('star-')).length,6);
    assert.ok(byId.get('husky-tail').bindings);assert.ok(!byId.has('kino'));
  }else{
    const petals=nodes.filter(n=>n.id.startsWith('petal-'));
    assert.equal(petals.length,48);assert.ok(petals.every(n=>n.material.kind==='glitter'&&n.parallax));
    assert.ok(new Set(petals.map(n=>n.y)).size>20);
    assert.equal(byId.get('kino').animation.frames.length,8);
    assert.ok(new Set(byId.get('kino').animation.frames.map(f=>f.asset)).size>=3);
    assert.ok(byId.get('clouds').parallax);assert.ok(byId.has('sun-highlight'));assert.ok(byId.has('earring-glint'));
  }
  const report=analyzePerformance(pkg);
  assert.equal(report.accepted,true);
  results.push({id:record.id,digest:pkg.digest,nodes:nodes.length,assets:pkg.manifest.assets.length,performanceWarnings:report.issues.length,portable:true});
}
console.log(JSON.stringify({passed:true,cards:results},null,2));
