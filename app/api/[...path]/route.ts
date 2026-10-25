import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {authSchema,orderSchema,productSchema} from '@/lib/validation';
import {sign,user,requireUser,originCheck,ip,limit,cookieOptions} from '@/lib/security';
import {releaseExpired} from '@/lib/orders';
import {hash,compare} from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {z} from 'zod';
import {jwtVerify} from 'jose';
import {secret} from '@/lib/security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status});
const statusSchema=z.enum(['PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED']);
async function handler(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const p=(await params).path; const route=p.join('/');const method=req.method;
 try{
 if(method!=='GET')originCheck(req);
 if(route==='products'&&method==='GET'){await releaseExpired();return json(await db.product.findMany({include:{variants:true},orderBy:{createdAt:'asc'}}));}
 if(route==='session'&&method==='GET'){const u=await user();return json(u?{id:u.id,name:u.name,email:u.email,role:u.role}:null);}
 if(route==='settings'&&method==='GET'){const settings=await db.setting.findMany();return json(Object.fromEntries(settings.filter(s=>['storeName','whatsapp','bank','maintenance','maintenanceMessage'].includes(s.key)).map(s=>[s.key,s.value])));}
 if((route==='auth/register'||route==='auth/login')&&method==='POST'){
 await limit('auth-ip:'+ip(req),30);const data=authSchema.parse(await req.json());await limit('auth-email:'+data.email,10);
 let u=await db.user.findUnique({where:{email:data.email}});
 if(route.endsWith('register')){if(u)return json({error:'No se pudo completar el registro.'},400);if(!data.name)return json({error:'Escribe tu nombre.'},400);u=await db.user.create({data:{email:data.email,name:data.name,password:await hash(data.password,12)}});}
 else if(!u||u.blocked||!await compare(data.password,u.password))return json({error:'Credenciales inválidas o acceso no disponible.'},401);
 const res=json({name:u!.name,role:u!.role});res.cookies.set('nexo_session',await sign({sub:u!.id,version:u!.sessionVersion}),cookieOptions());return res;
 }
 if(route==='auth/logout'&&method==='POST'){const res=json({ok:true});res.cookies.set('nexo_session','',{...cookieOptions(),maxAge:0});return res;}
 if(route==='auth/logout-all'&&method==='POST'){const u=await requireUser();await db.user.update({where:{id:u.id},data:{sessionVersion:{increment:1}}});const res=json({ok:true});res.cookies.delete('nexo_session');return res;}
 if(route==='wishes'){const u=await requireUser();if(method==='GET')return json(await db.wish.findMany({where:{userId:u.id},include:{product:true}}));const {productId}=z.object({productId:z.string().uuid()}).strict().parse(await req.json());const key={userId:u.id,productId};const existing=await db.wish.findUnique({where:{userId_productId:key}});if(existing)await db.wish.delete({where:{userId_productId:key}});else await db.wish.create({data:key});return json({saved:!existing});}
 if(route==='orders'&&method==='GET'){const u=await requireUser();return json(await db.order.findMany({where:{userId:u.id},include:{items:true,events:true},orderBy:{createdAt:'desc'}}));}
 if(route==='orders'&&method==='POST'){
 await limit('order:'+ip(req),20,60);await releaseExpired();const data=orderSchema.parse(await req.json());const u=await user();
 const result=await db.$transaction(async tx=>{
 const items=[];let hasPhysical=false;
 for(const line of data.items){const product=await tx.product.findUnique({where:{id:line.productId},include:{variants:true}});if(!product)throw new Error('STOCK');const variant=line.variantId?product.variants.find(v=>v.id===line.variantId):undefined;if(line.variantId&&!variant)throw new Error('STOCK');if(product.variants.length&&!variant)throw new Error('VARIANT');
 if(product.type==='DIGITAL'&&!u)throw new Error('DIGITAL_AUTH');if(product.type!=='DIGITAL'){hasPhysical=true;const changed=variant?await tx.variant.updateMany({where:{id:variant.id,stock:{gte:line.quantity}},data:{stock:{decrement:line.quantity}}}):await tx.product.updateMany({where:{id:product.id,stock:{gte:line.quantity}},data:{stock:{decrement:line.quantity}}});if(!changed.count)throw new Error('STOCK');}
 items.push({productId:product.id,variantId:variant?.id,name:product.name+(variant?' · '+variant.name:''),type:product.type,quantity:line.quantity,price:variant?.price??product.price});}
 if(hasPhysical&&(!data.city||!data.address&&data.delivery!=='pickup'||data.delivery==='digital'))throw new Error('ADDRESS');if(data.payment==='cash'&&(!hasPhysical||data.delivery!=='local'))throw new Error('PAYMENT');
 const shipping=hasPhysical?(data.delivery==='local'?1500:data.delivery==='province'?3000:0):0;const total=items.reduce((sum,i)=>sum+i.price*i.quantity,0)+shipping;
 return tx.order.create({data:{name:data.name,email:data.email.toLowerCase(),phone:data.phone,city:data.city,address:data.address,delivery:hasPhysical?data.delivery:'digital',payment:data.payment,userId:u?.id,total,shipping,code:'NX-'+randomUUID().slice(0,8).toUpperCase(),expiresAt:new Date(Date.now()+24*3600000),items:{create:items},events:{create:{status:'PENDING'}}},include:{items:true,events:true}});
 });return json(result,201);
 }
 if(p[0]==='download-token'&&method==='POST'){
 const u=await requireUser();const orderId=z.string().uuid().parse(p[1]);const productId=z.string().uuid().parse(p[2]);
 const o=await db.order.findFirst({where:{id:orderId,userId:u.id,status:{in:['PAID','PREPARING','SHIPPED','DELIVERED']}},include:{items:true}});if(!o?.items.some(i=>i.productId===productId&&i.type==='DIGITAL'))throw new Error('FORBIDDEN');
 return json({token:await sign({sub:u.id,orderId,productId,purpose:'download'},'5m')});
 }
 if(route==='download'&&method==='GET'){
 const u=await requireUser();const token=z.string().min(10).max(2000).parse(req.nextUrl.searchParams.get('token'));let payload;try{payload=(await jwtVerify(token,secret())).payload;}catch{throw new Error('FORBIDDEN');}if(payload.sub!==u.id||payload.purpose!=='download')throw new Error('FORBIDDEN');
 const orderId=z.string().uuid().parse(payload.orderId),productId=z.string().uuid().parse(payload.productId);
 const o=await db.order.findFirst({where:{id:orderId,userId:u.id,status:{in:['PAID','PREPARING','SHIPPED','DELIVERED']}},include:{items:true}});if(!o?.items.some(i=>i.productId===productId&&i.type==='DIGITAL'))throw new Error('FORBIDDEN');
 const product=await db.product.findUniqueOrThrow({where:{id:productId}});const files:Record<string,string>={'creator-kit':'creator-kit.md','focus-planner':'focus-planner.md','setup-guide':'setup-guide.md'};const file=files[product.slug];if(!file)return json({error:'El archivo todavía no está disponible. Contacta a la tienda.'},409);
 const bytes=await readFile(path.join(process.cwd(),'storage/private',file));
 await db.$transaction(async tx=>{await tx.order.update({where:{id:orderId},data:{id:orderId}});const count=await tx.downloadLog.count({where:{orderId,productId,userId:u.id}});if(count>=5)throw new Error('FORBIDDEN');await tx.downloadLog.create({data:{orderId,productId,userId:u.id,ip:ip(req)}});});
 return new NextResponse(bytes,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${file}"`,'Cache-Control':'private,no-store'}});
 }
 if(route==='orders/lookup' &&method==='POST'){await limit('lookup:'+ip(req),15);const data=z.object({code:z.string().regex(/^NX-[A-F0-9]{8}$/),email:z.string().email()}).strict().parse(await req.json());const order=await db.order.findFirst({where:{code:data.code,email:data.email.toLowerCase()},include:{items:true,events:true}});return order?json(order):json({error:'Pedido no encontrado.'},404);}
 if(p[0]==='receipt'&&method==='GET'){
 const u=await requireUser();const order=await db.order.findUnique({where:{id:z.string().uuid().parse(p[1])},include:{items:true}});if(!order||(order.userId!==u.id&&u.role!=='ADMIN')||!['PAID','PREPARING','SHIPPED','DELIVERED'].includes(order.status))throw new Error('FORBIDDEN');
 const pdf=await PDFDocument.create();const page=pdf.addPage();const font=await pdf.embedFont(StandardFonts.Helvetica);let y=780;const line=(s:string,size=12)=>{page.drawText(s.replace(/[^\x20-\xFF]/g,''),{x:50,y,font,size,color:rgb(.1,.1,.1)});y-=25;};line('NEXO / RECIBO DE COMPRA',22);line(order.code);line(order.name);line(order.email);line(order.createdAt.toISOString().slice(0,10));for(const i of order.items)line(`${i.quantity} x ${i.name.slice(0,55)} - Bs ${(i.price*i.quantity/100).toFixed(2)}`);line(`Envio: Bs ${(order.shipping/100).toFixed(2)}`);line(`TOTAL: Bs ${(order.total/100).toFixed(2)}`,18);line('Recibo comercial. No constituye factura fiscal.',10);return new NextResponse(Buffer.from(await pdf.save()),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${order.code}.pdf"`,'Cache-Control':'private, no-store'}});
 }
 if(p[0]==='images'&&method==='GET'){const file=z.string().regex(/^[a-f0-9-]+\.webp$/).parse(p[1]);const bytes=await readFile(path.join(process.cwd(),'storage/images',file));return new NextResponse(bytes,{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=31536000,immutable'}});}
 if(p[0]==='admin'){
 const u=await requireUser(true);
 if(route==='admin/dashboard'&&method==='GET'){const [orders,products,users,audit]=await Promise.all([db.order.findMany({include:{items:true,events:true},orderBy:{createdAt:'desc'},take:100}),db.product.findMany({include:{variants:true}}),db.user.findMany({select:{id:true,name:true,email:true,role:true,blocked:true}}),db.audit.findMany({orderBy:{createdAt:'desc'},take:50})]);return json({orders,products,users,audit,settings:Object.fromEntries((await db.setting.findMany()).map(s=>[s.key,s.value]))});}
 let target='';
 if(route==='admin/products'&&method==='POST'){const data=productSchema.parse(await req.json());const product=await db.product.create({data});target=product.id;}
 else if(p[1]==='products'&&p[2]&&method==='PATCH'){const data=productSchema.partial().parse(await req.json());await db.product.update({where:{id:z.string().uuid().parse(p[2])},data});target=p[2];}
 else if(p[1]==='orders'&&p[2]&&method==='PATCH'){
 const data=z.object({status:statusSchema,carrier:z.string().max(100).optional(),tracking:z.string().max(100).optional()}).strict().parse(await req.json());target=z.string().uuid().parse(p[2]);
 await db.$transaction(async tx=>{const o=await tx.order.findUniqueOrThrow({where:{id:target},include:{items:true}});const transitions:Record<string,string[]>={PENDING:['PAID','CANCELLED'],PAID:['PREPARING'],PREPARING:['SHIPPED','DELIVERED'],SHIPPED:['DELIVERED']};if(!transitions[o.status]?.includes(data.status))throw new Error('TRANSITION');const changed=await tx.order.updateMany({where:{id:target,status:o.status},data});if(!changed.count)throw new Error('TRANSITION');if(data.status==='CANCELLED'){for(const i of o.items){if(i.type==='DIGITAL')continue;if(i.variantId)await tx.variant.update({where:{id:i.variantId},data:{stock:{increment:i.quantity}}});else await tx.product.update({where:{id:i.productId},data:{stock:{increment:i.quantity}}});}}await tx.orderEvent.create({data:{orderId:target,status:data.status}});});
 }
 else if(route==='admin/settings'&&method==='PATCH'){const data=z.object({storeName:z.string().max(100),whatsapp:z.string().regex(/^[0-9]{0,15}$/),bank:z.string().max(1000),maintenance:z.enum(['true','false']),maintenanceMessage:z.string().max(300)}).strict().parse(await req.json());await db.$transaction(Object.entries(data).map(([key,value])=>db.setting.upsert({where:{key},create:{key,value},update:{value}})));target='settings';}
 else if(route==='admin/upload'&&method==='POST'){await limit('upload:'+u.id,30);const form=await req.formData();const f=form.get('file');if(!(f instanceof File)||f.size>8*1024*1024)throw new Error('FILE');const buffer=Buffer.from(await f.arrayBuffer());const jpeg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255;const png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const webp=buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';if(!jpeg&&!png&&!webp)throw new Error('FILE');const id=randomUUID();await mkdir('storage/images',{recursive:true});const out=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();await writeFile(`storage/images/${id}.webp`,out);for(const size of [400,800])await sharp(out).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).toFile(`storage/images/${id}-${size}.webp`);await db.audit.create({data:{userId:u.id,action:'upload',target:id,ip:ip(req)}});return json({url:`/api/images/${id}.webp`,original:f.size,optimized:out.length});}
 else return json({error:'Ruta no encontrada.'},404);
 await db.audit.create({data:{userId:u.id,action:method+' '+route,target,ip:ip(req)}});return json({ok:true});
 }
 return json({error:'Ruta no encontrada.'},404);
 }catch(e){if(e instanceof z.ZodError)return json({error:'Revisa los datos ingresados.'},400);const message=e instanceof Error?e.message:'';if(message==='FORBIDDEN')return json({error:'Acceso no autorizado.'},403);if(message==='RATE_LIMIT')return json({error:'Demasiados intentos. Intenta en 15 minutos.'},429);if(['DIGITAL_AUTH','STOCK','VARIANT','ADDRESS','PAYMENT','TRANSITION','FILE','ORIGIN'].includes(message))return json({error:({DIGITAL_AUTH:'Inicia sesión para comprar y recibir productos digitales.',STOCK:'Stock insuficiente. Actualiza tu carrito.',VARIANT:'Selecciona una presentación.',ADDRESS:'Completa los datos de entrega.',PAYMENT:'Contra entrega solo está disponible para delivery local.',TRANSITION:'Este cambio de estado no está permitido.',FILE:'Imagen inválida. Usa JPG, PNG o WebP de hasta 8 MB.',ORIGIN:'Solicitud no permitida.'} as Record<string,string>)[message]},400);console.error('API failure',route,e);return json({error:'No se pudo completar la operación.'},500);}
}
export {handler as GET,handler as POST,handler as PATCH};
