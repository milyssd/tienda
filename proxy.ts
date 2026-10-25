import {NextRequest,NextResponse} from 'next/server';
import {jwtVerify} from 'jose';
let maintenance={active:false,message:'',until:0};
export async function proxy(req:NextRequest){
 const pathname=req.nextUrl.pathname;
 if(pathname.startsWith('/api/admin')){try{const token=req.cookies.get('nexo_session')?.value;if(!token)throw new Error();await jwtVerify(token,new TextEncoder().encode(process.env.SESSION_SECRET));}catch{return NextResponse.json({error:'Acceso no autorizado.'},{status:403});}return NextResponse.next();}
 if(pathname.startsWith('/admin')||['/api/settings','/api/session','/api/auth/login','/api/auth/logout'].includes(pathname)||pathname.startsWith('/_next')||pathname.includes('.'))return NextResponse.next();
 try{if(maintenance.until<Date.now()){const r=await fetch(new URL('/api/settings',req.url),{cache:'no-store'});if(r.ok){const s=await r.json();maintenance={active:s.maintenance==='true',message:s.maintenanceMessage||'Volvemos pronto.',until:Date.now()+5000};}}
 if(maintenance.active){const r=await fetch(new URL('/api/session',req.url),{headers:{cookie:req.headers.get('cookie')||''},cache:'no-store'});const u=await r.json();if(u?.role!=='ADMIN'){const escaped=maintenance.message.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]!));return new NextResponse(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width"><title>NEXO — Mantenimiento</title><body style="background:#eef3e5;color:#26341e;font-family:sans-serif;padding:12%"><h2>NEXO®</h2><h1>Estamos preparando el siguiente nivel.</h1><p>${escaped}</p><a href="/admin">Acceso del equipo</a></body></html>`,{status:503,headers:{'Content-Type':'text/html;charset=utf-8','Retry-After':'300','Cache-Control':'no-store'}});}}
 }catch{ return new NextResponse('Servicio temporalmente no disponible.',{status:503,headers:{'Retry-After':'60'}});}
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|products).*)']};
