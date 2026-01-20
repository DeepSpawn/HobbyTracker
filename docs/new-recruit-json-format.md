# New Recruit JSON Export Format Documentation

This document describes the JSON format exported by [New Recruit](https://newrecruit.eu/), a browser-based army list builder for tabletop wargames. This documentation supports the army list import feature (HOB-36, HOB-37).

## Overview

New Recruit exports army lists using a JSON representation of the BattleScribe roster schema. The same format is used for:
- **JSON export** (`.json`) - Native JSON format
- **BattleScribe roster** (`.ros`) - XML format with identical structure
- **Compressed roster** (`.rosz`) - ZIP-compressed `.ros` file

## Supported Game Systems

- Age of Sigmar 4.0
- Warhammer 40,000 (10th Edition)
- Warhammer: The Old World
- Horus Heresy
- Kill Team
- And others

## Root Structure

```typescript
interface NewRecruitExport {
  roster: Roster;
}

interface Roster {
  // Metadata
  id: string;                    // Unique roster ID (e.g., "gdgjrji")
  name: string;                  // Army list name (e.g., "2k KB")
  battleScribeVersion: string;   // BattleScribe schema version (e.g., "2.03")
  generatedBy: string;           // Always "https://newrecruit.eu"
  gameSystemId: string;          // Game system UUID
  gameSystemName: string;        // Human-readable (e.g., "Age of Sigmar 4.0")
  gameSystemRevision: string;    // Data version number
  xmlns: string;                 // XML namespace (for XML compatibility)

  // Points
  costs: Cost[];                 // Total army costs (points)
  costLimits: CostLimit[];       // Point limits (if any)

  // Army composition
  forces: Force[];               // Array of forces (usually 1)
}
```

## Cost Structure

Total points are found in `roster.costs`:

```typescript
interface Cost {
  name: string;      // Cost type name (e.g., "pts")
  typeId: string;    // Cost type ID (e.g., "points")
  value: number;     // Numeric value (e.g., 1930)
}
```

**Example:**
```json
{
  "costs": [
    { "name": "pts", "typeId": "points", "value": 1930 }
  ]
}
```

## Force Structure

Each `force` represents a detachment or army organization:

```typescript
interface Force {
  id: string;
  name: string;              // Rules version (e.g., "General's Handbook 2025-26")
  entryId: string;
  catalogueId: string;
  catalogueRevision: string;
  catalogueName: string;     // FACTION NAME (e.g., "Kruleboyz")

  selections: Selection[];   // Top-level selections (traits, terrain, etc.)
  forces: Force[];           // Nested forces (REGIMENTS with actual units)
  categories: Category[];
  costs: Cost[];
}
```

**Key insight:** The faction name is in `force.catalogueName`, not in a dedicated field.

## Selection Structure (Units)

Units and other selections share the same structure:

```typescript
interface Selection {
  id: string;                    // Unique selection ID
  name: string;                  // Unit/selection name
  entryId: string;               // Reference to data entry
  entryGroupId?: string;         // Parent group (for grouped selections)
  number: number;                // Quantity (usually 1 for units)
  type: SelectionType;           // "unit" | "upgrade" | "model"
  from: string;                  // Source ("entry" | "group")
  group?: string;                // Group name if from a group

  // Nested data
  selections?: Selection[];      // Nested selections (models, weapons, upgrades)
  profiles?: Profile[];          // Unit stats, abilities, weapons
  rules?: Rule[];                // Special rules
  categories?: Category[];       // Keywords (HERO, INFANTRY, etc.)
  costs?: Cost[];                // Points cost for this selection
}

type SelectionType = 'unit' | 'upgrade' | 'model';
```

## Identifying Actual Units

Not all selections are units to import. Filter by:

1. **`type === 'unit'`** - Only selections with type "unit"
2. **`costs` array contains points** - Has a cost entry with `typeId: "points"`
3. **Exclude non-model selections** - Filter out terrain, battle traits, etc.

**Location of units:**
- **Top-level:** `roster.forces[0].selections[]` - Contains battle traits, terrain (may include Faction Terrain units)
- **Regiments:** `roster.forces[0].forces[].selections[]` - Contains actual army units

## Categories (Unit Keywords)

Categories provide unit classification:

```typescript
interface Category {
  id: string;
  entryId: string;
  name: string;           // Keyword (e.g., "HERO", "INFANTRY", "MONSTER")
  primary: boolean;       // Primary category for this unit
}
```

**Common categories:**
- `HERO` - Hero/character units
- `INFANTRY` - Infantry units
- `MONSTER` - Monster units
- `CAVALRY` - Mounted units
- `WAR MACHINE` - War machines/artillery
- `FACTION TERRAIN` - Faction-specific terrain
- Faction keywords (e.g., `KRULEBOYZ`, `DESTRUCTION`)

## Example: Extracting Units

```typescript
function extractUnits(data: NewRecruitExport): ImportUnit[] {
  const units: ImportUnit[] = [];
  const roster = data.roster;
  const force = roster.forces[0];

  // Process regiments (nested forces)
  for (const regiment of force.forces || []) {
    for (const selection of regiment.selections || []) {
      if (selection.type === 'unit') {
        const points = selection.costs?.find(c => c.typeId === 'points')?.value ?? 0;
        units.push({
          name: selection.name,
          quantity: selection.number,
          pointsCost: points,
          categories: selection.categories?.map(c => c.name) ?? []
        });
      }
    }
  }

  // Process top-level units (e.g., faction terrain)
  for (const selection of force.selections || []) {
    if (selection.type === 'unit') {
      const points = selection.costs?.find(c => c.typeId === 'points')?.value ?? 0;
      units.push({
        name: selection.name,
        quantity: selection.number,
        pointsCost: points,
        categories: selection.categories?.map(c => c.name) ?? []
      });
    }
  }

  return units;
}
```

## Mapping to HobbyTrackerApp Data Model

### Project Mapping

| New Recruit Field | Project Field | Notes |
|-------------------|---------------|-------|
| `roster.name` | `name` | Direct mapping |
| `roster.forces[0].catalogueName` | `faction` | Faction/army name |
| `roster.gameSystemName` | `gameSystem` | e.g., "Age of Sigmar 4.0" |
| `roster.costs[0].value` | `targetPoints` | Total points |

### ProjectUnit Mapping

| New Recruit Field | ProjectUnit Field | Notes |
|-------------------|-------------------|-------|
| `selection.name` | `name` | Unit name |
| `selection.number` | `quantity` | Usually 1 |
| `selection.costs[?].value` | `pointsCost` | Where typeId="points" |
| N/A | `status` | Default to `'to_buy'` |
| N/A | `recipeId` | Default to `null` |

## Edge Cases and Special Handling

### 1. Multi-Model Units

Units like "Gutrippaz" contain multiple models but `selection.number` is still 1. The actual model count is tracked in nested `selections` with `type: 'model'`.

**Recommendation:** Use `selection.number` as-is (represents unit count, not model count).

### 2. Reinforced Units

Reinforced units (doubled size) have "Reinforced" in their nested selections but the points already reflect the reinforced cost.

**Example from sample:**
```
Gutrippaz (unit) - 320 pts
  └── Reinforced (upgrade)
```

### 3. Command Models

Units may have Champion, Musician, Standard Bearer as nested upgrades. These don't affect points (already included).

### 4. Faction Terrain

Faction terrain appears at `forces[0].selections[]` level with `type: 'unit'` and category `FACTION TERRAIN`. Include these as they have points costs.

### 5. Battle Traits and Formations

Non-unit selections like "Battle Traits: Kruleboyz" have `type: 'upgrade'` and 0 points. **Filter these out** by checking `type === 'unit'`.

### 6. Spell Lores and Manifestations

These are `type: 'upgrade'` with 0 points. **Filter out.**

### 7. Duplicate Unit Names

The same unit can appear multiple times (e.g., 2x "Man-skewer Boltboyz"). Each is a separate selection with its own points. Import as separate units or aggregate if preferred.

## Sample Data Summary

From `examples/2k KB.json` (Age of Sigmar Kruleboyz army):

| Unit Name | Points | Type |
|-----------|--------|------|
| Skaregob Totem | 20 | Faction Terrain |
| Breaka-boss on Mirebrute Troggoth | 200 | Hero/Monster |
| Kruleboyz Monsta-killaz | 120 | Infantry |
| Snatchaboss on Sludgeraker Beast | 200 | Hero/Monster |
| Murknob with Belcha-banna | 90 | Hero |
| Gutrippaz | 320 | Infantry (Reinforced) |
| Beast-skewer Killbow | 140 | War Machine |
| Swampcalla Shaman with Pot-grot | 120 | Hero |
| Gutrippaz | 320 | Infantry (Reinforced) |
| Man-skewer Boltboyz | 200 | Infantry (Reinforced) |
| Man-skewer Boltboyz | 200 | Infantry (Reinforced) |

**Total: 1930 points**

## BattleScribe Format (.ros/.rosz)

The `.ros` file is XML with the same structure. The `.rosz` is a ZIP-compressed `.ros`.

## Parser Implementation

A parser service is available at `src/services/armyListParser/` that handles all supported formats:

```typescript
import { parseArmyListFile } from '@/services/armyListParser';

// Parse any supported file (.rosz, .ros, .json)
const result = await parseArmyListFile(file);

// Result structure:
interface NewRecruitParseResult {
  listName: string;      // "2k KB"
  faction: string;       // "Kruleboyz"
  gameSystem: string;    // "Age of Sigmar 4.0"
  totalPoints: number;   // 1930
  units: NewRecruitImportUnit[];
  generatedBy: string;
  dataVersion: string;
}
```

**Dependencies:**
- `jszip` - ZIP decompression for .rosz files
- `fast-xml-parser` - XML parsing for .ros files

## References

- [New Recruit](https://newrecruit.eu/) - Official app
- [BattleScribe Roster Schema](http://www.battlescribe.net/schema/rosterSchema) - XML schema reference
- Sample files: `examples/2k KB.json`, `examples/2k KB.ros`
