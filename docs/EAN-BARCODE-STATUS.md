# EAN-13 Barcode Data Status

Last updated: 2026-01-22

## Current Coverage

| Brand | Paints | With EAN | Coverage |
|-------|--------|----------|----------|
| **Vallejo** | 1,268 | 1,268 | **100%** |
| **Citadel** | 452 | 97 | **21.5%** |
| **Army Painter** | 704 | 0 | 0% |
| **Total** | 2,424 | 1,365 | **56.3%** |

## How EANs Were Obtained

### Vallejo (100% coverage)
Vallejo EANs follow a **predictable formula** based on their SKU:
```
EAN = 8429551 + SKU_without_dot + check_digit
Example: SKU 70.913 → EAN 8429551709132
```
Script: `npm run ean:generate:vallejo`

### Citadel (21.5% coverage)
Citadel EANs were discovered via **EAN-DB API enumeration**:
- Paint EANs are densely packed in range `5011921026xxx - 5011921028xxx`
- Used ~143 API calls to find 96 paint EANs
- 404 responses are free (don't count against balance)

Scripts:
- `npm run ean:lookup:eandb` - Direct EAN lookup
- `npm run ean:enumerate:citadel` - Range enumeration

### Army Painter (0% coverage)
Not yet attempted. Could try:
1. EAN-DB enumeration (find the EAN prefix/range)
2. Similar SKU-to-EAN formula if one exists

## EAN-DB API Status

- **Account**: Confirmed and active
- **Balance remaining**: ~107 calls
- **JWT Token**: Embedded in scripts (expires ~2027)
- **Key insight**: 404s are FREE - enables aggressive enumeration

## Available npm Scripts

| Script | Purpose |
|--------|---------|
| `ean:generate:vallejo` | Generate Vallejo EANs from SKUs (no API needed) |
| `ean:lookup:eandb` | Look up specific EANs via EAN-DB API |
| `ean:enumerate:citadel` | Enumerate Citadel EAN ranges |
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

### Option 2: Army Painter via EAN-DB
1. Find known Army Painter EANs (search online)
2. Identify their EAN prefix pattern
3. Enumerate the range

### Option 3: Top Up EAN-DB Balance
Purchase more API calls (~€0.005/barcode) at https://ean-db.com/

### Option 4: Research Army Painter SKU→EAN Formula
If Army Painter uses predictable EANs like Vallejo, we could generate them algorithmically.

## Code Architecture

```
src/
├── types/paint.ts          # Paint interface with ean field
├── data/paints.json        # 2,424 paints with 1,365 EANs
├── services/paint/
│   └── paintLookupByEan.ts # Firestore EAN query
└── components/paints/
    └── PaintDetailModal.tsx # EAN display with copy button

scripts/ean/
├── generate-vallejo-eans.ts  # Algorithmic EAN generation
├── lookup-ean-db.ts          # EAN-DB API client
├── enumerate-citadel-eans.ts # Range enumeration
├── match-ean-to-paints.ts    # Fuzzy matching algorithm
└── merge-ean-data.ts         # Merge into paints.json
```

## Firestore Deployment

To update Firestore with the new EAN data:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./path-to-service-account.json"
npm run import-paints
```

## Key Learnings

1. **Vallejo**: SKU directly maps to EAN - no external data needed
2. **Citadel**: No predictable formula, but EANs cluster in specific ranges
3. **EAN-DB**: Excellent for enumeration since 404s are free
4. **UPCitemdb**: Too rate-limited (40/day) for practical use
5. **Amazon**: Blocks scraping with CAPTCHAs
