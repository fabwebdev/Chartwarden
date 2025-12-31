#!/bin/bash

export PGPASSWORD=chartwarden_dev_password

echo "Applying Drizzle migrations..."

cd /Users/fabrice/Sites/chartwarden/Chartwarden/services/api

# Apply migrations in order
for i in {0..17}; do
  files=(database/migrations/drizzle/$(printf "%04d" $i)_*.sql)
  if [ -f "${files[0]}" ]; then
    echo "Applying migration $i: ${files[0]}..."
    psql -h localhost -p 5433 -U chartwarden -d chartwarden -f "${files[0]}" 2>&1 | grep -v "^Password"
  fi
done

echo "✅ Migrations applied!"
