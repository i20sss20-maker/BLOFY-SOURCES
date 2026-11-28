// Test-only worker. No upload, no arbitrary URL, no provider/stream API calls.
import {createServer} from 'node:http';
import {labBearerAuthorized} from './access.mjs';
import {runSyntheticDecoder} from './decoder.mjs';
import {runSyntheticAudioMatrix} from './audio-codec-matrix.mjs';
import {readOwnerSampleRequest,analyzeOwnerTsSample} from './owner-ts-sample.mjs';

const PORT=Number(process.env.PORT||3000);
const RUN_SECRET=process.env.BLOFY_DECODER_LAB_TOKEN||'';
const VIEW_SECRET=process.env.BLOFY_DECODER_LAB_VIEW_TOKEN||'';
const SAMPLE_SECRET=process.env.BLOFY_DECODER_LAB_SAMPLE_TOKEN||'';
const MIN_INTERVAL_MS=15*60*1000;
const headers={
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; frame-ancestors 'none'"
};
let report=null,lastStarted=0,busy=false;
let sampleBusy=false,lastSampleAt=0;
const tokenConfigured=()=>RUN_SECRET.length>=40&&VIEW_SECRET.length>=40;
const reportAuth=req=>labBearerAuthorized(req.headers.authorization,VIEW_SECRET);
const runAuth=req=>labBearerAuthorized(req.headers.authorization,RUN_SECRET);
const sampleAuth=req=>labBearerAuthorized(req.headers.authorization,SAMPLE_SECRET);
function respond(res,status,body){
  const buffer=Buffer.from(JSON.stringify(body));
  res.writeHead(status,{
    ...headers,'content-type':'application/json; charset=utf-8',
    'content-length':String(buffer.length)
  });
  res.end(buffer);
}
async function executeSmoke(){
  busy=true;lastStarted=Date.now();
  try{
    const base=await runSyntheticDecoder();
    const matrix=await runSyntheticAudioMatrix();
    report={...base,ok:base.ok===true&&matrix.allVerified===true,
      codecMatrix:matrix.tests,codecMatrixAllVerified:matrix.allVerified,
      codecsDecoded:matrix.codecsDecoded};
    console.log(JSON.stringify({
      event:'decoder_synthetic_test',ok:report.ok,scope:report.scope,
      stage:report.stage,code:report.code||null,
      audioFrames:report.audioFrames??null,videoFrames:report.videoFrames??null,
      codecMatrix:report.codecMatrix?.map(x=>({codec:x.codec,ok:x.ok,frames:x.audioFrames}))
    }));
  }catch{
    report={ok:false,scope:'synthetic_local_only',stage:'worker',
      code:'synthetic_worker_unavailable',productionStreamVerified:false};
  }finally{busy=false;}
}
const server=createServer(async(req,res)=>{
  try{
    const path=new URL(req.url||'/','http://localhost').pathname;
    if(path==='/health'){
      if(req.method!=='GET')return respond(res,405,{ok:false,code:'method_not_allowed'});
      return respond(res,report?.ok===true&&tokenConfigured()?200:503,{
        ok:report?.ok===true&&tokenConfigured(),
        service:'blofy-decoder-synthetic-lab',scope:'synthetic_local_only',
        ready:report?.ok===true&&tokenConfigured(),
        productionStreamVerified:false
      });
    }
    if(!tokenConfigured())return respond(res,503,{ok:false,code:'lab_token_not_configured'});
    if(path==='/api/report'&&req.method==='GET'){
      if(!reportAuth(req))return respond(res,401,{ok:false,code:'lab_view_auth_required'});
      return respond(res,report?.ok===true?200:report===null?202:503,{
        ok:report?.ok===true,scope:'synthetic_local_only',
        running:busy,lastStartedAt:lastStarted?new Date(lastStarted).toISOString():null,
        report, nextManualRunAfter:lastStarted?
          new Date(lastStarted+MIN_INTERVAL_MS).toISOString():null
      });
    }
    if(path==='/api/owner-sample'&&req.method==='POST'){
      if(SAMPLE_SECRET.length<40)return respond(res,503,{ok:false,code:'sample_upload_not_configured'});
      if(!sampleAuth(req))return respond(res,401,{ok:false,code:'sample_auth_required'});
      if(req.url!=='/api/owner-sample'||req.headers.origin||
        req.headers['x-blofy-sample-rights']!=='confirmed')
        return respond(res,403,{ok:false,code:'sample_rights_confirmation_required'});
      if(sampleBusy)return respond(res,409,{ok:false,code:'sample_analysis_busy'});
      if(Date.now()-lastSampleAt<60000)
        return respond(res,429,{ok:false,code:'sample_analysis_cooldown'});
      sampleBusy=true;lastSampleAt=Date.now();
      try{
        const request=await readOwnerSampleRequest(req);
        if(request.ok!==true)return respond(res,400,{ok:false,code:request.code});
        const result=await analyzeOwnerTsSample(request.bytes);
        // Never log raw bytes, names, provider details or transport metadata.
        console.log(JSON.stringify({event:'owner_sample_analysis',
          ok:result.ok,code:result.code,scope:result.scope}));
        return respond(res,200,result);
      }finally{sampleBusy=false;}
    }
    if(path==='/api/synthetic-run'&&req.method==='POST'){
      if(!runAuth(req))return respond(res,401,{ok:false,code:'lab_run_auth_required'});
      // Accept zero user-controlled inputs. No uploads, media URLs or query
      // strings can be injected into the synthetic binary invocation.
      if(req.url!=='/api/synthetic-run'||
        Number(req.headers['content-length']||0)!==0||
        Boolean(req.headers['transfer-encoding'])||
        req.headers.origin)
        return respond(res,400,{ok:false,code:'synthetic_only_no_input'});
      if(busy)return respond(res,409,{ok:false,code:'synthetic_test_running'});
      if(Date.now()-lastStarted<MIN_INTERVAL_MS)
        return respond(res,429,{ok:false,code:'synthetic_test_cooldown'});
      void executeSmoke();
      return respond(res,202,{ok:true,started:true,scope:'synthetic_local_only'});
    }
    return respond(res,404,{ok:false,code:'not_found'});
  }catch{
    if(!res.headersSent)respond(res,500,{ok:false,code:'synthetic_lab_error'});
    else res.end();
  }
});
server.requestTimeout=10_000;
server.headersTimeout=10_000;
server.keepAliveTimeout=5_000;
server.listen(PORT,'0.0.0.0',()=>{
  console.log(JSON.stringify({event:'decoder_lab_listening',scope:'synthetic_local_only'}));
  void executeSmoke();
});
