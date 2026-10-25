import {releaseExpired} from '../lib/orders';
import {db} from '../lib/db';
let running=false;
async function sweep(){if(running)return;running=true;try{await releaseExpired();console.log('Reservation sweep completed.');}catch{console.error('Reservation sweep failed; inspect database availability.');}finally{running=false;}}
await sweep();
const timer=setInterval(sweep,5*60*1000);
async function stop(){clearInterval(timer);await db.$disconnect();process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
