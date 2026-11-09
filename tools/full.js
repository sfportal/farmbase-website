const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];
const vs=['trang-chu','ve-chung-toi','giai-phap','truy-xuat','ma-vung-trong','ma-dong-goi','thu-mua-ky-thuat','giai-phap-rieng','nguon-hang','chien-dich-10000ha','doi-tac','doi-tac/htx-dala','su-kien','blog','lien-he','chinh-sach-bao-mat','dieu-khoan-su-dung'];
const only=process.argv[2];
for(const [n,vp,mob] of [['d',{width:1366,height:900},false],['m',{width:390,height:844},true]]){
const c=await b.newContext({viewport:vp,isMobile:mob,deviceScaleFactor:1});const p=await c.newPage();p.on('pageerror',e=>errs.push(n+e.message));
await p.goto('http://localhost:8789/');await p.waitForTimeout(900);const ck=p.locator('button:visible',{hasText:/Đồng ý|Chỉ cần thiết/}).first();if(await ck.count())await ck.click().catch(()=>{});
for(const v of vs){if(only&&!only.split(',').includes(v))continue;await p.goto('http://localhost:8789/#'+v);await p.waitForTimeout(1500);
 await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,90));}scrollTo(0,0);});await p.waitForTimeout(1400);
 const r=await p.evaluate(()=>({h:document.body.scrollHeight,hs:document.documentElement.scrollWidth>innerWidth,ovf:[...document.querySelectorAll('.view:not([hidden]) *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed'&&!e.closest('[style*=overflow],.marq,.cd-mq,.gal3,.ag-pick,.cd-units,.xa-g,.cd-req5,.cdx-pl,.cd-xp,.cd-ind,.cd-5,.steps6,#solcards,.apps,.cd-values,.cdx-ben,.cd-nav-in,.ag-tabs,.mosaic')}).length}));
 console.log(n,v,JSON.stringify(r));
 await p.screenshot({path:`f_${n}_${v.replace('/','_')}.png`,fullPage:true});}
await c.close();}
console.log('errs',errs);await b.close();})();
