import type {Metadata} from 'next';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './globals.css';
export const metadata:Metadata={title:'NEXO — Equipa tu siguiente nivel',description:'Gaming, perfumes y recursos digitales. Tu próximo favorito está aquí. Tienda online en Bolivia.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-BO"><body>{children}</body></html>;}
