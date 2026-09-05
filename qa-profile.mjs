export default async function run(page, ui) {
  const out = {}

  try {
    // Bypass auth with the dev cookie, then land on the chat app.
    await page.context().addCookies([
      { name: 'cindel_dev_auth', value: '1', url: 'http://localhost:3000/' },
    ])
    await page.goto('http://localhost:3000/chat', { waitUntil: 'load', timeout: 60000 })

    // The Next.js dev overlay portal intercepts pointer events; remove it.
    await page.evaluate(() => document.querySelector('nextjs-portal')?.remove())

    // Enable fake hives — purely client-side, no Supabase needed.
    const preview = page.getByRole('combobox', { name: 'Preview fake hives' })
    await preview.waitFor({ state: 'visible', timeout: 20000 })
    await preview.selectOption('6')
    await page.waitForTimeout(800)

    const hasDialog = () =>
      page.evaluate(() => !!document.querySelector('[role="dialog"]'))
    const geometry = () =>
      page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"]')
        const layer = document.querySelector('div[aria-hidden="true"]')
        if (!panel || !layer) return null
        const pr = panel.getBoundingClientRect()
        const lr = layer.getBoundingClientRect()
        return {
          panel: { left: Math.round(pr.left), right: Math.round(pr.right), width: Math.round(pr.width) },
          layer: { left: Math.round(lr.left), right: Math.round(lr.right), width: Math.round(lr.width) },
          viewport: document.documentElement.clientWidth,
        }
      })
    const hivesVisibleOnMobile = () =>
      page.evaluate(() => {
        // The mobile hives grid instance lives in the lg:hidden pane; report
        // whether ANY hive cell is actually visible.
        const cells = Array.from(document.querySelectorAll('[data-hive-id]'))
        return cells.some((c) => {
          let e = c
          while (e && e !== document.body) {
            const s = getComputedStyle(e)
            if (s.display === 'none') return false
            e = e.parentElement
          }
          return true
        })
      })

    // ---------- DESKTOP ----------
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(500)

    await page.locator('aside button[aria-label="Open your profile"]').click()
    await page.waitForTimeout(400)

    out.desktop = {}
    out.desktop.profileOpen = await hasDialog()
    out.desktop.geometry = await geometry()

    // Click the transparent layer to the right of the 288px panel (x=700).
    await page.mouse.click(700, 400)
    await page.waitForTimeout(400)
    out.desktop.closedAfterClickOutside = !(await hasDialog())

    // ---------- PHONE ----------
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(500)

    // Go to the Chat tab first so we can prove "Me" no longer resets to hives.
    await page.locator('nav button', { hasText: 'Chat' }).click()
    await page.waitForTimeout(400)
    out.phone = {}
    out.phone.beforeMe = { hivesVisible: await hivesVisibleOnMobile() }

    // "Me" opens the profile and must NOT reveal the hives grid underneath.
    await page.locator('nav button', { hasText: 'Me' }).click()
    await page.waitForTimeout(400)
    out.phone.profileOpen = await hasDialog()
    out.phone.hivesStillHidden = !(await hivesVisibleOnMobile())
    out.phone.mobileGeometry = await geometry()

    // Escape closes the profile.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    out.phone.closedAfterEscape = !(await hasDialog())

    // Reopen, then Escape-save a name edit.
    await page.locator('nav button', { hasText: 'Me' }).click()
    await page.waitForTimeout(400)
    await page
      .locator('[role="dialog"] input')
      .first()
      .fill('QA Name')
    // Name input still focused — press Escape to blur+save+close.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    out.phone.closedAfterEscapeWithEdit = !(await hasDialog())

    // Reopen and confirm the edit was persisted (saved on blur, not discarded).
    await page.locator('nav button', { hasText: 'Me' }).click()
    await page.waitForTimeout(400)
    const values = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="dialog"] input')).map((i) => i.value),
    )
    out.phone.nameAfterEscape = values[0]
    out.phone.escapeSavedEdit = values[0] === 'QA Name'
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Click-away on mobile: full-width panel covers the layer, so the layer
    // click must land outside the panel — verify the panel spans the viewport.
    await page.locator('nav button', { hasText: 'Me' }).click()
    await page.waitForTimeout(400)
    out.phone.panelSpansViewport =
      (await geometry()).panel.width === (await geometry()).viewport
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  } catch (e) {
    out.error = String(e)
  }

  return out
}