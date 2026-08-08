# Buzzard Cursor Package

Files:
1. `buzzard_categories.json` — master category/navigation data source (41 main categories).
2. `buzzard_categories.sql` — database schema + seed data.
3. `CURSOR_INSTRUCTIONS.md` — exact implementation instructions for Cursor.

Recommended use:
- Put all three files inside the project repository.
- Give Cursor `CURSOR_INSTRUCTIONS.md` as the implementation specification.
- Tell Cursor to use `buzzard_categories.json` as the navigation source of truth.
- If the project already has a database, use the SQL as the reference schema and migrate safely rather than destroying existing data.

Important:
This package is designed to stop the common problem where Cursor creates a demo menu with only a few categories. The navigation must be data-driven and must render all 41 main categories.
