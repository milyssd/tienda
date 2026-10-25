import { SignJWT, jwtVerify } from 'jose';
import {cookies} from 'next/headers';
import {db} from './db';
export function secret(){if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32)throw new Error('SESSION_SECRET requires at least 32 characters');return new TextEncoder().encode(process.env.SESSION_SECRET);}
export async function sign(data:Record<string,unknown>,expiry='7d'){return new SignJWT(data).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(expiry).sign(secret());}
export async function user(){try{const token=(await cookies()).get('nexo_session')?.value;if(!token)return null;const {payload}=await jwtVerify(token,secret());const u=await db.user.findUnique({where:{id:String(payload.sub)}});return u&&!u.blocked&&u.sessionVersion===payload.version?u:null;}catch{return null;}}
export async function requireUser(admin=false){const u=await user();if(!u || (admin&&u.role!=='ADMIN'))throw new Error('FORBIDDEN');return u;}
export function originCheck(req:Request){const origin=req.headers.get('origin');const expected=process.env.APP_ORIGIN||new URL(req.url).origin;if(!origin||origin!==expected)throw new Error('ORIGIN');}
export function ip(req:Request){return process.env.TRUST_CLOUDFLARE==='true'?(req.headers.get('cf-connecting-ip')||'unknown'):'local';}
export async function limit(key:string,max=10,minutes=15){const now=new Date();const r=await db.rateLimit.upsert({where:{key},create:{key,count:1,expiresAt:new Date(Date.now()+minutes*60000)},update:{count:{increment:1}}});if(r.expiresAt<now){await db.rateLimit.update({where:{key},data:{count:1,expiresAt:new Date(Date.now()+minutes*60000)}});return;}if(r.count>max)throw new Error('RATE_LIMIT');}
export function cookieOptions(){return {httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax' as const,path:'/',maxAge:7*86400};}
