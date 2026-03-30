import { expect } from '@playwright/test'

import { comfyPageFixture as test } from '../fixtures/ComfyPage'

test.describe('Load3D', () => {
  test.beforeEach(async ({ comfyPage }) => {
    await comfyPage.settings.setSetting('Comfy.VueNodes.Enabled', true)
    await comfyPage.workflow.loadWorkflow('3d/load3d_node')
    await comfyPage.vueNodes.waitForNodes()
  })

  test(
    'Renders canvas with upload buttons and controls menu',
    { tag: ['@smoke', '@screenshot'] },
    async ({ comfyPage }) => {
      const node = comfyPage.vueNodes.getNodeLocator('1')
      await expect(node).toBeVisible()

      await expect(node.locator('canvas')).toBeVisible()

      const canvasBox = await node.locator('canvas').boundingBox()
      expect(canvasBox!.width).toBeGreaterThan(0)
      expect(canvasBox!.height).toBeGreaterThan(0)

      await expect(node.getByText('upload 3d model')).toBeVisible()
      await expect(node.getByText('upload extra resources')).toBeVisible()
      await expect(node.getByText('clear')).toBeVisible()

      await expect(node.locator('.pi-bars')).toBeVisible()

      await expect(node).toHaveScreenshot('load3d-empty-node.png', {
        maxDiffPixelRatio: 0.05
      })
    }
  )

  test(
    'Controls menu opens and shows all categories',
    { tag: ['@smoke', '@screenshot'] },
    async ({ comfyPage }) => {
      const node = comfyPage.vueNodes.getNodeLocator('1')

      const menuButton = node.locator('.pi-bars')
      await menuButton.click()

      await expect(node.getByText('Scene', { exact: true })).toBeVisible()
      await expect(node.getByText('Model', { exact: true })).toBeVisible()
      await expect(node.getByText('Camera', { exact: true })).toBeVisible()
      await expect(node.getByText('Light', { exact: true })).toBeVisible()
      await expect(node.getByText('Export', { exact: true })).toBeVisible()

      await expect(node).toHaveScreenshot('load3d-controls-menu-open.png', {
        maxDiffPixelRatio: 0.05
      })
    }
  )

  test(
    'Changing background color updates the scene',
    { tag: ['@smoke', '@screenshot'] },
    async ({ comfyPage }) => {
      const node = comfyPage.vueNodes.getNodeLocator('1')

      // Scene controls are the default active category — palette button visible
      const colorInput = node.locator('input[type="color"]')
      await colorInput.evaluate((el) => {
        ;(el as HTMLInputElement).value = '#cc3333'
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await comfyPage.nextFrame()

      await expect
        .poll(
          () =>
            comfyPage.page.evaluate(() => {
              const n = window.app!.graph.getNodeById(1)
              const config = n?.properties?.['Scene Config'] as
                | Record<string, string>
                | undefined
              return config?.backgroundColor
            }),
          { timeout: 3000 }
        )
        .toBe('#cc3333')

      await expect(node).toHaveScreenshot('load3d-red-background.png', {
        maxDiffPixelRatio: 0.05
      })
    }
  )

  test(
    'Recording controls are visible for Load3D',
    { tag: '@smoke' },
    async ({ comfyPage }) => {
      const node = comfyPage.vueNodes.getNodeLocator('1')

      await expect(node.locator('.pi-video')).toBeVisible()
    }
  )
})
