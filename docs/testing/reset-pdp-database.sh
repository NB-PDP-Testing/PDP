#!/bin/bash

# Shell script to reset the PDP database and seed reference data
# For macOS and Linux systems
#
# Usage: 
#   chmod +x reset-pdp-database.sh  # Make executable (first time only)
#   ./reset-pdp-database.sh          # Run the script
#
# Or run directly with: bash reset-pdp-database.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Resetting PDP database...${NC}"

# Determine the backend path
# Try relative path first (assumes running from PDP root or docs/testing)
if [ -d "packages/backend" ]; then
    BACKEND_PATH="packages/backend"
elif [ -d "../../packages/backend" ]; then
    BACKEND_PATH="../../packages/backend"
elif [ -d "$HOME/code/PDP/packages/backend" ]; then
    BACKEND_PATH="$HOME/code/PDP/packages/backend"
else
    # Ask user for path
    echo -e "${RED}❌ Could not find packages/backend directory${NC}"
    echo -e "${CYAN}Please run this script from the PDP project root, or set BACKEND_PATH${NC}"
    exit 1
fi

echo -e "${CYAN}Using backend path: ${BACKEND_PATH}${NC}"

# Save current directory
ORIGINAL_DIR=$(pwd)

# Navigate to the backend folder
cd "$BACKEND_PATH" || {
    echo -e "${RED}❌ Failed to navigate to backend path: $BACKEND_PATH${NC}"
    exit 1
}

# Function to cleanup on exit
cleanup() {
    cd "$ORIGINAL_DIR"
}
trap cleanup EXIT

# Step 1: Full database reset (deletes ALL data)
echo -e "${CYAN}Step 1/2: Running full reset...${NC}"
npx convex run scripts/fullReset:fullReset '{"confirmNuclearDelete": true}'

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Database reset failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database reset complete${NC}"

# Step 2: Seed reference data (sports, skills, etc.)
echo -e "${CYAN}Step 2/2: Seeding reference data...${NC}"
npx convex run models/referenceData:seedAllReferenceData

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Reference data seeding failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Reference data seeded${NC}"
echo ""
echo -e "${GREEN}🎉 Database reset and seed complete!${NC}"
echo -e "${CYAN}You can now run the UAT tests with:${NC}"
echo -e "${WHITE}  cd ~/code/PDP  # or your PDP project path${NC}"
echo -e "${WHITE}  npx playwright test --project=initial-onboarding${NC}"