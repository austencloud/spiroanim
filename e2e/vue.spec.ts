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

  await page.goto('/vulkan-tech-gospel')
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
    await expect.poll(() => {
      const url = new URL(page.url())
      return `${url.pathname}${url.search}`
    }).toBe(quickSlotPaths[slot - 1])
  }
})
