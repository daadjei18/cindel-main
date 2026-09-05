async function waitReady(page, selector, timeout = 60000) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel)
      if (!el) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    },
    selector,
    { timeout },
  )
}

export default async function run(page) {
  const out = { steps: {} }
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' })
  await waitReady(page, '#email')
  await page.locator('#email').fill('tester@example.com')
  await page.locator('#password').fill('supersecret1')
  await page.getByRole('button', { name: 'Log in' }).click()
  await waitReady(page, '#code')
  const devCode = await page.evaluate(() => {
    const el = document.querySelector('p.font-mono.text-2xl')
    return el ? el.textContent.trim() : null
  })
  if (devCode) {
    await page.locator('#code').fill(devCode)
    await page.getByRole('button', { name: 'Verify' }).click()
  }
  await page.waitForFunction(() => window.location.pathname.startsWith('/chat'), null, { timeout: 20000 })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForTimeout(1500)

  // Count hives in DOM
  out.steps.totalCells = await page.evaluate(() => document.querySelectorAll('[data-hive-id]').length)
  out.steps.emptyCells = await page.evaluate(
    () => document.querySelectorAll('[data-hive-empty="true"]').length,
  )
  out.steps.filledCells = await page.evaluate(
    () => document.querySelectorAll('[data-hive-empty="false"]').length,
  )

  // Measure spacing: bounding boxes of consecutive cells
  out.steps.cellBoxes = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[data-hive-id]')).map((e) => e.getBoundingClientRect())
    return ids.map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))
  })

  // Does the "+ New chat" tile exist?
  out.steps.newChatTile = (await page.getByText('New chat').count()) === 1

  return out
}