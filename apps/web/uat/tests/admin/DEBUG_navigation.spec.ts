import { test } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * DEBUG: Navigation Element Inspector
 * 
 * This test helps diagnose why navigation tests are failing by:
 * 1. Taking a screenshot of the admin panel
 * 2. Listing all navigation links found on the page
 * 3. Checking if specific hrefs exist
 */

test("DEBUG: Inspect admin navigation elements", async ({ ownerPage }) => {
  const page = ownerPage;
  
  // Navigate to admin panel
  await page.goto("/orgs");
  await page.click('text="Admin Panel"');
  await waitForPageLoad(page);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/admin-nav-debug.png', fullPage: true });
  
  // List ALL links on the page
  const allLinks = await page.locator('a').all();
  console.log(`\n=== TOTAL LINKS ON PAGE: ${allLinks.length} ===\n`);
  
  for (let i = 0; i < allLinks.length; i++) {
    const link = allLinks[i];
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    const isVisible = await link.isVisible();
    console.log(`Link ${i}: href="${href}" text="${text?.trim()}" visible=${isVisible}`);
  }
  
  // Check for specific admin hrefs
  console.log('\n=== CHECKING FOR SPECIFIC ADMIN LINKS ===\n');
  
  const testHrefs = [
    '/admin/overrides',
    '/admin/benchmarks',
    '/admin/analytics',
    '/admin/announcements',
    '/admin/player-access',
    '/admin/dev-tools',
    '/admin/players',
    '/admin/teams',
    '/admin/users',
    '/admin/settings',
  ];
  
  for (const href of testHrefs) {
    const links = page.locator(`a[href*="${href}"]`);
    const count = await links.count();
    console.log(`Links matching "${href}": ${count}`);
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const fullHref = await link.getAttribute('href');
        const text = await link.textContent();
        const isVisible = await link.isVisible();
        const isAttached = await link.evaluate(el => el.isConnected);
        console.log(`  [${i}] href="${fullHref}" text="${text?.trim()}" visible=${isVisible} attached=${isAttached}`);
      }
    }
  }
  
  // Check for navigation containers
  console.log('\n=== CHECKING NAVIGATION CONTAINERS ===\n');
  const horizontalNav = page.locator('nav.overflow-x-auto');
  const hasHorizontalNav = await horizontalNav.count();
  console.log(`Horizontal scroll navigation: ${hasHorizontalNav > 0 ? 'FOUND' : 'NOT FOUND'}`);
  
  const sidebar = page.locator('aside');
  const hasSidebar = await sidebar.count();
  console.log(`Sidebar navigation: ${hasSidebar > 0 ? 'FOUND' : 'NOT FOUND'}`);
  
  // Check feature flag indicators
  console.log('\n=== DONE ===');
});
