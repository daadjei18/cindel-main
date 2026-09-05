export default async function run(page, ui) {
  const out = { widths: {}, phone: {}, tablet: {} }

  try {
    // Bypass auth with the dev cookie, then land on the chat app.
    await page.context().addCookies([
      { name: 'cindel_dev_auth', value: '1', url: 'http://localhost:3000/' },
    ])
    await page.goto('http://localhost:3000/chat', { waitUntil: 'load', timeout: 60000 })

    // Enable fake hives — purely client-side, no Supabase needed.
    const preview = page.getByRole('combobox', { name: 'Preview fake hives' })
    await preview.waitFor({ state: 'visible', timeout: 20000 })
    await preview.selectOption('6')
    await page.waitForTimeout(800)

    const vis = (el) => {
      if (!el) return false
      let e = el
      while (e && e !== document.body) {
        const s = getComputedStyle(e)
        if (s.display === 'none' || s.visibility === 'hidden') return false
        e = e.parentElement
      }
      return true
    }

    const layoutInfo = () =>
      page.evaluate((visFnSrc) => {
        const vis = eval(`(${visFnSrc})`)
        const nav = document.querySelector('nav')
        const aside = document.querySelector('aside')
        const hiveCells = Array.from(document.querySelectorAll('[data-hive-id]'))
        const visibleHives = hiveCells.filter((c) => vis(c))
        const chatEmpty = Array.from(document.querySelectorAll('h3')).find(
          (h) => h.textContent === 'Select a conversation',
        )
        const navButtons = nav
          ? Array.from(nav.querySelectorAll('button')).map((b) => ({
              text: b.textContent.trim(),
              active: b.className.includes('text-cindel-accent'),
            }))
          : []
        const header = document.querySelector('header')
        return {
          clientWidth: document.documentElement.clientWidth,
          navVisible: vis(nav),
          navButtons,
          sidebarVisible: vis(aside),
          hiveVisible: visibleHives.length > 0,
          hiveCount: visibleHives.length,
          chatEmptyVisible: vis(chatEmpty),
          headerOverflow: header ? header.scrollWidth > header.clientWidth : null,
          headerWidths: header
            ? { scroll: header.scrollWidth, client: header.clientWidth }
            : null,
        }
      }, vis.toString())

    const checkWidth = async (label, w, h) => {
      await page.setViewportSize({ width: w, height: h })
      await page.waitForTimeout(500)
      out.widths[label] = await layoutInfo()
    }

    await checkWidth('desktop', 1280, 800)
    await checkWidth('tablet', 820, 1180)
    await checkWidth('phone', 390, 844)
    await checkWidth('narrow', 320, 568)

    // Tablet: Me button opens the profile full-screen with backdrop.
    await checkWidth('tablet', 820, 1180)
    await page.locator('nav button', { hasText: 'Me' }).click()
    await page.waitForTimeout(400)
    out.tablet.profile = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      backdrop: !!document.querySelector('.bg-black\\/50'),
    }))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Phone: open a chat from the hives grid (visible mobile instance — the
    // desktop grid also exists in the DOM but is lg:hidden).
    await checkWidth('phone', 390, 844)
    await page.locator('[data-hive-id="preview-0"] button').last().click()
    await page.waitForTimeout(600)
    out.phone.afterOpenChat = await layoutInfo()
    out.phone.chatHeader = await page
      .locator('header h1')
      .first()
      .textContent()
      .catch(() => null)

    // Phone: Me button opens the profile; Escape closes it and returns to hives.
    await page.locator('nav button', { hasText: 'Me' }).click()
    await page.waitForTimeout(400)
    out.phone.profileOpen = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      backdrop: !!document.querySelector('.bg-black\\/50'),
    }))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    out.phone.afterEscape = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      hivesGridVisible:
        !!document.querySelector('[data-hive-id]') &&
        getComputedStyle(document.querySelector('[data-hive-id]')).display !== 'none',
    }))
  } catch (e) {
    out.error = String(e)
  }

  return out
}