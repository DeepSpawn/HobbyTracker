# EAN-13 Barcode Data Status

Last updated: 2026-01-27

## Current Coverage

| Brand | Paints | With EAN | Coverage |
|-------|--------|----------|----------|
| **Vallejo** | 1,268 | 1,268 | **100%** |
| **Army Painter** | 704 | 599 | **85.1%** |
| **Citadel** | 487 | 336 | **69.0%** |
| **Monument Hobbies** | 131 | 75 | **57.3%** |
| **Total** | 2,590 | 2,278 | **88.0%** |

### Citadel Coverage by Product Line

| Product Line | Coverage | Notes |
|--------------|----------|-------|
| Contrast | 98.4% (60/61) | Nearly complete |
| Layer | 92.5% (86/93) | Great coverage |
| Dry | 90.3% (28/31) | Great coverage |
| Base | 84.5% (49/58) | Good coverage |
| Technical | 80.8% (21/26) | Good coverage |
| Shade | 79.2% (19/24) | Good coverage |
| Air | 79.5% (62/78) | Good coverage |
| Spray | 50.0% (6/12) | Partial |
| Glaze | 100% (4/4) | Complete |
| Foundation (discontinued) | 1.1% (1/91) | Not actively sold |

## How EANs Were Obtained

### Citadel (69.0% coverage) - GW Retailer Data

**Primary source**: Official Games Workshop retailer spreadsheet (April 2025)
- Contains 322 official EANs for current paint lines
- Imported via `npm run ean:import:gw-retailer`

**Secondary source**: EAN-DB API enumeration
- Paint EANs are densely packed in range `5011921026xxx - 5011921028xxx`
- ~143 API calls found 96 paint EANs

Scripts:
- `npm run ean:import:gw-retailer` - Import from GW retailer spreadsheet
- `npm run ean:enumerate:citadel` - Range enumeration via EAN-DB

### Vallejo (100% coverage)
Vallejo EANs follow a **predictable formula** based on their SKU:
```
EAN = 8429551 + SKU_without_dot + check_digit
Example: SKU 70.913 → EAN 8429551709132
```
Script: `npm run ean:generate:vallejo`

### Army Painter (85.1% coverage)
Army Painter EANs follow a **predictable formula** based on their SKU:
```
EAN = 5713799 + SKU_number + type_digit + check_digit
```
- **5713799** = Company prefix (Danish GS1 code 57)
- **Type digit**: varies by product line (0, 1, 2, 8)

Examples:
- SKU WP1129 → EAN 5713799112902 (Shining Silver)
- SKU WP3001 → EAN 5713799300128 (Warpaints Fanatic)
- SKU CP3001 → EAN 5713799300118 (Matt Black Primer)

Script: `npm run ean:generate:army-painter`

### Monument Hobbies (57.3% coverage)
Monument Hobbies is a US company using **UPC-A (12-digit)** barcodes:
```
UPC = 62850441 + 1 + [2-digit code] + check_digit
```

Examples:
- SKU 030 (Dark Silver) → UPC 628504411308
- SKU 033 (Metallic Medium) → UPC 628504411339

Script: `npm run ean:generate:monument-hobbies`

**Limitation**: Only works for numeric SKUs (001-075). Special series use unknown patterns.

## Available npm Scripts

| Script | Purpose |
|--------|---------|
| `ean:import:gw-retailer` | **Import Citadel EANs from GW retailer spreadsheet** |
| `ean:generate:vallejo` | Generate Vallejo EANs from SKUs (no API needed) |
| `ean:generate:army-painter` | Generate Army Painter EANs from SKUs (no API needed) |
| `ean:generate:monument-hobbies` | Generate Monument Hobbies UPCs (no API needed) |
| `ean:lookup:eandb` | Look up specific EANs via EAN-DB API |
| `ean:enumerate:citadel` | Enumerate Citadel EAN ranges |
| `ean:rematch:citadel` | Re-match cached Citadel EANs to current paint IDs |
| `ean:match` | Match scraped EANs to paint database |
| `ean:merge` | Merge all EAN mappings into paints.json |

## Data Files

| File | Purpose |
|------|---------|
| `src/data/paints.json` | Main paint database with EANs |
| `data/ean-scrape/gw-retailer-*.json` | GW retailer import results |
| `data/ean-scrape/*-ean-mapping-*.json` | Direct paintId → EAN mappings |
| `data/ean-scrape/eandb-*.json` | Raw EAN-DB API results |
| `data/backups/` | Automatic backups before merges |

## Gaps and Future Work

### Citadel Gaps
- **Spray paints** (50%): Only 6/12 have EANs
- **Foundation (discontinued)**: 1/91 - not a priority since these paints aren't sold anymore

### Monument Hobbies Gaps (57.3%)
The following use unknown UPC patterns:
- Signature Series (S01-S42): 36 paints
- Fluorescent (F01-F06): 6 paints
- PRIME primers (002P-011P): 5 paints
- Washes (200-202): 3 paints

### Army Painter Gaps (85.1%)
105 paints still lack EANs, mostly in newer lines without SKU data.

## Code Architecture

```
src/
├── types/paint.ts          # Paint interface with ean field
├── data/paints.json        # 2,590 paints with 2,278 EANs/UPCs
├── services/paint/
│   └── paintLookupByEan.ts # Firestore EAN query
└── components/paints/
    └── PaintDetailModal.tsx # EAN display with copy button

scripts/ean/
├── import-gw-retailer-barcodes.ts  # GW retailer spreadsheet import (Citadel)
├── generate-vallejo-eans.ts        # Algorithmic EAN generation (Vallejo)
├── generate-army-painter-eans.ts   # Algorithmic EAN generation (Army Painter)
├── generate-monument-hobbies-upcs.ts # Algorithmic UPC generation (Monument)
├── enumerate-citadel-eans.ts       # Range enumeration via EAN-DB
├── match-ean-to-paints.ts          # Fuzzy matching algorithm
└── merge-ean-data.ts               # Merge into paints.json
```

## Firestore Deployment

To update Firestore with the new EAN data:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./path-to-service-account.json"
npm run import-paints
```

## Key Learnings

1. **GW Retailer Data**: Official spreadsheet provides definitive Citadel EANs
2. **Vallejo/Army Painter**: SKU directly maps to EAN-13 - no external data needed
3. **Monument Hobbies**: SKU maps to UPC-A (12-digit) - US company uses different format
4. **Citadel**: No predictable formula, but official retailer data available
5. **EAN-DB**: Useful for enumeration since 404s are free
