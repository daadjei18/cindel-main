export default async function run(page) {
  const out = {}
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' })
  // Give the dev server time to finish compiling before judging.
  await page.waitForTimeout(20000)
  out.url = page.url()
  out.hasEmail = await page.locator('#email').count()
  out.hasPassword = await page.locator('#password').count()
  out.inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map((i) => ({
      id: i.id,
      type: i.type,
      placeholder: i.placeholder,
      name: i.name,
    })),
  )
  out.readyState = await page.evaluate(() => document.readyState)
  out.hasHydrated = await page.evaluate(() => !!document.querySelector('[data-slot="input"]'))
  return out
}