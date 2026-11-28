// Operator-only diagnosis: never log, persist or return upstream bodies, URLs
// or headers. Return only one vetted reason enum when the provider is explicit.
const PATTERNS=Object.freeze([
  ['network_restriction', /\b(?:ip|isp|geo(?:graphic|location)?|country|region)\b.{0,50}\b(?:block(?:ed)?|restrict(?:ed)?|deny|denied|not allowed|forbidden)\b|\b(?:block(?:ed)?|restrict(?:ed)?|deny|denied|not allowed|forbidden)\b.{0,50}\b(?:ip|isp|geo(?:graphic|location)?|country|region)\b/i],
  ['connection_limit', /\b(?:too many (?:active )?(?:streams|connections)|connection limit|maximum (?:streams|connections)|concurrent (?:stream|connection) limit|already watching)\b/i],
  ['restream_not_allowed', /\b(?:restream(?:ing|er)?\s+(?:not allowed|disabled|denied|forbidden)|not allowed to restream)\b/i],
  ['account_expired', /\b(?:account|subscription|line)?\s*(?:has )?expired\b/i],
  ['account_inactive', /\b(?:account|subscription|line)\s+(?:blocked|disabled|suspended|banned)\b|\b(?:blocked|disabled|suspended|banned)\s+(?:account|subscription|line)\b/i],
  ['format_restricted', /\b(?:format|extension|container)\s+(?:not allowed|unsupported|not supported|denied)\b/i]
]);
export function classifyProviderDenialHint(value){
  const text=String(value||'').slice(0,1024);
  for(const [hint,pattern] of PATTERNS)if(pattern.test(text))return hint;
  return null;
}
export async function readProviderDenialHint(response,{timeoutMs=350}={}){
  if(!response||![401,403,404,429,456].includes(response.status))return null;
  const headerHint=classifyProviderDenialHint([
    response.headers?.get('x-error-reason'),response.headers?.get('x-error-message')
  ].filter(Boolean).join(' '));
  if(headerHint)return headerHint;
  if(!response.body)return null;
  let reader,timer;
  try{
    reader=response.body.getReader();
    const first=await Promise.race([
      reader.read(),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(null),timeoutMs);})
    ]);
    if(!first||first.done||!first.value)return null;
    return classifyProviderDenialHint(Buffer.from(first.value).subarray(0,1024).toString('utf8'));
  }catch{return null;}
  finally{
    if(timer)clearTimeout(timer);
    if(reader){try{void reader.cancel().catch(()=>{})}catch{}
      try{reader.releaseLock()}catch{}}
  }
}
