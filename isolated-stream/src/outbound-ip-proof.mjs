// Opt-in, one-shot proof of the Railway service's actual public outbound IPs.
// Only requests a public IP echo from a fixed HTTPS endpoint. No provider
// credentials, subscriber data, source URLs, cookies or auth headers are sent.
// Several independent IPv4 connections are needed because Railway can load
// balance static egress over three IPs. An observed subset is NOT a full list.
import https from 'node:https';
import net from 'node:net';

const ECHO='https://api.ipify.org/';
export function validPublicIpv4(raw){
 const value=String(raw||'').trim();
 if(net.isIP(value)!==4)return null;
 const [a,b]=value.split('.').map(Number);
 if(a===0||a===10||a===127||a>=224||a===169&&b===254||
    a===172&&b>=16&&b<=31||a===192&&b===168||
    a===100&&b>=64&&b<=127)return null;
 return value;
}
export function readOutboundIpv4({get=https.get,timeoutMs=4500}={}){
 return new Promise(resolve=>{
  let done=false,req,bytes=0,chunks=[];
  const finish=value=>{if(done)return;done=true;resolve(value);};
  try{
   req=get(ECHO,{agent:false,family:4,timeout:timeoutMs,headers:{
    accept:'text/plain',connection:'close','user-agent':'BLOFY-STREAM-Egress-IP-Check/1.0'
   }},res=>{
    if(res.statusCode!==200){res.resume();return finish(null);}
    res.on('data',chunk=>{
     bytes+=chunk.byteLength;
     if(bytes>80){req.destroy();finish(null);}
     else chunks.push(Buffer.from(chunk));
    });
    res.once('end',()=>finish(validPublicIpv4(Buffer.concat(chunks).toString('utf8'))));
    res.once('error',()=>finish(null));
   });
   req.once('timeout',()=>{req.destroy();finish(null);});
   req.once('error',()=>finish(null));
  }catch{finish(null);}
 });
}
export async function probeOutboundIpv4({
 probe=readOutboundIpv4,attempts=9
}={}){
 const count=Math.max(1,Math.min(12,Number.isInteger(attempts)?attempts:9));
 const values=await Promise.all(Array.from({length:count},async()=>{
  try{return validPublicIpv4(await probe());}catch{return null;}
 }));
 const observed=[...new Set(values.filter(Boolean))].sort();
 return {ok:observed.length>0,service:'BLOFY-STREAM',
  kind:'railway_public_egress',attempts:count,successful:values.filter(Boolean).length,
  observedIpv4:observed,observedCount:observed.length,
  assignedPoolExhaustivelyVerified:false,providerAllowedTheseIps:null,
  credentialsTransmitted:false,customerTrafficChanged:false};
}
