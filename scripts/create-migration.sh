#!/bin/bash

# Script to create a new migration file with proper timestamp naming
# Usage: ./scripts/create-migration.sh "migration_name"

if [ -z "$1" ]; then
    echo "Usage: $0 \"migration_name\""
    echo "Example: $0 \"add_stripe_integration\""
    exit 1
fi

# Generate timestamp in format: YYYYMMDDHHMM00
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Clean migration name (replace spaces with underscores, lowercase)
MIGRATION_NAME=$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | sed 's/[^a-z0-9_]//g')

# Create migration file
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_${MIGRATION_NAME}.sql"

# Create the migration file with template
cat > "$MIGRATION_FILE" << EOF
-- Migration: $MIGRATION_NAME
-- Created: $(date)
-- 
-- Description: Add your migration description here

-- Add your SQL statements below:

-- Example:
-- ALTER TABLE users ADD COLUMN new_field TEXT;

-- Verify migration (optional):
-- SELECT COUNT(*) FROM users;
EOF

echo "Created migration file: $MIGRATION_FILE"
echo "Edit the file to add your SQL statements, then run:"
echo "  npx supabase db push"