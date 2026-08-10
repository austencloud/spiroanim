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
