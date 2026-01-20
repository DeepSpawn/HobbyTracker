/**
 * TypeScript interfaces for New Recruit JSON export format.
 *
 * New Recruit (https://newrecruit.eu/) exports army lists using a JSON
 * representation of the BattleScribe roster schema.
 *
 * @see docs/new-recruit-json-format.md for full documentation
 */

// ============================================================================
// Root Types
// ============================================================================

/**
 * Root structure of a New Recruit JSON export
 */
export interface NewRecruitExport {
  roster: NewRecruitRoster;
}

/**
 * The roster containing all army list data
 */
export interface NewRecruitRoster {
  // Identifiers
  id: string;
  name: string;

  // Version info
  battleScribeVersion: string;
  generatedBy: string;  // Always "https://newrecruit.eu"

  // Game system
  gameSystemId: string;
  gameSystemName: string;  // e.g., "Age of Sigmar 4.0", "Warhammer 40,000"
  gameSystemRevision: string;

  // XML namespace (for compatibility)
  xmlns?: string;

  // Points
  costs: NewRecruitCost[];
  costLimits: NewRecruitCostLimit[];

  // Army composition
  forces: NewRecruitForce[];
}

// ============================================================================
// Cost Types
// ============================================================================

/**
 * Represents a cost value (typically points)
 */
export interface NewRecruitCost {
  name: string;     // Cost type name (e.g., "pts")
  typeId: string;   // Cost type ID (e.g., "points")
  value: number;    // Numeric value
}

/**
 * Represents a cost limit
 */
export interface NewRecruitCostLimit {
  name: string;
  typeId: string;
  value: number;
}

// ============================================================================
// Force Types
// ============================================================================

/**
 * A force (detachment/army organization)
 */
export interface NewRecruitForce {
  id: string;
  name: string;              // Rules version (e.g., "General's Handbook 2025-26")
  entryId: string;
  catalogueId: string;
  catalogueRevision: string;
  catalogueName: string;     // FACTION NAME (e.g., "Kruleboyz", "Space Marines")

  selections: NewRecruitSelection[];   // Top-level selections
  forces?: NewRecruitForce[];          // Nested forces (regiments)
  categories: NewRecruitCategory[];
  costs?: NewRecruitCost[];
}

// ============================================================================
// Selection Types (Units, Upgrades, Models)
// ============================================================================

/**
 * Type of selection
 */
export type NewRecruitSelectionType = 'unit' | 'upgrade' | 'model';

/**
 * A selection (unit, upgrade, or model)
 */
export interface NewRecruitSelection {
  id: string;
  name: string;
  entryId: string;
  entryGroupId?: string;
  number: number;                       // Quantity (usually 1 for units)
  type: NewRecruitSelectionType;
  from: 'entry' | 'group';
  group?: string;

  // Nested data
  selections?: NewRecruitSelection[];   // Nested selections (models, weapons)
  profiles?: NewRecruitProfile[];       // Unit stats, abilities
  rules?: NewRecruitRule[];             // Special rules
  categories?: NewRecruitCategory[];    // Keywords
  costs?: NewRecruitCost[];             // Points cost
}

// ============================================================================
// Category Types
// ============================================================================

/**
 * A category (keyword) for a selection
 */
export interface NewRecruitCategory {
  id: string;
  entryId: string;
  name: string;       // Keyword (e.g., "HERO", "INFANTRY")
  primary: boolean;   // Primary category for this unit
}

// ============================================================================
// Profile Types
// ============================================================================

/**
 * A profile (stats, abilities, weapons)
 */
export interface NewRecruitProfile {
  id: string;
  name: string;
  hidden: boolean;
  typeId: string;
  typeName: string;   // e.g., "Unit", "Melee Weapon", "Ability (Passive)"
  from: string;

  characteristics?: NewRecruitCharacteristic[];
  attributes?: NewRecruitAttribute[];
}

/**
 * A characteristic value (stat)
 */
export interface NewRecruitCharacteristic {
  name: string;       // e.g., "Move", "Health", "Save"
  typeId: string;
  $text?: string;     // Value as text
}

/**
 * An attribute on a profile
 */
export interface NewRecruitAttribute {
  name: string;
  typeId: string;
  $text?: string;
}

// ============================================================================
// Rule Types
// ============================================================================

/**
 * A special rule
 */
export interface NewRecruitRule {
  id: string;
  name: string;
  hidden: boolean;
  description?: string;
}

// ============================================================================
// Import Helper Types
// ============================================================================

/**
 * Simplified unit data extracted for import
 */
export interface NewRecruitImportUnit {
  name: string;
  quantity: number;
  pointsCost: number;
  categories: string[];
}

/**
 * Result of parsing a New Recruit export for import
 */
export interface NewRecruitParseResult {
  // Project metadata
  listName: string;
  faction: string;
  gameSystem: string;
  totalPoints: number;

  // Units to import
  units: NewRecruitImportUnit[];

  // Metadata
  generatedBy: string;
  dataVersion: string;
}

// ============================================================================
// Utility Functions (Type Guards)
// ============================================================================

/**
 * Check if a selection is a unit (vs upgrade or model)
 */
export function isUnit(selection: NewRecruitSelection): boolean {
  return selection.type === 'unit';
}

/**
 * Get points cost from a selection's costs array
 */
export function getPointsCost(selection: NewRecruitSelection): number {
  const pointsCost = selection.costs?.find(c => c.typeId === 'points');
  return pointsCost?.value ?? 0;
}

/**
 * Check if a selection has a specific category
 */
export function hasCategory(selection: NewRecruitSelection, categoryName: string): boolean {
  return selection.categories?.some(c => c.name === categoryName) ?? false;
}
