#!/bin/bash
# Bash script to reset the PDP database and seed reference data
# Uses staged reset to avoid timeouts

set -e  # Exit on error

echo "🔄 Resetting PDP database (staged approach)..."

# Navigate to the PDP backend folder
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PATH="$SCRIPT_DIR/../../../../packages/backend"

if [ ! -d "$BACKEND_PATH" ]; then
    echo "❌ Backend path not found: $BACKEND_PATH"
    exit 1
fi

cd "$BACKEND_PATH" || exit 1

echo ""
echo "=========================================="
echo "Stage 1: Deleting application data..."
echo "=========================================="
npx convex run scripts/stagedReset:stage1AppData '{"confirm": true}'

echo ""
echo "=========================================="
echo "Stage 2: Deleting reference data..."
echo "=========================================="
npx convex run scripts/stagedReset:stage2ReferenceData '{"confirm": true}'

echo ""
echo "=========================================="
echo "Stage 3: Deleting Better Auth tables..."
echo "=========================================="

# Delete each Better Auth table (order matters - delete dependent tables first)
MODELS=("session" "teamMember" "invitation" "member" "team" "account" "verification" "organization" "user")

for model in "${MODELS[@]}"; do
    echo "Deleting $model records..."
    # Delete in batches - run 5 times max per model to avoid infinite loops
    for i in {1..10}; do
        result=$(npx convex run scripts/stagedReset:stage3BetterAuthBatch "{\"model\": \"$model\", \"confirm\": true}" 2>&1)
        
        # Extract deleted count - look for "deleted": N pattern
        deleted_count=$(echo "$result" | grep -o '"deleted":[[:space:]]*[0-9]*' | grep -o '[0-9]*' | head -1)
        
        echo "  Batch $i: deleted $deleted_count"
        
        # If no records deleted, move to next model
        if [ "$deleted_count" = "0" ] || [ -z "$deleted_count" ]; then
            echo "  ✅ $model complete"
            break
        fi
    done
done

echo ""
echo "=========================================="
echo "Stage 4: Seeding reference data..."
echo "=========================================="
npx convex run models/referenceData:seedAllReferenceData

echo ""
echo "🎉 Database reset and seed complete!"
echo ""
echo "You can now run the UAT tests with:"
echo "  cd apps/web"
echo "  npm run test:setup"
