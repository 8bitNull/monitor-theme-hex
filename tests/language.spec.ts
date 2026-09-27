import {test,expect} from '@playwright/test'

for(const width of [320,390,1440])test(`language preference persists at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900})
 await page.goto('/')
 if(width<=720)await page.locator('.ma-nav').getByRole('button',{name:'设置'}).click()
 const language=width<=720?page.getByRole('combobox',{name:'Language / 语言'}):page.locator('header').getByRole('button',{name:'Language / 语言'})
 await expect(language).toBeVisible()
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
 if(width<=720)await language.selectOption('en');else await language.click()
 await expect(page.locator('html')).toHaveAttribute('lang','en-US')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.reload()
 await expect(page.locator('html')).toHaveAttribute('lang','en-US')
 if(width<=720){
  await page.locator('.ma-nav').getByRole('button',{name:'Settings'}).click()
  await language.selectOption('zh')
 }else await language.click()
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
 await page.reload()
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
})
