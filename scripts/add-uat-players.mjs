#!/usr/bin/env node

/**
 * Script to add UAT test players to the database via Convex
 *
 * Run this from the project root:
 *   npx convex run models/players:createPlayer --args '{"name":"Liam Murphy", ...}'
 *
 * Or use the Convex dashboard to run the bulkImportPlayers mutation
 */

// Test data players from apps/web/uat/test-data.json
const players = [
  {
    firstName: "Liam",
    lastName: "Murphy",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Noah",
    lastName: "O'Brien",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Jack",
    lastName: "Kelly",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "James",
    lastName: "Ryan",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Conor",
    lastName: "Walsh",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Sean",
    lastName: "McCarthy",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Daniel",
    lastName: "Byrne",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Adam",
    lastName: "Doyle",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Cian",
    lastName: "O'Sullivan",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Finn",
    lastName: "Brennan",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
  {
    firstName: "Oisin",
    lastName: "Dunne",
    dateOfBirth: "2017-01-01",
    gender: "Male",
    ageGroup: "U10",
  },
];

// Configuration - UPDATE THESE VALUES
const config = {
  organizationId: "REPLACE_WITH_ORG_ID", // Get from Convex dashboard
  teamId: "REPLACE_WITH_TEAM_ID", // Get from Convex dashboard
  sport: "Soccer",
  season: "2025/2026",
};

console.log("=".repeat(60));
console.log("UAT Test Players - Convex Import Data");
console.log("=".repeat(60));
console.log("");
console.log("To add these players to the database:");
console.log("");
console.log("OPTION 1: Using Convex Dashboard");
console.log("-".repeat(40));
console.log("1. Go to Convex Dashboard: https://dashboard.convex.dev");
console.log("2. Select your project");
console.log("3. Go to Functions tab");
console.log("4. Find: models/players:bulkImportPlayers");
console.log("5. Copy and paste the JSON below into the 'players' argument");
console.log("");

// Generate bulk import data
const bulkData = players.map((p) => ({
  name: `${p.firstName} ${p.lastName}`,
  ageGroup: p.ageGroup,
  sport: config.sport,
  gender: p.gender,
  organizationId: config.organizationId,
  season: config.season,
  teamId: config.teamId,
  dateOfBirth: p.dateOfBirth,
  createdFrom: "UAT Test Data",
}));

console.log("JSON for bulkImportPlayers mutation:");
console.log("-".repeat(40));
console.log(JSON.stringify({ players: bulkData }, null, 2));
console.log("");
console.log("=".repeat(60));
console.log("");
console.log("OPTION 2: Using npx convex run (one at a time)");
console.log("-".repeat(40));

players.forEach((p) => {
  const args = {
    name: `${p.firstName} ${p.lastName}`,
    ageGroup: p.ageGroup,
    sport: config.sport,
    gender: p.gender,
    organizationId: config.organizationId,
    season: config.season,
    dateOfBirth: p.dateOfBirth,
  };
  console.log(
    `npx convex run models/players:createPlayer --args '${JSON.stringify(args)}'`
  );
});

console.log("");
console.log("=".repeat(60));
console.log("FINDING YOUR ORG ID AND TEAM ID");
console.log("=".repeat(60));
console.log("");
console.log("In Convex Dashboard:");
console.log("1. Go to Data tab");
console.log("2. Look for organizations collection (in Better Auth tables)");
console.log("3. Find 'Test Club FC' and copy its _id");
console.log("4. Look for teams collection");
console.log("5. Find the team and copy its _id");
console.log("");
