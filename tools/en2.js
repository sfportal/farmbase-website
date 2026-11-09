const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1366,height:900}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
for(const v of (process.argv[2]||'trang-chu,chien-dich-10000ha').split(',')){await p.goto('http://localhost:8789/#'+v);await p.waitForTimeout(1200);
for(const l of ['en','zh']){await p.evaluate(l=>setLang(l),l);await p.waitForTimeout(400);
console.log(v,l,JSON.stringify(await p.evaluate(v=>{const out=new Set();const w=document.createTreeWalker(document.querySelector('[data-view="'+v+'"]'),4);let x;while(x=w.nextNode()){if(x.parentElement.closest('script,style'))continue;if(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệọỏốồổỗộớờởỡợụủứừửữựđ]/i.test(x.nodeValue))out.add(x.nodeValue.trim().slice(0,60))}return [...out]},v)));}
await p.evaluate(()=>setLang('vi'));}
console.log(errs);await b.close();})();
