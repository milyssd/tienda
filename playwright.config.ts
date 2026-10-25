import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({testDir:'tests',testMatch:'store.spec.ts',workers:1,use:{baseURL:process.env.APP_ORIGIN||'http://localhost:3000',headless:true,launchOptions:{executablePath,args:['--no-sandbox']},screenshot:'only-on-failure'}});
