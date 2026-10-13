import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseBlofysatCsv, BlofysatSelection } from '../src/blofysat-selection.mjs';

const HEAD='Type,XtreamId,CategoryId,Title,Category,Classification,MatchedBy\r\n';
test('private BLOFYSAT selection parses quoted Arabic, IDs and duplicates',async()=>{
  const csv='\uFEFF'+HEAD+
    'Live,8,1,"قناة, الخليج",السعودية,Arabic,label\r\n'+
    'Movies,9,2,"فيلم ""مترجم""",أفلام,Arabic,label\r\n'+
    'Series,10,3,مسلسل,دراما,Arabic,label\r\n'+
    'Live,8,1,"قناة, الخليج",السعودية,Arabic,label\r\n';
  const parsed=parseBlofysatCsv(csv);
  assert.deepEqual(parsed.counts,{live:1,vod:1,series:1});
  assert.equal(parsed.duplicates,1);
  assert.equal(parsed.entries[0].title,'قناة, الخليج');
  assert.equal(parsed.entries[1].title,'فيلم "مترجم"');
  const dir=await mkdtemp(path.join(tmpdir(),'blofysat-'));
  try{
    const storage=new BlofysatSelection({dataDir:dir,remoteLoad:async()=>null,remoteSave:async()=>false});
    await storage.init(); await storage.importCsv(csv);
    assert.equal(storage.contains('Live',8),true);
    assert.equal(storage.contains('Live',9),false);
    assert.equal(storage.summary().total,3);
    assert.equal(storage.summary().playable,false);
    const reloaded=await new BlofysatSelection({dataDir:dir,remoteLoad:async()=>null}).init();
    assert.equal(reloaded.contains('Series',10),true);
  }finally{await rm(dir,{recursive:true,force:true})}
});
test('reject malformed CSV without accepting partial data',()=>{
  assert.throws(()=>parseBlofysatCsv('Type,Title\nLive,No'),/missing_headers/);
  assert.throws(()=>parseBlofysatCsv(HEAD+'Live,abc,1,X,Y,A,B\n'),/invalid_row/);
  assert.throws(()=>parseBlofysatCsv(HEAD+'Live,1,1,"Unclosed,X,Y,A,B'),/unclosed_quote/);
});
