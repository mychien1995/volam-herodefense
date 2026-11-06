import type {Browser} from '@playwright/test';
export function verifyRenovationWaveMode(browser:Browser,options?:{development?:boolean}):Promise<{status:string}>;
