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
  // WHATWG URL canonicalizes compressed, expanded and dotted IPv6
  // representations consistently. Scoped addresses are never public media.
  if(address.includes('%'))return true;
  let v;
  try{v=new URL('http://['+address+']/').hostname.slice(1,-1)}
  catch{return true}
  // IPv4-mapped IPv6 must inherit the same IPv4 admission policy.
  const mapped=/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v);
  if(mapped){
    const hi=parseInt(mapped[1],16),lo=parseInt(mapped[2],16);
    return blockedIP([hi>>>8,hi&255,lo>>>8,lo&255].join('.'));
  }
  const [first,second]=v.split(':').map(x=>parseInt(x||'0',16));
  // Admit native global unicast only; exclude special-use, transition
  // and documentation prefixes rather than guessing from textual starts.
  if((first&0xe000)!==0x2000)return true;
  return first===0x2001&&(second<0x200||second===0xdb8)||
    first===0x2002||first===0x3fff&&second<0x1000;
}
// Bound admission even when the OS resolver stalls. The underlying DNS call
// cannot necessarily be canceled, but a late result never authorizes a fetch.
export async function assertPublicMediaUrl(input,{lookup=dns.lookup,dnsTimeoutMs=4000}={}){
  if(!Number.isInteger(dnsTimeoutMs)||dnsTimeoutMs<20||dnsTimeoutMs>10000)
    throw new Error('relay_dns_timeout_invalid');
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
    let timer;
    try{
      records=await Promise.race([
        Promise.resolve().then(()=>lookup(hostname,{all:true,verbatim:true})),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('relay_origin_unresolved')),dnsTimeoutMs)})
      ]);
    }catch{throw new Error('relay_origin_unresolved')}
    finally{clearTimeout(timer)}
    if(!Array.isArray(records)||!records.length)throw new Error('relay_origin_unresolved');
    if(records.some(r=>blockedIP(r?.address)))throw new Error('relay_private_origin');
  }
  return url;
}
