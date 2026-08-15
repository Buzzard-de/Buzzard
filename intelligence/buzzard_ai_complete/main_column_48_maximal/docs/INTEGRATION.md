# BUZZARD Main Column Integration

## Data source
`data/taxonomy.json` is the browser-ready representation of the verified 48-category master.

## Desktop
- Left column: all 48 main categories.
- Center/right main column: subcategories of selected main category.
- Each subcategory exposes its sub-subcategories.
- Search traverses all three taxonomy levels.

## Responsive
- Desktop/laptop: sidebar + multi-column content.
- Tablet: two-column content.
- Smartphone: stacked navigation and one-column content.

## Important
The component is data-driven. Do not hard-code the 48 categories into the UI.
When the taxonomy changes, replace `data/taxonomy.json` and the UI updates automatically.
