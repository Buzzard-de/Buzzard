# Buzzard Intelligence Pipeline

Canonical flow from public sources to master taxonomy.

```
PUBLIC SOURCES
      ↓
SOURCE DISCOVERY
      ↓
PUBLIC COLLECTOR
      ↓
PARSER / NORMALIZER
      ↓
CANONICAL CATEGORY RESOLVER
      ↓
┌─────────────────────────────┐
│  CATEGORY INTELLIGENCE       │
│  COMPETITOR INTELLIGENCE     │
│  PRICE INTELLIGENCE          │
│  PRODUCT INTELLIGENCE        │
│  SUPPLIER INTELLIGENCE       │
│  DEMAND INTELLIGENCE         │
│  TREND INTELLIGENCE          │
└─────────────────────────────┘
      ↓
OPPORTUNITY ENGINE
      ↓
SHARED MEMORY
      ↓
ALERT ENGINE
      ↓
CENTRAL KURMAY AI (Aslan Bey)
      ↓
HUMAN APPROVAL
      ↓
BUZZARD MASTER TAXONOMY
```

## CLI

```bash
cd intelligence
python3 main.py complete-intelligence-pipeline-run
python3 main.py complete-intelligence-pipeline-health
```

## API

- `GET /intelligence-pipeline/health`
- `GET /intelligence-pipeline/stages`
- `POST /intelligence-pipeline/run?domain=kfz_automotive`

## KFZ domain

Uses `buzzard_master_kfz_intelligence_os.json` as taxonomy seed and
`kfz_shop_bridge.json` as shop resolver for `cat-05` Automotive.

**All-in-One Console:** `/taxonomy/buzzard_intelligence_os_all_in_one.html`  
**Maximum Single-File Console:** `/taxonomy/buzzard_intelligence_os_maximum_single_file.html`  
**Master Business OS Maximum Single-File Console:** `/taxonomy/buzzard_master_business_os_maximum_single_file.html`  
**Master Business OS Final 100% Single-File Console:** `/taxonomy/buzzard_master_business_os_final_100_single_file.html`  
**All-in-One JSON:** `/taxonomy/buzzard_intelligence_os_all_in_one.json`  
**Maximum Manifest:** `/taxonomy/buzzard_intelligence_os_maximum_manifest.json`  
**Master Business OS Manifest:** `/taxonomy/buzzard_master_business_os_maximum_manifest.json`
