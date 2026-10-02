import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
// Start node archive/design/serve-mobile-app-demo.mjs first.
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const width of [320,390,430,1440]){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4188/');
  assert.equal(await page.locator('.node').count(),24);
  await page.getByRole('button',{name:'网站 8',exact:true}).click();assert.equal(await page.locator('.node').count(),8);
  await page.getByRole('button',{name:'概览',exact:true}).click();
  await page.getByRole('button',{name:'7 天内到期 3 ›',exact:true}).click();assert.equal(await page.locator('.node').count(),3);
  await page.getByRole('button',{name:'查看 Singapore · 新加坡',exact:true}).click();
  for(const name of ['总览','资源','资料','网络']){
   await page.getByRole('button',{name,exact:true}).click();
   assert(await page.locator('#content').evaluate(e=>e.scrollWidth<=e.clientWidth));
  }
  await page.getByRole('button',{name:'比较三条线路',exact:true}).click();
  assert.equal(await page.locator('.route-stat-row').count(),3);
  const paths=await page.locator('.chart path[fill="none"]').evaluateAll(elements=>elements.map(e=>e.getAttribute('d')));
  assert.equal(new Set(paths).size,3);
  await page.locator('[data-scenario="loss-scenarios"]').click();await page.locator('[data-loss-mode="zero"]').click();
  for(const row of await page.locator('.route-stat-row').all())assert.match(await row.innerText(),/0\.0%/);
  await page.locator('[data-scenario="loss-scenarios"]').click();await page.locator('[data-loss-mode="unknown"]').click();
  for(const row of await page.locator('.route-stat-row').all())assert.match(await row.innerText(),/未统计/);
  await page.locator('[data-scenario="sample"]').click();assert.match(await page.locator('#network-sample').innerText(),/未提供统计/);
  await page.getByRole('button',{name:'切换节点',exact:true}).click();
  await page.getByRole('searchbox',{name:'搜索切换节点'}).fill('长期服务');
  assert.equal(await page.locator('#scenario-node-list [data-node]').count(),6);
  await page.getByRole('button',{name:'关闭面板',exact:true}).click();
  await page.getByRole('button',{name:'返回节点列表',exact:true}).click();
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.locator('#dark').check();
  await page.locator('#density').selectOption('detailed');
  await page.locator('[data-action="reset"]').click();await page.getByRole('button',{name:'撤销',exact:true}).click();
  assert.equal(await page.locator('#density').inputValue(),'detailed');
  assert(await page.locator('#dark').isChecked());
  assert.deepEqual(errors,[]);await page.close();console.log(`${width}px passed`);
 }
}finally{await browser.close();}
