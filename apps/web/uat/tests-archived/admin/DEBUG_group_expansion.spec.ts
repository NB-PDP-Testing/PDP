import { test } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * DEBUG: Test group expansion behavior
 */

test("DEBUG: Test expanding sidebar groups", async ({ ownerPage }) => {
  const page = ownerPage;
  
  // Navigate to admin panel
  await page.goto("/orgs");
  await page.click('text="Admin Panel"');
  await waitForPageLoad(page);
  
  console.log("\n=== INITIAL STATE ===");
  
  // Check for "Overrides" link before expansion
  const overridesLinkBefore = page.locator('a[href*="/admin/overrides"]');
  const countBefore = await overridesLinkBefore.count();
  console.log(`Overrides links before expansion: ${countBefore}`);
  
  // Try to find "Teams & Access" button
  console.log("\n=== LOOKING FOR TEAMS & ACCESS BUTTON ===");
  const teamsButton = page.locator('button:has-text("Teams & Access")');
  const teamsButtonCount = await teamsButton.count();
  console.log(`"Teams & Access" buttons found: ${teamsButtonCount}`);
  
  if (teamsButtonCount > 0) {
    const buttonText = await teamsButton.first().textContent();
    const isVisible = await teamsButton.first().isVisible();
    console.log(`Button text: "${buttonText}"`);
    console.log(`Button visible: ${isVisible}`);
    
    // Try to click it
    console.log("\n=== CLICKING TEAMS & ACCESS BUTTON ===");
    await teamsButton.first().click();
    await page.waitForTimeout(500);
    
    // Check for "Overrides" link after expansion
    const countAfter = await overridesLinkBefore.count();
    console.log(`Overrides links after clicking: ${countAfter}`);
    
    if (countAfter > 0) {
      const linkHref = await overridesLinkBefore.first().getAttribute('href');
      const linkText = await overridesLinkBefore.first().textContent();
      const linkVisible = await overridesLinkBefore.first().isVisible();
      console.log(`Found link: href="${linkHref}" text="${linkText}" visible=${linkVisible}`);
    }
  }
  
  // Take a screenshot after
  await page.screenshot({ path: 'test-results/after-group-click.png', fullPage: true });
  
  console.log("\n=== DONE ===");
});
