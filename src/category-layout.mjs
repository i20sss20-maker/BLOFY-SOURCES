import crypto from 'node:crypto';
import path from 'node:path';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';

const KINDS=new Set(['live','movie','series']);
const empty=()=>({order:[],hidden:[]});
const clean=(value)=>String(value||'').trim().slice(0,160);
const unique=(rows)=>[...new Set((Array.isArray(rows)?rows:[]).map(clean).filter(Boolean))].slice(0,5000);

export class CategoryLayout {
  constructor(dataDir){
    this.path=path.join(dataDir,'category-layout.json');
    this.current={live:empty(),movie:empty(),series:empty()};
    this.hiddenSets={live:new Set(),movie:new Set(),series:new Set()};
    this.queue=Promise.resolve();
  }
  async init(){
    try{
      const data=JSON.parse(await readFile(this.path,'utf8'));
      for(const kind of KINDS){
        this.current[kind]={order:unique(data?.[kind]?.order),hidden:unique(data?.[kind]?.hidden)};
      }
      this._updateHidden();
    }catch(error){if(error?.code!=='ENOENT')console.warn('category layout restored to defaults:',String(error.message||error))}
    return this;
  }
  _kind(kind){if(!KINDS.has(kind))throw new Error('invalid_category_kind');return kind}
  _updateHidden(){for(const kind of KINDS)this.hiddenSets[kind]=new Set(this.current[kind].hidden)}
  isVisible(kind,name){this._kind(kind);return !this.hiddenSets[kind].has(clean(name))}
  ordered(kind,records,{includeHidden=false}={}){
    this._kind(kind);
    const prefs=this.current[kind],ranks=new Map(prefs.order.map((name,i)=>[name,i]));
    return records.filter(x=>includeHidden||!this.hiddenSets[kind].has(clean(x.name)))
      .sort((a,b)=>{
        const ai=ranks.has(a.name)?ranks.get(a.name):Infinity;
        const bi=ranks.has(b.name)?ranks.get(b.name):Infinity;
        return ai-bi||String(a.name).localeCompare(String(b.name),'ar');
      });
  }
  async change(kind,name,{direction,hidden}={},availableNames=[]){
    this._kind(kind);
    name=clean(name);
    if(!name||!availableNames.includes(name))throw new Error('category_not_found');
    if(direction!==undefined&&!['up','down','top'].includes(direction))throw new Error('invalid_category_direction');
    if(hidden!==undefined&&typeof hidden!=='boolean')throw new Error('invalid_category_visibility');
    if(direction===undefined&&hidden===undefined)throw new Error('missing_category_change');
    const prefs=this.current[kind];
    if(direction){
      const names=this.ordered(kind,availableNames.map(name=>({name})),{includeHidden:true}).map(x=>x.name);
      const index=names.indexOf(name),next=index+(direction==='up'?-1:1);
      if(next>=0&&next<names.length)[names[index],names[next]]=[names[next],names[index]];
      prefs.order=names;
    }
    if(hidden!==undefined){
      const selected=new Set(prefs.hidden);
      if(hidden)selected.add(name);else selected.delete(name);
      prefs.hidden=[...selected];
    }
    this._updateHidden();
    // Keep updates serialized and atomically rename each snapshot to avoid corrupting
    // persisted preferences during concurrent requests.
    const snapshot=JSON.stringify({schemaVersion:1,...this.current});
    this.queue=this.queue.catch(()=>{}).then(async()=>{
      await mkdir(path.dirname(this.path),{recursive:true});
      const temp=this.path+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
      await writeFile(temp,snapshot,{encoding:'utf8',mode:0o600});
      await rename(temp,this.path);
    });
    await this.queue;
    return true;
  }
}
