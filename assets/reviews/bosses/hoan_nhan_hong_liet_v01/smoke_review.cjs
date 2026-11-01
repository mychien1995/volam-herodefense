const {chromium}=require(process.env.VOLAM_REVIEW_PLAYWRIGHT||'@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5198/assets/reviews/bosses/hoan_nhan_hong_liet_v01/');
 await page.waitForFunction(()=>window.artReview?.ready,{timeout:15000});
 console.log(JSON.stringify(await page.evaluate(()=>artReview.snapshot()),null,2).slice(0,1200));
 await page.evaluate(()=>artReview.set({clip:'stomp',time:1.35}));
 await page.screenshot({path:path.join(__dirname,'preview_stomp_initial.png')});
 console.log('errors',JSON.stringify(errors));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
