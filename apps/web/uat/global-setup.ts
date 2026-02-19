import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { setupAuthentication } from "./auth-utils";

/**
 * Global Setup for PlayerARC UAT Tests
 *
 * This runs once before all tests to:
 * 1. Run linting check on changed files
 * 2. Create authenticated storage states for each user role (via auth.setup.ts)
 */

/**
 * Run linting check before tests
 * Uses the same biome configuration as pre-commit hooks
 * Only checks files changed in current branch (compared to main)
 */
async function runLintingCheck(): Promise<void> {
  console.log("\n🔍 UAT Pre-Test: Running linting check on changed files...");

  const projectRoot = path.join(__dirname, "../../..");

  try {
    // Get the main branch name (could be 'main' or 'master')
    let mainBranch = "main";
    try {
      execSync("git rev-parse --verify main", {
        cwd: projectRoot,
        stdio: "ignore",
      });
    } catch {
      try {
        execSync("git rev-parse --verify master", {
          cwd: projectRoot,
          stdio: "ignore",
        });
        mainBranch = "master";
      } catch {
        console.log("⚠️  Could not find main/master branch, checking all files");
        mainBranch = null;
      }
    }

    // Get list of changed files
    let changedFiles: string[] = [];
    if (mainBranch) {
      try {
        const gitDiffOutput = execSync(
          `git diff --name-only --diff-filter=ACM ${mainBranch}...HEAD`,
          {
            cwd: projectRoot,
            encoding: "utf-8",
          }
        );
        changedFiles = gitDiffOutput
          .trim()
          .split("\n")
          .filter((file) => file.match(/\.(ts|tsx|js|jsx)$/))
          .filter((file) => file.length > 0);
      } catch (error) {
        // If git diff fails, fall back to checking all files
        console.log("⚠️  Git diff failed, checking all files");
      }
    }

    // If no changed files, skip linting
    if (changedFiles.length === 0) {
      console.log("ℹ️  No changed TypeScript/JavaScript files to lint");
      console.log("✅ Linting check passed!\n");
      return;
    }

    console.log(`   Checking ${changedFiles.length} changed file(s)...`);

    // Run biome check on changed files only
    // This matches pre-commit behavior (only check changed files)
    execSync(
      `npx biome check --diagnostic-level=error --files-ignore-unknown=true --no-errors-on-unmatched ${changedFiles.join(" ")}`,
      {
        cwd: projectRoot,
        stdio: "inherit", // Show biome output directly
        encoding: "utf-8",
      }
    );

    console.log("✅ Linting check passed!\n");
  } catch (error) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ LINTING FAILED - UAT tests cannot proceed");
    console.error("");
    console.error("Fix linting errors in changed files before running tests:");
    console.error("  npx biome check --write <file>   # Auto-fix safe issues");
    console.error("  npx biome check <file>           # View all issues");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");

    throw new Error("Linting check failed - UAT tests blocked");
  }
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  // Run linting check before proceeding with authentication
  await runLintingCheck();

  // Create authenticated states for each user role
  // This is delegated to auth.setup.ts to keep code DRY
  await setupAuthentication(baseURL);
}

export default globalSetup;
