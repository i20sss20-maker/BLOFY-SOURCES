import {timingSafeEqual} from 'node:crypto';

// Separate read-only and rerun credentials, never shared with browser JavaScript.
export function labBearerAuthorized(authorization,secret){
  if(typeof secret!=='string'||secret.length<40||
    typeof authorization!=='string'||!authorization.startsWith('Bearer '))return false;
  const left=Buffer.from(authorization.slice(7),'utf8');
  const right=Buffer.from(secret,'utf8');
  return left.length===right.length&&timingSafeEqual(left,right);
}
