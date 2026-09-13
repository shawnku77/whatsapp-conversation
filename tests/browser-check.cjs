const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
 const page = await context.newPage(); const errors=[];page.on('pageerror', e=>errors.push(e.message));
 const origin='http://localhost:3000';
 await page.goto(origin); await page.getByLabel('Admin password',{exact:true}).fill('incorrect'); await page.getByRole('button',{name:'Open workspace'}).click(); await page.getByRole('alert').waitFor();
 const password=fs.readFileSync('.env.local','utf8').match(/ADMIN_PASSWORD=(.*)/)[1].trim();
 await page.getByLabel('Admin password',{exact:true}).fill(password);await page.getByRole('button',{name:'Open workspace'}).click();await page.getByRole('heading',{name:'All conversations'}).waitFor();
 const sample='C:/Users/zhish/Downloads/WhatsApp Chat - Binastra - Kevin Voon.zip';
 if(!await page.getByRole('link',{name:'Binastra - Kevin Voon',exact:true}).count()) {
  const uploaded=page.waitForResponse(r=>r.url().endsWith('/api/archives')&&r.request().method()==='POST',{timeout:120000});
  await page.locator('input[type=file]').setInputFiles(sample);assert.equal((await uploaded).status(),201);
 }
 await page.getByRole('link',{name:'Binastra - Kevin Voon',exact:true}).waitFor();
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/dashboard.png',fullPage:true});
 await page.getByRole('link',{name:'Binastra - Kevin Voon',exact:true}).click();await page.getByRole('heading',{name:'Binastra - Kevin Voon'}).waitFor();
 const share=page.url();await page.getByLabel('Search messages').fill('booking');assert.ok(await page.locator('.message-row').count()>0);await page.getByLabel('Clear search').click();
 await page.locator('select').selectOption('Binastra - Kevin Voon');assert.ok(await page.locator('.outgoing').count()>0);
 const image=page.locator('.attachment img').first();await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());
 await page.screenshot({path:'test-results/chat.png'});
 const media=await image.getAttribute('src');const mediaResponse=await context.request.get(origin+media);assert.equal(mediaResponse.status(),200);
 const ranged=await context.request.get(origin+media,{headers:{Range:'bytes=0-99'}});assert.equal(ranged.status(),206);assert.equal((await ranged.body()).length,100);
 const pdf=await page.getByRole('link',{name:/^View .*pdf$/}).first().getAttribute('href');
 const visitor=await browser.newContext({viewport:{width:390,height:844}});const mobile=await visitor.newPage();await mobile.goto(share);await mobile.getByLabel('Admin password',{exact:true}).waitFor();
 assert.equal(await mobile.locator('.message-row').count(),0);
 for(const link of [media,pdf]) {assert.equal((await visitor.request.get(origin+link)).status(),401);assert.equal((await visitor.request.get(origin+link,{headers:{Range:'bytes=0-99'}})).status(),401);}
 assert.equal((await visitor.request.post(origin+'/api/archives')).status(),401);
 await mobile.screenshot({path:'test-results/login-mobile.png'});
 await mobile.getByLabel('Admin password',{exact:true}).fill(password);await mobile.getByRole('button',{name:'Open workspace'}).click();await mobile.getByRole('heading',{name:'Binastra - Kevin Voon'}).waitFor();assert.equal(mobile.url(),share);
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:'test-results/mobile.png'});
 const pdfResponse=await visitor.request.get(origin+pdf);assert.equal(pdfResponse.status(),200);assert.match(pdfResponse.headers()['content-disposition'],/^inline/);
 assert.equal((await visitor.request.get(origin+'/c/'+'a'.repeat(48))).status(),404);
 await visitor.request.delete(origin+'/api/auth');await mobile.reload();await mobile.getByLabel('Admin password',{exact:true}).waitFor();assert.equal((await visitor.request.get(origin+pdf)).status(),401);
 await visitor.addCookies([{name:'propertylab_session',value:'9999999999999.forged',url:origin}]);assert.equal((await visitor.request.get(origin+media)).status(),401);
 await page.goto(origin);await page.getByRole('button',{name:'Administrator Private workspace'}).click();await page.getByLabel('Admin password',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,share,checks:['login rejection','login','real ZIP upload','reopen','search','perspective','image decode','media byte ranges','anonymous share and media denied','login returns to shared chat','authenticated PDF preview','logout revokes media','forged cookie rejected','mobile layout','unauthorized upload','unknown share 404','logout','no page errors']}));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
