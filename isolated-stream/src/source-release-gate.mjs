// A single listener on the provider release promise, independent of viewer count.
// Timed-out and disconnected HTTP clients must not remain retained by an
// indefinitely pending provider cancellation. Never infer provider release.
export function createSourceReleaseGate(prior, released, onSettled, clock=Date.now){
 const gate={since:prior?.since??clock(),settled:false,waiters:new Set(),promise:null};
 gate.promise=Promise.all([prior?.promise??Promise.resolve(),released]).then(()=>{
  gate.settled=true;
  onSettled(gate);
  for(const notify of gate.waiters)notify('released');
  gate.waiters.clear();
 });
 return gate;
}
export function waitForSourceRelease(gate,req,res,timeoutMs=1500){
 const gone=()=>res.destroyed||res.writableEnded||req.aborted===true;
 if(gone())return Promise.resolve('abandoned');
 if(gate.settled)return Promise.resolve('released');
 return new Promise(resolve=>{
  let timer,done=false;
  function finish(outcome){
   if(done)return;
   done=true;
   clearTimeout(timer);
   gate.waiters.delete(finish);
   req.removeListener('aborted',onGone);
   res.removeListener('close',onGone);
   resolve(outcome);
  }
  const onGone=()=>finish('abandoned');
  gate.waiters.add(finish);
  req.once('aborted',onGone);
  res.once('close',onGone);
  timer=setTimeout(()=>finish('timeout'),timeoutMs);
  if(gone())finish('abandoned');
  else if(gate.settled)finish('released');
 });
}
