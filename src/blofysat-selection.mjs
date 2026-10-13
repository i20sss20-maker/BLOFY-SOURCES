import path from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { loadRemoteJson, saveRemoteJson } from './storage.mjs';

const FILE = 'blofysat-selection.json';
const MAX_BYTES = 16 * 1024 * 1024;
const MAX_ROWS = 100_000;
const TYPES = new Set(['Live', 'Movies', 'Series']);

function decodeCsv(csv) {
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"') {
        if (csv[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(field);
      field = ''; closed = false;
      if (c !== ',') {
        if (row.some(v => v.trim())) rows.push(row);
        row = [];
        if (c === '\r' && csv[i + 1] === '\n') i++;
        if (rows.length > MAX_ROWS + 1) throw new Error('blofysat_csv_too_many_rows');
      }
    } else if (c === '"' && !field && !closed) quoted = true;
    else if (c === ' ' && !field && !closed) { /* spaces before a quoted cell */ }
    else if (closed && c === ' ') { /* spaces after quoted cell */ }
    else if (c === '"') throw new Error('blofysat_csv_invalid_quote');
    else field += c;
    if (field.length > 5000) throw new Error('blofysat_csv_field_too_long');
  }
  if (quoted) throw new Error('blofysat_csv_unclosed_quote');
  row.push(field);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

export function parseBlofysatCsv(input) {
  if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > MAX_BYTES) throw new Error('blofysat_csv_too_large');
  const rows = decodeCsv(input.replace(/^\uFEFF/, ''));
  const header = rows.shift()?.map(v => v.trim()) || [];
  const required = ['Type', 'XtreamId', 'CategoryId', 'Title', 'Category'];
  if (!required.every(col => header.includes(col))) throw new Error('blofysat_csv_missing_headers');
  const index = Object.fromEntries(header.map((v,i) => [v,i]));
  const entries = [], seen = new Set();
  let duplicates = 0;
  const counts = { live:0, vod:0, series:0 };
  for (const columns of rows) {
    if (columns.length !== header.length) throw new Error('blofysat_csv_invalid_columns');
    const get = k => String(columns[index[k]] ?? '').trim();
    const type = get('Type'), id = get('XtreamId'), categoryId = get('CategoryId');
    const title = get('Title'), category = get('Category');
    if (!TYPES.has(type) || !/^[0-9]{1,15}$/.test(id) || !/^[0-9]{1,15}$/.test(categoryId) || !title || title.length > 500 || category.length > 300) throw new Error('blofysat_csv_invalid_row');
    const key = type + ':' + id;
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    entries.push({ type, id, categoryId, title, category, classification:get('Classification').slice(0,120) });
    counts[type === 'Live' ? 'live' : type === 'Movies' ? 'vod' : 'series']++;
  }
  if (!entries.length) throw new Error('blofysat_csv_empty');
  return { schemaVersion:1, label:'BLOFYSAT', importedAt:new Date().toISOString(), metadataOnly:true, counts, duplicates, entries };
}

export class BlofysatSelection {
  constructor({dataDir='./data',remoteLoad=loadRemoteJson,remoteSave=saveRemoteJson}={}) {
    this.dataDir=path.resolve(dataDir); this.file=path.join(this.dataDir,FILE);
    this.remoteLoad=remoteLoad; this.remoteSave=remoteSave;
    this.data=null; this.ids=new Set();
  }
  set(value) {
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.entries) || value.entries.length > MAX_ROWS) return;
    this.data=value;
    this.ids=new Set(value.entries.map(x=>x.type + ':' + x.id));
  }
  async init() {
    await mkdir(this.dataDir,{recursive:true}); let value=null;
    try { value=await this.remoteLoad(FILE); } catch(error) { console.warn('BLOFYSAT remote selection read failed:',error.message); }
    if (!value) {
      try { value=JSON.parse(await readFile(this.file,'utf8')); }
      catch(error) { if(error.code !== 'ENOENT') console.warn('BLOFYSAT selection load skipped:',error.message); }
    }
    this.set(value); return this;
  }
  summary() {
    const d=this.data;
    return {name:'BLOFYSAT',imported:Boolean(d),metadataOnly:true,playable:false,
      counts:d?.counts || {live:0,vod:0,series:0},total:d?.entries?.length || 0,
      duplicates:d?.duplicates || 0,importedAt:d?.importedAt || null,
      note:'Catalog metadata only. Xtream playback requires verified licensed sources.'};
  }
  contains(type,id) { return this.ids.has(type + ':' + String(id)); }
  async importCsv(csv) {
    const candidate=parseBlofysatCsv(csv);
    const tmp=this.file + '.tmp';
    await writeFile(tmp,JSON.stringify(candidate),'utf8');
    await rename(tmp,this.file);
    await this.remoteSave(FILE,candidate);
    this.set(candidate);
    return this.summary();
  }
}
