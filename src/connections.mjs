import crypto from 'node:crypto';

const activeByUser=new Map();

function usernameOf(auth){
  return String(auth?.username||auth?.account?.username||'').trim();
}

function maxConnectionsOf(auth){
  const raw=Number(auth?.account?.maxConnections);
  return Math.max(1,Math.min(20,Number.isFinite(raw)?Math.floor(raw):1));
}

function bucket(username,create=false){
  let map=activeByUser.get(username);
  if(!map&&create){
    map=new Map();
    activeByUser.set(username,map);
  }
  return map||null;
}

export function activeConnectionCount(username=''){
  const key=String(username||'').trim();
  if(!key)return 0;
  return bucket(key)?.size||0;
}

export function connectionStats(){
  let total=0;
  const users=[];
  for(const [username,map] of activeByUser){
    if(!map.size)continue;
    total+=map.size;
    users.push({username,activeConnections:map.size});
  }
  users.sort((a,b)=>a.username.localeCompare(b.username));
  return{total,users};
}

export function acquirePlaybackConnection(auth,item){
  const username=usernameOf(auth);
  if(!username)return{ok:false,error:'missing_username',current:0,max:0};

  const max=maxConnectionsOf(auth);
  const map=bucket(username,true);
  const current=map.size;
  if(current>=max)return{ok:false,error:'connection_limit_reached',current,max,username};

  const id=crypto.randomUUID();
  const startedAt=new Date().toISOString();
  map.set(id,{
    id,
    username,
    itemId:Number(item?.id)||0,
    kind:String(item?.kind||''),
    source:String(item?.source||''),
    startedAt
  });

  let released=false;
  return{
    ok:true,
    id,
    username,
    current:current+1,
    max,
    startedAt,
    release(){
      if(released)return false;
      released=true;
      const currentMap=bucket(username);
      if(!currentMap)return false;
      const deleted=currentMap.delete(id);
      if(currentMap.size===0)activeByUser.delete(username);
      return deleted;
    }
  };
}

export function resetConnectionsForTest(){
  activeByUser.clear();
}
