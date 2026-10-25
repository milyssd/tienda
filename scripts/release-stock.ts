import {releaseExpired} from '../lib/orders';
import {db} from '../lib/db';
try{await releaseExpired();console.log('Expired reservations checked.');}finally{await db.$disconnect();}
