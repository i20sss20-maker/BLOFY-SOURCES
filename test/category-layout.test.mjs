import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CategoryLayout } from '../src/category-layout.mjs';
import { CatalogStore } from '../src/catalog.mjs';

test('category layout moves, hides, persists and restores categories',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'blofy-category-order-'));
  try{
    const layout=await new CategoryLayout(dir).init();
    const names=['الأخبار','أفلام','رياضة'];
    const rows=names.map(name=>({name}));
    assert.deepEqual(layout.ordered('live',rows,{includeHidden:true}).map(x=>x.name),[...names].sort((a,b)=>a.localeCompare(b,'ar')));
    await layout.change('live','رياضة',{direction:'up'},names);
    const moved=layout.ordered('live',rows,{includeHidden:true}).map(x=>x.name);
    assert.ok(moved.indexOf('رياضة')<moved.indexOf('أفلام') || moved.indexOf('رياضة')<moved.indexOf('الأخبار'));
    await layout.change('live','رياضة',{hidden:true},names);
    assert.equal(layout.isVisible('live','رياضة'),false);
    assert.equal(layout.isVisible('movie','رياضة'),true);
    const restored=await new CategoryLayout(dir).init();
    assert.equal(restored.isVisible('live','رياضة'),false);
    assert.deepEqual(restored.ordered('live',rows,{includeHidden:true}).map(x=>x.name),moved);
    await restored.change('live','رياضة',{hidden:false},names);
    assert.equal(restored.isVisible('live','رياضة'),true);
    await assert.rejects(()=>restored.change('live','غير موجود',{hidden:true},names),/category_not_found/);
    await assert.rejects(()=>restored.change('movie','أفلام',{direction:'sideways'},names),/invalid_category_direction/);
  }finally{await rm(dir,{recursive:true,force:true})}
});

test('catalog applies saved category visibility without deleting source inventory',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'blofy-category-catalog-'));
  try{
    const store=await new CatalogStore({dataDir:dir}).init();
    store.replaceSource('licensed',[
      {sourceItemId:'n1',kind:'live',title:'Channel A',category:'News'},
      {sourceItemId:'n2',kind:'live',title:'Channel B',category:'Sports'},
      {sourceItemId:'s1',kind:'series_episode',title:'Episode',seriesTitle:'Show',category:'Drama'}
    ]);
    assert.equal(store.categoryRecords('live').length,2);
    assert.equal(store.stats().live,2);
    await store.changeCategory('live','News',{hidden:true});
    assert.equal(store.categoryRecords('live').length,1);
    assert.equal(store.categoryRecords('live',{includeHidden:true}).length,2);
    assert.equal(store.stats().live,2);
    assert.equal(store.isCategoryVisible('live','News'),false);
    store.replaceSource('licensed',[
      {sourceItemId:'n1',kind:'live',title:'Channel A',category:'News'},
      {sourceItemId:'n2',kind:'live',title:'Channel B',category:'Sports'}
    ]);
    assert.equal(store.isCategoryVisible('live','News'),false);
    assert.equal(store.categoryRecords('live').length,1);
  }finally{await rm(dir,{recursive:true,force:true})}
});
