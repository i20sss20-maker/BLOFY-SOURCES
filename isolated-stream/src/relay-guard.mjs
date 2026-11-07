// Independently validate admin-supplied origin media URLs before using them.
// The public relay does NOT accept a URL from the player or query string.
import dns from 'node:dns/promises';
import net from 'node:net';

function blockedIP(address){
  if(!net.isIP(address))return true;
  if(net.isIP(address)===4){
    const p=address.split('.').map(Number),a=p[0],b=p[1];
    return a===0||a===10||a===127||a>=224||
      a===100&&b>=64&&b<=127||a===169&&b===254||
      a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&p[2]===0)||
      a===198&&(b===18||b===19)||a===192&&b===0&&p[2]===2||
      a===198&&b===51&&p[2]===100||a===203&&b===0&&p[2]===113;
  }
  const v=address.toLowerCase();
  if(v==='::'||v==='::1'||v.startsWith('fe80:')||v.startsWith('fc')||
      v.startsWith('fd')||v.startsWith('ff')||v.startsWith('2001:db8:'))
    return true;
  const m=/::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  return m?blockedIP(m[1]):false;
}
export async function assertPublicMediaUrl(input,{lookup=dns.lookup}={}){
  const raw=String(input||'');
  if(!raw||raw.length>2400||/[\r\n\\]/.test(raw))
    throw new Error('relay_bad_origin');
  let url;
  try{url=new URL(raw)}catch{throw new Error('relay_bad_origin')}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||
      url.hash||!url.hostname||url.port&&(+url.port<1||+url.port>65535))
    throw new Error('relay_bad_origin');
  const hostname=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(hostname==='localhost'||hostname.endsWith('.localhost')||
      hostname.endsWith('.local')||hostname.endsWith('.internal')||
      hostname.endsWith('.railway.internal'))
    throw new Error('relay_private_origin');
  if(net.isIP(hostname)){
    if(blockedIP(hostname))throw new Error('relay_private_origin');
  }else{
    if(!/^[a-z0-9.-]+$/.test(hostname))throw new Error('relay_bad_origin');
    let records;
    try{records=await lookup(hostname,{all:true,verbatim:true})}
    catch{throw new Error('relay_origin_unresolved')}
    if(!Array.isArray(records)||!records.length)throw new Error('relay_origin_unresolved');
    if(records.some(r=>blockedIP(r.address)))throw new Error('relay_private_origin');
  }
  return url;
}
