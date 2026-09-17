const STORAGE_ACCOUNT=String(process.env.AZURE_STORAGE_ACCOUNT||'').trim();
const STORAGE_CONTAINER=String(process.env.BLOFY_BLOB_CONTAINER||'blofy-xtream').trim().toLowerCase();
const AZURE_CLIENT_ID=String(process.env.AZURE_CLIENT_ID||'').trim();
const IDENTITY_ENDPOINT=String(process.env.IDENTITY_ENDPOINT||'').trim();
const IDENTITY_HEADER=String(process.env.IDENTITY_HEADER||'').trim();
const API_VERSION='2023-11-03';
let tokenCache=null,containerReady=false;

export function azureBlobEnabled(){return Boolean(STORAGE_ACCOUNT&&IDENTITY_ENDPOINT&&IDENTITY_HEADER)}
function blobUrl(name){return `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${encodeURIComponent(STORAGE_CONTAINER)}/${String(name).split('/').map(encodeURIComponent).join('/')}`}
async function accessToken(){
  if(!azureBlobEnabled())return '';
  if(tokenCache&&tokenCache.expiresAt>Date.now()+60_000)return tokenCache.token;
  const url=new URL(IDENTITY_ENDPOINT);url.searchParams.set('resource','https://storage.azure.com/');url.searchParams.set('api-version','2019-08-01');if(AZURE_CLIENT_ID)url.searchParams.set('client_id',AZURE_CLIENT_ID);
  const r=await fetch(url,{headers:{'X-IDENTITY-HEADER':IDENTITY_HEADER}});if(!r.ok)throw new Error(`azure_identity_${r.status}`);const j=await r.json();if(!j.access_token)throw new Error('azure_identity_missing_token');
  const exp=Number(j.expires_on);tokenCache={token:j.access_token,expiresAt:Number.isFinite(exp)?exp*1000:Date.now()+30*60_000};return tokenCache.token;
}
function azureHeaders(token,extra={}){return{authorization:`Bearer ${token}`,'x-ms-version':API_VERSION,'x-ms-date':new Date().toUTCString(),...extra}}
async function ensureContainer(){
  if(!azureBlobEnabled()||containerReady)return;
  const token=await accessToken(),url=`https://${STORAGE_ACCOUNT}.blob.core.windows.net/${encodeURIComponent(STORAGE_CONTAINER)}?restype=container`;
  const r=await fetch(url,{method:'PUT',headers:azureHeaders(token,{'content-length':'0'})});
  if(!r.ok&&r.status!==409)throw new Error(`azure_container_${r.status}`);containerReady=true;
}
export async function loadRemoteJson(name){
  if(!azureBlobEnabled())return null;
  const token=await accessToken();const r=await fetch(blobUrl(name),{headers:azureHeaders(token)});
  if(r.status===404)return null;if(!r.ok)throw new Error(`azure_blob_read_${r.status}`);return r.json();
}
export async function saveRemoteJson(name,value){
  if(!azureBlobEnabled())return false;
  await ensureContainer();const token=await accessToken(),body=Buffer.from(JSON.stringify(value));
  const r=await fetch(blobUrl(name),{method:'PUT',headers:azureHeaders(token,{'x-ms-blob-type':'BlockBlob','content-type':'application/json; charset=utf-8','content-length':String(body.length)}),body});
  if(!r.ok)throw new Error(`azure_blob_write_${r.status}`);return true;
}
export function storageStatus(){return{mode:azureBlobEnabled()?'azure-blob':'filesystem',account:azureBlobEnabled()?STORAGE_ACCOUNT:'',container:azureBlobEnabled()?STORAGE_CONTAINER:''}}
