import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: 'sq-AL',
  permissions: [],
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(800)

const dock = page.getByRole('button', { name: /Zëri|Voice|Glas/i }).first()
await dock.click()

const dialog = page.getByRole('dialog')
await dialog.waitFor({ timeout: 8000 })

const title = await dialog.getByText('Asistent me zë').textContent()
const ask = await dialog.getByText('A doni ta lejoni mikrofonin?').textContent()
const allowBtn = dialog.getByRole('button', { name: 'Po, lejo mikrofonin' })
const noBtn = dialog.getByRole('button', { name: 'Jo tani, do të shkruaj' })
const allowVisible = await allowBtn.isVisible()
const noVisible = await noBtn.isVisible()
const blocked = await dialog.getByText('Mikrofoni është i bllokuar').count()

const result = {
  dialog: await dialog.isVisible(),
  title,
  ask,
  allowVisible,
  noVisible,
  blocked,
  pageErrors: errors,
}

console.log(JSON.stringify(result, null, 2))
if (!result.dialog || !allowVisible || !noVisible || result.blocked) {
  await browser.close()
  process.exit(1)
}

await noBtn.click()
const typeHint = await dialog.getByText('Shkruaj ose shtyp një shembull më poshtë.').isVisible()
console.log(JSON.stringify({ ...result, typeHint }, null, 2))
if (!typeHint) {
  await browser.close()
  process.exit(1)
}
await browser.close()
