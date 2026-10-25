import {PrismaClient} from '@prisma/client';
import {PrismaMariaDb} from '@prisma/adapter-mariadb';
import {hash} from 'bcryptjs';
import {writeFile,mkdir} from 'node:fs/promises';
const db=new PrismaClient({adapter:new PrismaMariaDb(process.env.DATABASE_URL!.replace(/^mysql:/,'mariadb:'))});
async function createSample(file:string,contents:string){
 try{await writeFile(file,contents,{flag:'wx',mode:0o600});}
 catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
}
async function main(){
 const email=(process.env.ADMIN_EMAIL||'admin@nexo.local').trim().toLowerCase();
 const existingAdmin=await db.user.findUnique({where:{email}});
 if(!existingAdmin){
  const password=process.env.ADMIN_PASSWORD;if(!password||password.length<14)throw new Error('Set ADMIN_PASSWORD with at least 14 characters for the initial administrator.');
  await db.user.upsert({where:{email},create:{email,name:'Equipo NEXO',password:await hash(password,12),role:'ADMIN'},update:{}});
 }
 const products=[
 {slug:'hyperx-cloud-iii',name:'HyperX Cloud III Wireless',category:'Gaming',brand:'HyperX',image:'/products/headset.svg',price:89900,oldPrice:105000,stock:12,featured:true,description:'Sonido envolvente, comodidad para largas sesiones y libertad inalámbrica. Auriculares con micrófono desmontable y almohadillas de espuma viscoelástica. Producto de demostración; confirma especificaciones antes de comprar.'},
 {slug:'keychron-k2',name:'Keychron K2 · Mechanical',category:'Gaming',brand:'Keychron',image:'/products/keyboard.svg',price:69000,stock:8,featured:true,description:'Tu escritorio, a tu manera. Teclado mecánico compacto con conectividad inalámbrica, iluminación y una experiencia de escritura precisa. Catálogo de demostración.'},
 {slug:'dior-sauvage',name:'Dior Sauvage · Eau de Parfum',category:'Perfumes',brand:'Dior',type:'PERFUME',image:'/products/perfume.svg',price:18500,stock:15,featured:true,description:'Una fragancia intensa y envolvente de bergamota, especias y vainilla. Disponible en decants y frasco completo. Ilustración de referencia; disponibilidad por confirmar.',notes:'Bergamota, pimienta, vainilla',concentration:'EDP',variants:[{name:'5 ml',price:18500,stock:15},{name:'10 ml',price:32000,stock:10},{name:'100 ml',price:115000,stock:3}]},
 {slug:'creator-kit',name:'Creator Kit · Plantillas Notion',category:'Digital',brand:'Nexo Studio',type:'DIGITAL',image:'/products/digital.svg',price:7900,stock:999,featured:true,description:'Organiza proyectos y transforma ideas en acciones. Kit digital de ejemplo con plantilla Markdown de planificación. Archivo de ejemplo descargable desde tu cuenta tras la confirmación del pago.'},
 {slug:'logitech-superlight',name:'Logitech G Pro X Superlight',category:'Gaming',brand:'Logitech',image:'/products/mouse.svg',price:78000,oldPrice:95000,stock:6,description:'Precisión sin distracciones. Mouse inalámbrico ultraligero para una configuración competitiva y minimalista. Catálogo de demostración.'},
 {slug:'xbox-controller',name:'Xbox Wireless · Carbon Black',category:'Gaming',brand:'Xbox',image:'/products/controller.svg',price:49000,stock:9,description:'Control inalámbrico de diseño ergonómico. Conecta con tus juegos favoritos desde una configuración limpia y cómoda. Catálogo de demostración.'},
 {slug:'amber-noir',name:'Amber Noir · Eau de Parfum',category:'Perfumes',brand:'Nexo Parfums',type:'PERFUME',image:'/products/amber.svg',price:35000,stock:7,description:'Ámbar cálido y maderas suaves para un aroma que se queda contigo. Presentación de 50 ml. Producto conceptual de demostración.',notes:'Ámbar, sándalo, cedro',concentration:'EDP'},
 {slug:'bleu-decant',name:'Bleu · Decant 10 ml',category:'Perfumes',brand:'Selección Nexo',type:'PERFUME',image:'/products/decant.svg',price:21000,stock:12,description:'Una selección amaderada y fresca en un formato portátil de 10 ml. Perfecto para descubrir tu siguiente aroma. Producto de demostración.',notes:'Cítricos, incienso, cedro',concentration:'EDP'},
 {slug:'focus-planner',name:'Focus Planner · Agenda digital',category:'Digital',brand:'Nexo Studio',type:'DIGITAL',image:'/products/planner.svg',price:4900,stock:999,description:'Menos caos, más foco. Plantilla digital de ejemplo para organizar tus semanas. Archivo de ejemplo descargable desde tu cuenta tras la confirmación del pago.'},
 {slug:'setup-guide',name:'The Setup Guide · Ebook',category:'Digital',brand:'Nexo Studio',type:'DIGITAL',image:'/products/ebook.svg',price:3900,stock:999,description:'Una guía de ejemplo para pensar tu espacio de trabajo y juego. Archivo de ejemplo descargable desde tu cuenta tras la confirmación del pago.'}
 ];
 for(const item of products){const {variants,...data}=item;await db.product.upsert({where:{slug:data.slug},update:{},create:{...data,type:data.type||'PHYSICAL',variants:variants?{create:variants.map((v,i)=>({...v,sku:data.slug+'-'+i}))}:undefined}});}
 for(const [key,value] of Object.entries({storeName:'NEXO',whatsapp:'',bank:'',maintenance:'false',maintenanceMessage:'Estamos preparando algo nuevo. Volvemos pronto.'}))await db.setting.upsert({where:{key},create:{key,value},update:{}});
 await mkdir('storage/private',{recursive:true});await createSample('storage/private/creator-kit.md','# Creator Kit\n\nPlantilla de demostración NEXO.\n\n## Proyecto\n- Objetivo:\n- Próxima acción:\n- Fecha:\n');
 await createSample('storage/private/focus-planner.md','# Focus Planner\n\n## Esta semana\n- Mi prioridad:\n- Lunes:\n- Martes:\n- Miércoles:\n- Jueves:\n- Viernes:\n');
 await createSample('storage/private/setup-guide.md','# The Setup Guide\n\nContenido de demostración NEXO.\n\n1. Ajusta la silla a tu altura.\n2. Coloca el monitor a la altura de los ojos.\n3. Mantén libres los puntos de ventilación.\n4. Organiza cables y toma descansos regulares.\n');
 console.log('Seed completado: administrador y 10 productos. Los registros existentes se conservan.');
}
main().finally(()=>db.$disconnect());
