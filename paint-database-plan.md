# Paint Database MVP - Build Plan

## Objective
Build an initial paint database covering Citadel, Vallejo, and Army Painter ranges to compete with PaintRack's 25,000 paint database.

## Required Data Fields (MVP)
- Paint name
- Brand
- Product code/SKU
- Product line (e.g., "Model Color", "Base", "Warpaints")
- Paint type (base, layer, wash, contrast, metallic, technical, etc.)
- Hex color code
- RGB values

---

## Recommended Approach: Open Data Foundation + Enrichment

### Step 1: Use Existing MIT-Licensed Dataset as Foundation

**Primary Source**: [Arcturus5404/miniature-paints](https://github.com/Arcturus5404/miniature-paints)
- License: MIT (free to use)
- Format: Markdown tables with Name, Product Line, RGB, Hex
- Coverage includes all 3 target brands:
  - **Citadel Colour**: Base, Layer, Shade, Contrast, Technical, Air, Foundation
  - **Vallejo**: Model Air, Game Color, Model Color, Xpress Color, Metal Color, Mecha Color, Surface Primer (142KB of data)
  - **Army Painter**: Full Warpaints range

**Actions**:
1. Clone repository
2. Write parser to convert markdown tables to JSON/database format
3. Normalize field names across brands

### Step 2: Data Normalization & Enrichment

The raw data needs transformation:

| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| Name | `name` | Clean whitespace, standardize casing |
| Set/Product Line | `product_line` | Map to canonical names |
| Set/Product Line | `paint_type` | Extract type from set name (e.g., "Layer" → `layer`) |
| R, G, B | `rgb` | Convert to `{r, g, b}` object |
| Hex | `hex` | Validate format, ensure `#` prefix |
| Product Code | `sku` | Parse from name where embedded (e.g., "71.281") |

**Paint Type Mapping**:
```
Citadel: Base, Layer, Shade, Contrast, Technical, Air, Dry, Spray
Vallejo: Model Color, Game Color, Model Air, Xpress, Metal, Mecha
Army Painter: Warpaints, Speedpaint, Washes, Metallics
```

### Step 3: Gap Analysis & Supplementary Scraping

After parsing the open dataset, identify gaps:

1. **Missing product codes**: Some entries lack SKUs
   - Scrape from manufacturer product pages
   - Citadel: Parse from Games Workshop product URLs
   - Vallejo: Extract embedded codes (format: XX.XXX)
   - Army Painter: Scrape from official site

2. **Validate hex accuracy**: Cross-reference sample colors with:
   - [Encycolorpedia Vallejo](https://encycolorpedia.com/paints/vallejo)
   - Official Vallejo PDFs: [acrylicosvallejo.com/en/downloads](https://acrylicosvallejo.com/en/downloads/)

3. **New/missing paints**: Check for recent releases not in dataset
   - Monitor manufacturer new release pages
   - Community submissions

### Step 4: Database Schema

```sql
CREATE TABLE paints (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,  -- 'citadel', 'vallejo', 'army_painter'
    product_line VARCHAR(100),     -- 'Model Color', 'Base', 'Warpaints'
    paint_type VARCHAR(50),        -- 'base', 'layer', 'wash', 'contrast', etc.
    sku VARCHAR(50),               -- Product code
    hex_color CHAR(7),             -- '#RRGGBB'
    rgb_r SMALLINT,
    rgb_g SMALLINT,
    rgb_b SMALLINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_paints_brand ON paints(brand);
CREATE INDEX idx_paints_hex ON paints(hex_color);
```

---

## Estimated Paint Coverage

Based on source repository:
| Brand | Estimated Paints | Notes |
|-------|------------------|-------|
| Citadel | ~350-400 | All current ranges |
| Vallejo | ~800+ | Model Color, Game Color, Air, Xpress, etc. |
| Army Painter | ~200+ | Warpaints, Speedpaints |
| **MVP Total** | **~1,400+** | From open source data alone |

---

## Implementation Steps

1. **Clone & Parse** (Day 1)
   - Clone Arcturus5404/miniature-paints
   - Write markdown parser script (Python recommended)
   - Output to JSON

2. **Normalize & Transform** (Day 1-2)
   - Map product lines to paint types
   - Extract SKUs from names
   - Validate hex codes

3. **Import to Database** (Day 2)
   - Create schema
   - Bulk import normalized data
   - Add unique constraints

4. **Gap-Fill Scraping** (Day 3+)
   - Build scrapers for missing SKUs
   - Prioritize by brand importance
   - Respect rate limits & robots.txt

5. **Validation & QA** (Ongoing)
   - Spot-check color accuracy
   - Cross-reference with physical paints if available
   - Community feedback loop

---

## Legal Considerations

- **MIT-licensed data**: Primary dataset is explicitly open source
- **Scraping for enrichment**: Use public product pages only, respect robots.txt
- **Color data**: Factual information (RGB values, product codes) generally not copyrightable
- **Avoid**: Copying marketing descriptions, product images, or copyrighted content

---

## Alternative/Supplementary Sources

If gaps remain:
- [redgrimm/paint-conversion](https://github.com/redgrimm/paint-conversion) - Color matching data
- [DakkaDakka Wiki](https://www.dakkadakka.com/wiki/en/paint_range_compatibility_chart) - Community conversions
- [Vallejo Google Spreadsheet](https://docs.google.com/spreadsheets/d/1uvemxtbv9xpyiT9Ps3lWZDFW4Cr-P-UenqP4tKv_050/htmlview) - Community compilation
