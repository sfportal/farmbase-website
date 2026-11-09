const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];
for(const [n,vp,mob] of [['d',{width:1366,height:900},false],['m',{width:390,height:844},true]]){
const c=await b.newContext({viewport:vp,isMobile:mob,deviceScaleFactor:1});const p=await c.newPage();p.on('pageerror',e=>errs.push(n+e.message));
await p.goto('http://localhost:8789/');await p.waitForTimeout(900);const ck=p.locator('button:visible',{hasText:/Đồng ý|Chỉ cần thiết/}).first();if(await ck.count())await ck.click().catch(()=>{});
for(const v of ['su-kien','blog']){await p.goto('http://localhost:8789/#'+v);await p.waitForTimeout(1600);await p.screenshot({path:`ev_${n}_${v}_top.png`});
 await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=350){scrollTo(0,y);await new Promise(r=>setTimeout(r,110));}scrollTo(0,0);});await p.waitForTimeout(1200);
 console.log(n,v,await p.evaluate(()=>[document.body.scrollHeight,document.documentElement.scrollWidth>innerWidth]));
 await p.screenshot({path:`ev_${n}_${v}.png`,fullPage:true});}
if(n==='d'){await p.goto('http://localhost:8789/#su-kien');await p.waitForTimeout(800);await p.click('.evh [data-goto="ev-press"]');await p.waitForTimeout(1200);console.log('goto',await p.evaluate(()=>[location.hash,Math.round(document.getElementById('ev-press').getBoundingClientRect().top)]));
 await p.goto('http://localhost:8789/#blog');await p.waitForTimeout(800);await p.click('#tabs [data-t="huong-dan"]');await p.waitForTimeout(700);await p.locator('.blh').screenshot({path:'ev_tabs.png'});}
await c.close();}
console.log('errs',errs);await b.close();})();
