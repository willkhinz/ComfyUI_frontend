import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

import type { AssetInfo } from '../../../src/schemas/apiSchema'
import { comfyPageFixture } from '../../fixtures/ComfyPage'
import type { WorkspaceStore } from '../../types/globals'

interface PublishRecord {
  workflow_id: string
  share_id: string | null
  listed: boolean
  publish_time: string | null
}

const PUBLISHED_RECORD: PublishRecord = {
  workflow_id: 'wf-1',
  share_id: 'share-abc',
  listed: false,
  publish_time: '2026-01-15T00:00:00Z'
}

const PRIVATE_ASSET: AssetInfo = {
  id: 'asset-1',
  name: 'photo.png',
  preview_url: '',
  storage_url: '',
  model: false,
  public: false,
  in_library: false
}

const test = comfyPageFixture

async function enableWorkflowSharing(page: Page): Promise<void> {
  await page.evaluate(() => {
    const api = window.app!.api
    api.serverFeatureFlags.value = {
      ...api.serverFeatureFlags.value,
      workflow_sharing_enabled: true
    }
  })
}

async function mockPublishStatus(
  page: Page,
  record: PublishRecord | null
): Promise<void> {
  await page.route('**/api/userdata/*/publish', async (route) => {
    if (route.request().method() === 'GET') {
      if (!record || !record.share_id) {
        await route.fulfill({ status: 404, body: 'Not found' })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(record)
        })
      }
    } else {
      await route.fallback()
    }
  })
}

async function mockPublishWorkflow(
  page: Page,
  result: PublishRecord
): Promise<void> {
  await page.route('**/api/userdata/*/publish', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(result)
      })
    } else {
      await route.fallback()
    }
  })
}

async function mockShareableAssets(
  page: Page,
  assets: AssetInfo[] = []
): Promise<void> {
  await page.route('**/api/assets/from-workflow', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ assets })
    })
  })
}

async function dismissOverlays(page: Page): Promise<void> {
  // In the cloud build a stale PrimeVue dialog mask can linger after
  // saveWorkflow or from the onboarding flow.  Try dismissing via
  // Escape first, then forcefully remove any remaining masks via JS.
  const mask = page.locator('.p-dialog-mask')
  if ((await mask.count()) > 0) {
    await page.keyboard.press('Escape')
    await mask
      .first()
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {})
  }
  // Force-remove any stale masks that CSS transitions left behind
  if ((await mask.count()) > 0) {
    await page.evaluate(() => {
      document
        .querySelectorAll('.p-dialog-mask')
        .forEach((el) => el.remove())
    })
  }
}

async function saveAndWait(
  comfyPage: { page: Page; menu: { topbar: { saveWorkflow(name: string): Promise<void> } } },
  workflowName: string
): Promise<void> {
  await comfyPage.menu.topbar.saveWorkflow(workflowName)

  // Wait for the workflow to be persisted and clean
  await comfyPage.page.waitForFunction(
    () => {
      const wf = (window.app!.extensionManager as WorkspaceStore).workflow
        .activeWorkflow
      return wf !== null && !wf.isTemporary && !wf.isModified
    },
    undefined,
    { timeout: 5000 }
  )

  // Dismiss any lingering dialog masks from the save operation
  await dismissOverlays(comfyPage.page)

  // Assert workflow state to fail fast with diagnostics if save didn't take
  const state = await comfyPage.page.evaluate(() => {
    const wf = (window.app!.extensionManager as WorkspaceStore).workflow
      .activeWorkflow
    return {
      path: wf?.path,
      isTemporary: wf?.isTemporary,
      isModified: wf?.isModified,
      size: (wf as { size?: number } | null)?.size
    }
  })
  expect(
    state.isTemporary,
    `Workflow should be persisted after save (path=${state.path}, size=${state.size})`
  ).toBe(false)
  expect(
    state.isModified,
    `Workflow should not be modified after save (path=${state.path})`
  ).toBe(false)
}

async function openShareDialog(page: Page): Promise<void> {
  await enableWorkflowSharing(page)
  await dismissOverlays(page)
  const shareButton = page.getByRole('button', { name: 'Share workflow' })
  await shareButton.click()
}

function getShareDialog(page: Page) {
  return page.locator('.p-dialog')
}

test.describe('Share Workflow Dialog', { tag: '@cloud' }, () => {
  test('should show unsaved state for a new workflow', async ({
    comfyPage
  }) => {
    const { page } = comfyPage

    await mockPublishStatus(page, null)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /save workflow/i })
    ).toBeVisible()
  })

  test('should show ready state with create link button', async ({
    comfyPage
  }) => {
    const { page } = comfyPage
    const workflowName = 'share-test-ready'

    await saveAndWait(comfyPage, workflowName)

    await mockPublishStatus(page, null)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /create link/i })
    ).toBeVisible()

    await comfyPage.workflow.deleteWorkflow(workflowName)
  })

  test('should show shared state with copy URL after publishing', async ({
    comfyPage
  }) => {
    const { page } = comfyPage
    const workflowName = 'share-test-shared'

    await saveAndWait(comfyPage, workflowName)

    await mockPublishStatus(page, PUBLISHED_RECORD)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('textbox', { name: /share.*url/i })
    ).toBeVisible()

    await comfyPage.workflow.deleteWorkflow(workflowName)
  })

  test('should show stale state with update link button', async ({
    comfyPage
  }) => {
    const { page } = comfyPage
    const workflowName = 'share-test-stale'

    await saveAndWait(comfyPage, workflowName)

    const staleRecord: PublishRecord = {
      ...PUBLISHED_RECORD,
      publish_time: '2020-01-01T00:00:00Z'
    }

    await mockPublishStatus(page, staleRecord)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /update link/i })
    ).toBeVisible()

    await comfyPage.workflow.deleteWorkflow(workflowName)
  })

  test('should close dialog when close button is clicked', async ({
    comfyPage
  }) => {
    const { page } = comfyPage

    await mockPublishStatus(page, null)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: /close/i }).click()
    await expect(dialog).toBeHidden()
  })

  test('should create link and transition to shared state', async ({
    comfyPage
  }) => {
    const { page } = comfyPage
    const workflowName = 'share-test-create'

    await saveAndWait(comfyPage, workflowName)

    await mockPublishStatus(page, null)
    await mockShareableAssets(page)
    await mockPublishWorkflow(page, PUBLISHED_RECORD)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    const createButton = dialog.getByRole('button', { name: /create link/i })
    await expect(createButton).toBeVisible()
    await createButton.click()

    await expect(
      dialog.getByRole('textbox', { name: /share.*url/i })
    ).toBeVisible()

    await comfyPage.workflow.deleteWorkflow(workflowName)
  })

  test('should show tab buttons when comfyHubUploadEnabled is true', async ({
    comfyPage
  }) => {
    const { page } = comfyPage

    await page.evaluate(() => {
      const api = window.app!.api
      api.serverFeatureFlags.value = {
        ...api.serverFeatureFlags.value,
        comfyhub_upload_enabled: true
      }
    })

    await mockPublishStatus(page, null)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: /share/i })).toBeVisible()
    await expect(dialog.getByRole('tab', { name: /publish/i })).toBeVisible()
  })

  test('should switch between share link and publish tabs', async ({
    comfyPage
  }) => {
    const { page } = comfyPage

    await page.evaluate(() => {
      const api = window.app!.api
      api.serverFeatureFlags.value = {
        ...api.serverFeatureFlags.value,
        comfyhub_upload_enabled: true
      }
    })

    await mockPublishStatus(page, null)
    await mockShareableAssets(page)
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    await expect(dialog).toBeVisible()

    await dialog.getByRole('tab', { name: /publish/i }).click()

    const publishPanel = dialog.getByTestId('publish-tab-panel')
    await expect(publishPanel).toBeVisible()

    await dialog.getByRole('tab', { name: /share/i }).click()
    await expect(publishPanel).toBeHidden()
  })

  test('should require acknowledgment before publishing private assets', async ({
    comfyPage
  }) => {
    const { page } = comfyPage
    const workflowName = 'share-test-ack'

    await saveAndWait(comfyPage, workflowName)

    await mockPublishStatus(page, null)
    await mockShareableAssets(page, [PRIVATE_ASSET])
    await openShareDialog(page)

    const dialog = getShareDialog(page)
    const createButton = dialog.getByRole('button', { name: /create link/i })
    await expect(createButton).toBeDisabled()

    await dialog.locator('input[type="checkbox"]').check()
    await expect(createButton).toBeEnabled()

    await comfyPage.workflow.deleteWorkflow(workflowName)
  })
})
