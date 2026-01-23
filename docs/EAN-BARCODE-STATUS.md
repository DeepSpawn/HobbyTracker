# EAN-13 Barcode Data Status

Last updated: 2026-01-22

## Current Coverage

| Brand | Paints | With EAN | Coverage |
|-------|--------|----------|----------|
| **Vallejo** | 1,268 | 1,268 | **100%** |
| **Monument Hobbies** | 131 | 75 | **57.3%** |
| **Army Painter** | 704 | 250 | **35.5%** |
| **Citadel** | 452 | 146 | **32.3%** |
| **Total** | 2,555 | 1,739 | **68.1%** |

## How EANs Were Obtained

### Vallejo (100% coverage)
Vallejo EANs follow a **predictable formula** based on their SKU:
```
EAN = 8429551 + SKU_without_dot + check_digit
Example: SKU 70.913 → EAN 8429551709132
```
Script: `npm run ean:generate:vallejo`

### Citadel (32.3% coverage)
Citadel EANs were discovered via **EAN-DB API enumeration**:
- Paint EANs are densely packed in range `5011921026xxx - 5011921028xxx`
- Used ~143 API calls to find 96 paint EANs
- 404 responses are free (don't count against balance)

Scripts:
- `npm run ean:lookup:eandb` - Direct EAN lookup
- `npm run ean:enumerate:citadel` - Range enumeration

### Army Painter (35.5% coverage)
Army Painter EANs follow a **predictable formula** based on their SKU:
```
EAN = 5713799 + SKU_number + type_digit + check_digit
```
- **5713799** = Company prefix (Danish GS1 code 57)
- **Type digit**: `0` for WP (Warpaints), `1` for CP (Colour Primer)

Examples:
- SKU WP1129 → EAN 5713799112902 (Shining Silver)
- SKU CP3001 → EAN 5713799300118 (Matt Black Primer)

Script: `npm run ean:generate:army-painter`

**Limitation**: Only 151/704 paints have WP/CP SKUs. Newer lines (Warpaints Fanatic, Speedpaint 2.0, Air) lack SKUs in the database and require manual lookup or enumeration.

### Monument Hobbies (57.3% coverage)
Monument Hobbies is a US company using **UPC-A (12-digit)** barcodes:
```
UPC = 62850441 + 1 + [2-digit code] + check_digit
```
- **62850441** = Company prefix (8 digits)
- **1** = Product line identifier
- **2-digit code** = From SKU (030 → 30, 033 → 33)

Examples:
- SKU 030 (Dark Silver) → UPC 628504411308
- SKU 033 (Metallic Medium) → UPC 628504411339

Script: `npm run ean:generate:monument-hobbies`

**Limitation**: Only works for numeric SKUs (001-075). The following use unknown patterns:
- Signature Series (S01-S42): 36 paints
- Fluorescent (F01-F06): 6 paints
- PRIME primers (002P-011P): 5 paints
- Washes (200-202): 3 paints

## EAN-DB API Status

- **Account**: Confirmed and active
- **Balance remaining**: ~107 calls
- **JWT Token**: Embedded in scripts (expires ~2027)
- **Key insight**: 404s are FREE - enables aggressive enumeration

## Available npm Scripts

| Script | Purpose |
|--------|---------|
| `ean:generate:vallejo` | Generate Vallejo EANs from SKUs (no API needed) |
| `ean:generate:army-painter` | Generate Army Painter EANs from WP/CP SKUs (no API needed) |
| `ean:generate:monument-hobbies` | Generate Monument Hobbies UPCs from numeric SKUs (no API needed) |
| `ean:lookup:eandb` | Look up specific EANs via EAN-DB API |
| `ean:enumerate:citadel` | Enumerate Citadel EAN ranges |
| `ean:rematch:citadel` | Re-match cached Citadel EANs to current paint IDs |
| `ean:scrape` | UPCitemdb individual search (slow, 40/day limit) |
| `ean:scrape:bulk` | UPCitemdb brand page scraper |
| `ean:enrich` | Enrich bulk results with product names |
| `ean:match` | Match scraped EANs to paint database |
| `ean:merge` | Merge all EAN mappings into paints.json |

## Data Files

| File | Purpose |
|------|---------|
| `src/data/paints.json` | Main paint database with EANs |
| `data/ean-scrape/*-ean-mapping-*.json` | Direct paintId → EAN mappings |
| `data/ean-scrape/eandb-*.json` | Raw EAN-DB API results |
| `data/ean-mappings.json` | Structured mappings with confidence |
| `data/backups/` | Automatic backups before merges |

## Next Steps to Improve Coverage

### Option 1: Continue Citadel Enumeration
With 107 API calls remaining, enumerate more ranges:
```bash
# Try Air paints, Contrast, Technical ranges
npm run ean:enumerate:citadel -- --start=02900 --end=03100
npm run ean:enumerate:citadel -- --start=02500 --end=02600
```

### Option 2: Army Painter - Add SKUs for Newer Lines
The formula is known (`5713799 + SKU + type + check`) but 553 Army Painter paints lack SKUs:
- Warpaints Fanatic (180 paints, 0 SKUs)
- Speedpaint 2.0 (90 paints, 0 SKUs)
- Warpaints Air (126 paints, 0 SKUs)

To increase coverage: research official SKUs for these product lines and add them to paints.json.

### Option 3: Top Up EAN-DB Balance
Purchase more API calls (~€0.005/barcode) at https://ean-db.com/

## Code Architecture

```
src/
├── types/paint.ts          # Paint interface with ean field
├── data/paints.json        # 2,555 paints with 1,739 EANs/UPCs
├── services/paint/
│   └── paintLookupByEan.ts # Firestore EAN query
└── components/paints/
    └── PaintDetailModal.tsx # EAN display with copy button

scripts/
├── parse-paints.ts                    # Parse markdown → paints.json (deterministic IDs)
└── ean/
    ├── generate-vallejo-eans.ts       # Algorithmic EAN generation (Vallejo)
    ├── generate-army-painter-eans.ts  # Algorithmic EAN generation (Army Painter)
    ├── generate-monument-hobbies-upcs.ts # Algorithmic UPC generation (Monument)
    ├── lookup-ean-db.ts               # EAN-DB API client
    ├── enumerate-citadel-eans.ts      # Range enumeration
    ├── rematch-citadel-eans.ts        # Re-match cached EANs to current IDs
    ├── match-ean-to-paints.ts         # Fuzzy matching algorithm
    └── merge-ean-data.ts              # Merge into paints.json (supports EAN-13 & UPC-A)
```

## Firestore Deployment

To update Firestore with the new EAN data:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./path-to-service-account.json"
npm run import-paints
```

## Key Learnings

1. **Vallejo**: SKU directly maps to EAN-13 - no external data needed
2. **Army Painter**: SKU directly maps to EAN-13 (similar to Vallejo) - limited by SKU availability
3. **Monument Hobbies**: SKU maps to UPC-A (12-digit) - US company uses different format
4. **Citadel**: No predictable formula, but EANs cluster in specific ranges
5. **EAN-DB**: Excellent for enumeration since 404s are free
6. **UPCitemdb**: Too rate-limited (40/day) for practical use
7. **Amazon**: Blocks scraping with CAPTCHAs
