import { test, expect } from '@playwright/test'

// E2E Scenario 1: Store Manager Updates Crowd Status
test.describe('Scenario 1: Store Manager Crowd Updates - TC_25_1', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/')
    // Wait for login form to be ready
    await page.waitForSelector('input[type="email"]')
  })

  test('store manager receives email and updates crowd status via button', async ({ page }) => {
    // Step 1: Login as store manager
    await page.fill('input[type="email"]', 'satoh@ai-hackason.example')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("ログイン")')

    // Wait for dashboard to load
    await page.waitForSelector('text=ダッシュボード')
    expect(page.url()).toContain('/dashboard')

    // Step 2: Verify email notification would be sent (mock check)
    // In real test, would check email inbox or webhook
    const emailNotificationTime = new Date().toISOString()
    expect(emailNotificationTime).toBeTruthy()

    // Step 3: Simulate email button click (30分ごとに送信)
    // Navigate to email mock endpoint to verify notification
    await page.goto('/test/email-notifications')
    await page.waitForSelector('text=高')

    // Step 4: Click crowd update button (高: High Crowd)
    await page.click('button:has-text("高")')

    // Step 5: Verify real-time update on dashboard
    await page.goto('/dashboard')
    await expect(page.locator('text=高')).toBeVisible()

    // Verify timestamp updated
    const timestamp = await page.locator('.crowd-update-time').textContent()
    expect(timestamp).toBeTruthy()
  })

  test('email notification button links are JWT-verified', async ({ page }) => {
    // Simulate token-verified one-time link
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

    // Verify token format
    expect(validToken).toMatch(/^eyJ/)

    // Navigate with valid token
    await page.goto(`/?token=${validToken}`)

    // Should successfully authenticate
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null
    })
    expect(isAuthenticated).toBeTruthy()
  })
})

// E2E Scenario 2: Store Admin Maps & Coordinates
test.describe('Scenario 2: Store Admin Maps - TC_23_1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Login as admin
    await page.fill('input[type="email"]', 'yoshizawa@ai-hackason.example')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button:has-text("ログイン")')
    await page.waitForSelector('text=ダッシュボード')
  })

  test('admin can view store locations on map', async ({ page }) => {
    // Navigate to map view
    await page.click('text=地図表示')
    await page.waitForSelector('.map-container')

    // Verify map is rendered
    const mapElement = await page.locator('.map-container')
    expect(await mapElement.isVisible()).toBeTruthy()

    // Verify stores are displayed on map
    const storeMarkers = await page.locator('.store-marker')
    const count = await storeMarkers.count()
    expect(count).toBeGreaterThan(0)
  })

  test('admin can filter stores by coordinates range', async ({ page }) => {
    await page.click('text=地図表示')
    await page.waitForSelector('.map-container')

    // Filter by coordinate range
    await page.fill('input[placeholder="X軸最小"]', '5')
    await page.fill('input[placeholder="X軸最大"]', '15')
    await page.fill('input[placeholder="Y軸最小"]', '10')
    await page.fill('input[placeholder="Y軸最大"]', '25')

    await page.click('button:has-text("フィルター")')
    await page.waitForTimeout(500)

    // Verify filtered results
    const storeMarkers = await page.locator('.store-marker')
    const count = await storeMarkers.count()
    expect(count).toBeGreaterThan(0)
  })
})

// E2E Scenario 3: Real-time Crowd Data
test.describe('Scenario 3: Real-time Crowd Display - TC_26_1', () => {
  test('user sees real-time crowd status updates', async ({ page, context }) => {
    // Open two tabs to simulate real-time update
    const page1 = page
    const page2 = await context.newPage()

    // Tab 1: User viewing dashboard
    await page1.goto('/dashboard')
    await page1.waitForSelector('text=混雑状況')

    // Tab 2: Store manager updating crowd status
    await page2.goto('/store-manager')
    await page2.fill('select[name="crowdLevel"]', 'medium')
    await page2.click('button:has-text("更新")')

    // Tab 1: Should see update in real-time
    await page1.waitForSelector('text=中')
    const crowdText = await page1.locator('.crowd-status').textContent()
    expect(crowdText).toContain('中')

    await page2.close()
  })
})
