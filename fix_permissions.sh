#!/bin/bash
# Replace hasPermission imports with canViewPage, can

for file in src/pages/*.tsx src/components/layout/Sidebar.tsx; do
  # Replace import
  sed -i "s/import {.*hasPermission.*} from .*permissions.*/import { PAGE_KEYS, canViewPage, can } from '..\/lib\/permissions';/g" "$file"
  sed -i "s/import {.*hasPermission.*} from .*permissions.*/import { PAGE_KEYS, canViewPage, can } from '..\/..\/lib\/permissions';/g" "$file"

  # Replace usage. This might be tricky because of context. It's safer to do this per file manually.
done
