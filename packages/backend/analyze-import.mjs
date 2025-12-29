#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CSV file
const csvPath = path.join(
  process.env.HOME,
  "Downloads",
  "Grange-GAA-Members.csv"
);
const csvContent = fs.readFileSync(csvPath, "utf-8");

// Parse CSV (simple parser)
const lines = csvContent.split("\n");
const headers = lines[0].split(",");

console.log("📊 GRANGE GAA MEMBERS CSV ANALYSIS");
console.log("=".repeat(70));
console.log(`\nTotal rows (including header): ${lines.length}`);
console.log(`Total members: ${lines.length - 1}\n`);

// Find key column indexes
const membershipTypeIdx = headers.indexOf("Membership Type");
const playerFlagIdx = headers.indexOf("Player");
const genderIdx = headers.indexOf("gender");
const dobIdx = headers.indexOf("DOB");
const emailIdx = headers.indexOf("email");
const forenameIdx = headers.indexOf("Forename");
const surnameIdx = headers.indexOf("Surname");

// Statistics
const stats = {
  totalRecords: 0,
  youth: 0,
  adult: 0,
  players: 0,
  nonPlayers: 0,
  withEmail: 0,
  withoutEmail: 0,
  withDOB: 0,
  withoutDOB: 0,
  male: 0,
  female: 0,
  membershipTypes: {},
  missingNames: 0,
  validYouthPlayers: 0,
  validAdultPlayers: 0,
};

// Sample records
const sampleYouth = [];
const sampleAdult = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  const cols = lines[i].split(",");
  stats.totalRecords++;

  const forename = cols[forenameIdx]?.trim();
  const surname = cols[surnameIdx]?.trim();
  const membershipType = cols[membershipTypeIdx]?.trim();
  const playerFlag = cols[playerFlagIdx]?.trim();
  const gender = cols[genderIdx]?.trim();
  const dob = cols[dobIdx]?.trim();
  const email = cols[emailIdx]?.trim();

  // Check for missing names
  if (!(forename && surname)) {
    stats.missingNames++;
  }

  // Membership type stats
  if (membershipType) {
    stats.membershipTypes[membershipType] =
      (stats.membershipTypes[membershipType] || 0) + 1;
  }

  // Youth vs Adult
  if (membershipType === "YOUTH") {
    stats.youth++;
    if (playerFlag === "Y" && forename && surname && dob) {
      stats.validYouthPlayers++;
      if (sampleYouth.length < 3) {
        sampleYouth.push({ forename, surname, dob, email });
      }
    }
  } else if (membershipType === "FULL" || membershipType === "SOCIAL") {
    stats.adult++;
    if (playerFlag === "Y" && forename && surname && dob) {
      stats.validAdultPlayers++;
      if (sampleAdult.length < 3) {
        sampleAdult.push({ forename, surname, dob, email });
      }
    }
  }

  // Player flag
  if (playerFlag === "Y") {
    stats.players++;
  } else if (playerFlag === "N") {
    stats.nonPlayers++;
  }

  // Email
  if (email && email.includes("@")) {
    stats.withEmail++;
  } else {
    stats.withoutEmail++;
  }

  // DOB
  if (dob) {
    stats.withDOB++;
  } else {
    stats.withoutDOB++;
  }

  // Gender
  if (gender === "MALE") stats.male++;
  if (gender === "FEMALE") stats.female++;
}

console.log("📋 MEMBERSHIP BREAKDOWN:");
console.log("-".repeat(70));
Object.entries(stats.membershipTypes)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(
      `  ${type || "(blank)".padEnd(20)}: ${count.toString().padStart(4)}`
    );
  });

console.log("\n👥 PLAYER BREAKDOWN:");
console.log("-".repeat(70));
console.log(
  `  Youth players (valid for import):     ${stats.validYouthPlayers.toString().padStart(4)}`
);
console.log(
  `  Adult players (valid for import):     ${stats.validAdultPlayers.toString().padStart(4)}`
);
console.log(
  `  Total valid players:                  ${(stats.validYouthPlayers + stats.validAdultPlayers).toString().padStart(4)}`
);
console.log(
  `  Non-players:                          ${stats.nonPlayers.toString().padStart(4)}`
);
console.log(
  `  Unspecified:                          ${(stats.totalRecords - stats.players - stats.nonPlayers).toString().padStart(4)}`
);

console.log("\n📧 EMAIL ANALYSIS:");
console.log("-".repeat(70));
console.log(
  `  With email:                           ${stats.withEmail.toString().padStart(4)}`
);
console.log(
  `  Without email:                        ${stats.withoutEmail.toString().padStart(4)}`
);

console.log("\n📅 DATE OF BIRTH:");
console.log("-".repeat(70));
console.log(
  `  With DOB:                             ${stats.withDOB.toString().padStart(4)}`
);
console.log(
  `  Without DOB:                          ${stats.withoutDOB.toString().padStart(4)}`
);

console.log("\n⚧️ GENDER:");
console.log("-".repeat(70));
console.log(
  `  Male:                                 ${stats.male.toString().padStart(4)}`
);
console.log(
  `  Female:                               ${stats.female.toString().padStart(4)}`
);

console.log("\n⚠️  DATA QUALITY:");
console.log("-".repeat(70));
console.log(
  `  Missing names:                        ${stats.missingNames.toString().padStart(4)}`
);

console.log("\n📝 SAMPLE YOUTH PLAYERS (First 3):");
console.log("-".repeat(70));
sampleYouth.forEach((p, i) => {
  console.log(
    `  ${i + 1}. ${p.forename} ${p.surname} (DOB: ${p.dob}, Email: ${p.email || "N/A"})`
  );
});

console.log("\n📝 SAMPLE ADULT PLAYERS (First 3):");
console.log("-".repeat(70));
sampleAdult.forEach((p, i) => {
  console.log(
    `  ${i + 1}. ${p.forename} ${p.surname} (DOB: ${p.dob}, Email: ${p.email || "N/A"})`
  );
});

console.log("\n" + "=".repeat(70));
console.log("✅ Analysis complete!");
console.log("\n💡 KEY FINDINGS:");
console.log(
  `  • ${stats.validYouthPlayers + stats.validAdultPlayers} players are ready to import`
);
console.log(
  `  • ${stats.missingNames} records have missing names (will be skipped)`
);
console.log(
  `  • ${stats.withoutDOB} records missing DOB (${stats.validYouthPlayers + stats.validAdultPlayers} players have DOB)`
);
console.log(
  "  • Guardian data can be inferred from adult records with matching emails"
);
