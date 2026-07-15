import { test, expect } from '@playwright/test'

// E2E Scenario 2: User Likes & Reviews Flow
// T13でLikeButton・StoreReviewSectionを店舗一覧・店舗詳細ページ(/stores/:storeId)に
// 結線したことに伴い、実UI（実際のテキスト・data-testid）に合わせて更新
test.describe('Scenario 2: User Engagement - Likes & Reviews - TC_28_1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Login as regular user
    await page.fill('input[type="email"]', 'itagaki@ai-hackason.example')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("ログイン")')
    await page.waitForURL('**/dashboard')
  })

  test('user can like and review a store', async ({ page }) => {
    // Navigate to store list
    await page.click('text=店舗一覧・予約')
    await page.waitForURL('**/stores')
    await page.waitForSelector('[data-testid="store-item"]')

    // Click on a store to open its detail page
    await page.locator('[data-testid="store-item"] >> nth=0 >> button').first().click()
    await page.waitForURL('**/stores/*')
    await page.waitForSelector('text=店舗詳細')

    // Like the store
    const likeButton = page.locator('[data-testid="like-button"]')
    const before = Number(await likeButton.locator('[data-testid="like-count"]').textContent())
    await likeButton.click()
    await expect(likeButton.locator('[data-testid="like-count"]')).toHaveText(String(before + 1))

    // Open review form
    await page.click('text=レビューを書く')
    await page.waitForSelector('textarea[placeholder="お店の感想を書いてください"]')

    // Write review
    await page.fill('textarea[placeholder="お店の感想を書いてください"]', 'Great store with excellent service!')
    await page.click('button[aria-label="5つ星"]')
    await page.click('button:has-text("投稿する")')

    // Verify review submitted
    await expect(page.locator('text=レビューを投稿しました')).toBeVisible()
  })

  test('user can see average rating for stores', async ({ page }) => {
    await page.click('text=店舗一覧・予約')
    await page.waitForURL('**/stores')
    await page.waitForSelector('[data-testid="store-item"]')

    // Click on store with reviews
    await page.locator('[data-testid="store-item"] >> nth=0 >> button').first().click()
    await page.waitForSelector('[data-testid="average-rating"]')

    // Verify rating display
    const ratingText = await page.locator('[data-testid="average-rating"]').textContent()
    expect(ratingText).toMatch(/\d+\.\d+/)
  })
})

// E2E Scenario 3: Analytics & Reservation
test.describe('Scenario 3: Crowd Analytics Dashboard - TC_32_1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Login as admin
    await page.fill('input[type="email"]', 'yoshizawa@ai-hackason.example')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button:has-text("ログイン")')
    await page.waitForSelector('text=ダッシュボード')
  })

  test('admin can view crowd analytics and patterns', async ({ page }) => {
    // Navigate to analytics
    await page.click('text=混雑分析')
    await page.waitForSelector('.analytics-dashboard')

    // Select store
    await page.selectOption('select[name="storeFilter"]', 'store-001')
    await page.click('button:has-text("分析")')
    await page.waitForTimeout(1000)

    // Verify charts are displayed
    const pieChart = await page.locator('.crowd-distribution-chart')
    expect(await pieChart.isVisible()).toBeTruthy()

    // Verify peak hours
    const peakHours = await page.locator('.peak-hours')
    const text = await peakHours.textContent()
    expect(text).toBeTruthy()
  })

  test('admin can export analytics data', async ({ page }) => {
    await page.click('text=混雑分析')
    await page.waitForSelector('.analytics-dashboard')

    // Export as CSV
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("CSVでエクスポート")')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('analytics')
  })
})

// E2E Scenario 4: Reservation Flow
test.describe('Scenario 4: User Reservation - TC_34_1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Login as regular user
    await page.fill('input[type="email"]', 'itagaki@ai-hackason.example')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("ログイン")')
    await page.waitForSelector('text=ダッシュボード')
  })

  test('user can make a reservation', async ({ page }) => {
    // Navigate to store
    await page.click('text=店舗一覧')
    await page.click('.store-item >> nth=0')

    // Click reservation button
    await page.click('button:has-text("予約する")')
    await page.waitForSelector('.reservation-form')

    // Fill reservation details
    await page.fill('input[type="date"]', '2026-07-25')
    await page.selectOption('select[name="partySize"]', '4')
    await page.fill('textarea[name="notes"]', 'Window seat preferred')

    // Confirm reservation
    await page.click('button:has-text("予約確定")')

    // Verify confirmation
    await expect(page.locator('text=予約が確定しました')).toBeVisible()

    // Verify reservation details shown
    const confirmationText = await page.locator('.reservation-confirmation').textContent()
    expect(confirmationText).toContain('予約番号')
  })

  test('user cannot book past dates', async ({ page }) => {
    await page.click('text=店舗一覧')
    await page.click('.store-item >> nth=0')
    await page.click('button:has-text("予約する")')

    // Try to set past date
    const dateInput = page.locator('input[type="date"]')
    await dateInput.fill('2026-07-05')

    // Should show error or disable button
    const submitButton = page.locator('button:has-text("予約確定")')
    const isDisabled = await submitButton.isDisabled()
    expect(isDisabled || (await page.locator('.error-message').isVisible())).toBeTruthy()
  })
})
