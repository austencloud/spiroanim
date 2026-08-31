import { test, expect } from '@playwright/test'

const expectedCleanupMessages = new Set(['WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost'])

test('restores both routes with browser back and forward navigation', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      if (expectedCleanupMessages.has(message.text())) return
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'SpiroAnim.com' })).toBeVisible()

  await page.getByRole('link', { name: 'Enter' }).click()
  await expect(page.locator('[data-role="main-container"]')).toBeVisible()

  await page.goBack()
  expect(new URL(page.url()).pathname).toBe('/')
  await expect(page.getByRole('heading', { name: 'SpiroAnim.com' })).toBeVisible()
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])

  await page.goForward()
  await expect(page.locator('[data-role="main-container"]')).toBeVisible()
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('hydrates a VTG selection through the lazy pattern-matching worker', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      if (expectedCleanupMessages.has(message.text())) return
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/vulcan-tech-gospel')
  const pane = page.locator('[data-role="vtg-pane"]')
  const cell = page.locator('[data-cell-reference="5-6"]')
  await expect(pane).toBeVisible()
  await cell.click()
  await expect(pane).toHaveAttribute('data-selected-cell', '5-6')
  await expect.poll(() => new URL(page.url()).searchParams.has('r')).toBe(true)

  await page.reload()

  await expect(pane).toHaveAttribute('data-selected-cell', '5-6')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('mounts the full Player in Builder with live override playback and collision-safe controls', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(
    '/play-vtg?r=Ew08Yk11Y&p0=Q__.mBEQDk.5JE.......&x0=_s_&m0=_1_mxqv__&p1=N__.blERhw.5JEQpg.......&x1=_s_&c=_i_bhq&v=11',
  )
  const builderToggle = page
    .locator('label.vtg-pattern-builder-button')
    .filter({ hasText: 'Pattern Builder' })
  await builderToggle.click()

  const builder = page.locator('[data-role="builder-pane-view"]')
  const builderPlayer = builder.locator('[data-role="builder-player"]')
  const sharedPlayer = builderPlayer.locator('[data-role="player-view"]')
  const freeCamera = sharedPlayer.getByRole('button', { name: 'Free camera' })
  const swap = builder.getByRole('button', { name: 'Swap Builder Views' })
  const exit = builder.getByRole('button', { name: 'Exit Pattern Builder' })
  const menu = page.getByRole('button', { name: 'Open SpiroAnim menu' })
  await expect(builderPlayer).toBeVisible()
  await expect(sharedPlayer).toBeVisible()
  const position = sharedPlayer.getByRole('slider', { name: 'Animation position' })
  const initialPosition = Number(await position.inputValue())
  await expect.poll(async () => Number(await position.inputValue())).not.toBe(initialPosition)
  const [playerViewBox, initialProgressBox] = await Promise.all([
    sharedPlayer.boundingBox(),
    sharedPlayer.locator('.slider').boundingBox(),
  ])
  expect(playerViewBox).not.toBeNull()
  expect(initialProgressBox).not.toBeNull()
  expect(initialProgressBox!.x).toBeCloseTo(playerViewBox!.x, 0)
  await page.locator('[data-cell-reference="1-2"]').click()
  await expect(builder.locator('[data-role="builder-preview-countdown"]')).toBeVisible()
  const previewInitialPosition = Number(await position.inputValue())
  await expect
    .poll(async () => Number(await position.inputValue()))
    .not.toBe(previewInitialPosition)
  await expect(sharedPlayer.locator('.slider')).not.toHaveClass(/slider--compact/)
  await expect(page.locator('[data-role="player-view"]')).toHaveCount(1)
  await expect(freeCamera).toHaveAttribute('aria-pressed', 'false')
  await expect(sharedPlayer.locator('canvas')).toHaveCSS('touch-action', 'none')
  await expect(exit).toHaveCSS('background-image', /linear-gradient/)
  await expect(exit).toHaveCSS('border-top-width', '2px')

  const [builderBox, menuBox, exitBox] = await Promise.all([
    builder.boundingBox(),
    menu.boundingBox(),
    exit.boundingBox(),
  ])
  expect(builderBox).not.toBeNull()
  expect(menuBox).not.toBeNull()
  expect(exitBox).not.toBeNull()
  expect(exitBox!.y - builderBox!.y).toBeCloseTo(1, 0)
  expect(exitBox!.x).toBeGreaterThanOrEqual(menuBox!.x + menuBox!.width + 8)

  // The Vite devtools iframe overlaps this bottom-right control in the test server.
  await swap.dispatchEvent('click')
  await expect(builder.locator('[data-role="bottom-pane"] [data-role="player-view"]')).toBeVisible()
  await expect(sharedPlayer.locator('.slider')).toHaveCSS('right', '40px')
  const swappedInitialPosition = Number(await position.inputValue())
  await expect
    .poll(async () => Number(await position.inputValue()))
    .not.toBe(swappedInitialPosition)
  const [progressBox, swapBox] = await Promise.all([
    sharedPlayer.locator('.slider').boundingBox(),
    swap.boundingBox(),
  ])
  expect(progressBox).not.toBeNull()
  expect(swapBox).not.toBeNull()
  expect(progressBox!.x).toBeCloseTo(playerViewBox!.x, 0)
  expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(swapBox!.x)

  await freeCamera.click()
  await expect(freeCamera).toHaveAttribute('aria-pressed', 'true')

  await builderToggle.click()
  await expect(page.locator('[data-role="player-view"]')).toBeVisible()
  const restoredPosition = page
    .locator('[data-role="player-view"]')
    .getByRole('slider', { name: 'Animation position' })
  const restoredInitialPosition = Number(await restoredPosition.inputValue())
  await expect
    .poll(async () => Number(await restoredPosition.inputValue()))
    .not.toBe(restoredInitialPosition)
  await expect(
    page.locator('[data-role="player-view"]').getByRole('button', { name: 'Free camera' }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(pageErrors).toEqual([])
})

test('opens VTG documents and returns to the exact app URL', async ({ page }) => {
  await page.goto('/vulcan-tech-gospel?docsReturn=preserved#selected-pattern')
  await expect.poll(() => new URL(page.url()).pathname).toBe('/play-vtg')
  const appUrl = page.url()
  const appLocation = new URL(appUrl)
  const appReturnPath = `${appLocation.pathname}${appLocation.search}${appLocation.hash}`
  const docsButton = page.getByRole('button', { name: 'Docs' })
  const docsMenu = page.locator('[data-role="concept-docs-menu"]')
  const conceptsPane = page.locator('[data-concepts-pane]')

  await page.getByRole('button', { name: 'Create four Quick Slots' }).click()
  const [conceptsBox, conceptsClientWidth, docsBox, quickSlotsBox] = await Promise.all([
    conceptsPane.boundingBox(),
    conceptsPane.evaluate((element) => element.clientWidth),
    docsButton.boundingBox(),
    conceptsPane.locator('[data-role="quick-slots"]').boundingBox(),
  ])
  expect(conceptsBox).not.toBeNull()
  expect(docsBox).not.toBeNull()
  expect(quickSlotsBox).not.toBeNull()
  expect(quickSlotsBox!.x - conceptsBox!.x).toBeCloseTo(docsBox!.width, 0)
  expect(
    conceptsBox!.x + conceptsClientWidth - quickSlotsBox!.x - quickSlotsBox!.width,
  ).toBeCloseTo(docsBox!.width, 0)
  await conceptsPane.evaluate((element) => {
    element.scrollTop = 200
  })
  await expect.poll(async () => (await docsButton.boundingBox())?.y).toBeCloseTo(docsBox!.y, 0)

  await docsButton.click()
  await expect(docsMenu.locator('a', { hasText: 'VTG3 Reference' })).toHaveAttribute(
    'href',
    /\/vtg3\/\?returnTo=/,
  )
  await docsMenu.locator('a', { hasText: 'VTG4 Expansion' }).click()

  await expect(page.getByRole('heading', { name: 'Timing & Direction' })).toBeVisible()
  await expect(page.getByText('VTG4 expands on VTG3')).toBeVisible()
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(appReturnPath)
  await page.getByRole('link', { name: 'Return to App' }).click()
  await expect(page).toHaveURL(appUrl)
  await expect(docsButton).toBeVisible()

  await docsButton.click()
  await docsMenu.locator('a', { hasText: 'VTG3 Reference' }).click()

  await expect(page.getByRole('heading', { name: 'Vulcan Tech Gospel 3' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'VTG4 Expansion' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Return to App' }).click()
  await expect(page).toHaveURL(appUrl)
})

test('does not rewrite 45 Trans Quick Slots while their controls hydrate', async ({ page }) => {
  const quickSlotPaths = [
    '/play-vtg?r=Ew08Yk11Y&p0=Q__.biQ_____s.5JEs8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&m0=_1_mxqv__&p1=N__.biQ_____s.5L_s8......._ZEwm........_ZEs8........_ZEwm........_ZEs8&c=_i_bhq&v=6',
    '/play-vtg?r=Ew08Yk11Y&p0=Q__.biQ_____s.5JEs8.......&m0=_1_mxqv__&p1=N__.biQ_____s.5L_s8.......&c=_i_bhq&v=6',
    '/play-vtg?r=Ew08Yk11Y&p0=Q__.gU0_____s.5E0wm.......&m0=_1_mxqv__&p1=N__.5E0_____s.___wm.......&c=_i_bhq&v=6',
    '/play-vtg?r=Ew08Yk11Y&p0=Q__.________s.5E0s8.......&m0=_1_mxqv__&p1=N__.mD______s.5L_s8.......&c=_i_bhq&v=6',
    '/play-vtg?r=Ew08kk11Y&p0=Q__.5JE_____s.blExM...&m0=_1_mxqv__&p1=N__.5JE_____s.bn_xM...&c=_i_bhq&v=6',
  ]

  await page.goto(quickSlotPaths[0]!)
  await page
    .getByRole('button', {
      name: 'Use the detected 45-degree transition with Quick Slots',
    })
    .click()
  await expect(page.locator('[data-role^="quick-slot-"] input')).toHaveCount(5)

  for (const slot of [1, 2, 4, 3, 5]) {
    await page.locator(`[data-role="quick-slot-${slot}"] input`).click()
    await expect
      .poll(() => {
        const url = new URL(page.url())
        return `${url.pathname}${url.search}`
      })
      .toBe(quickSlotPaths[slot - 1])
  }
})
