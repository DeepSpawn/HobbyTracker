/**
 * BattleScribe/New Recruit Army List Parser
 *
 * Parses army list files from:
 * - BattleScribe .rosz (compressed) and .ros (XML) files
 * - New Recruit .json exports
 *
 * All formats use the same underlying schema (BattleScribe roster format).
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type {
  NewRecruitExport,
  NewRecruitRoster,
  NewRecruitForce,
  NewRecruitSelection,
  NewRecruitCost,
  NewRecruitCategory,
  NewRecruitParseResult,
  NewRecruitImportUnit,
} from '../../types/newRecruit';

// ============================================================================
// XML Parser Configuration
// ============================================================================

/**
 * Configure XML parser to handle BattleScribe roster format.
 * The XML uses attributes extensively, so we need to preserve them.
 */
const xmlParserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '$text',
  // Handle arrays properly - these elements can appear multiple times
  isArray: (name: string) => {
    const arrayElements = [
      'cost',
      'costLimit',
      'force',
      'selection',
      'category',
      'profile',
      'characteristic',
      'attribute',
      'rule',
    ];
    return arrayElements.includes(name);
  },
};

const xmlParser = new XMLParser(xmlParserOptions);

// ============================================================================
// Main Parser Functions
// ============================================================================

/**
 * Parse a BattleScribe .rosz file (ZIP compressed)
 */
export async function parseRoszFile(file: File | Blob): Promise<NewRecruitParseResult> {
  const zip = await JSZip.loadAsync(file);

  // Find the .ros file inside the ZIP
  const rosFileName = Object.keys(zip.files).find((name) => name.endsWith('.ros'));
  if (!rosFileName) {
    throw new Error('No .ros file found in the .rosz archive');
  }

  const rosContent = await zip.files[rosFileName].async('string');
  return parseRosXml(rosContent);
}

/**
 * Parse a BattleScribe .ros file (XML)
 */
export async function parseRosFile(file: File | Blob): Promise<NewRecruitParseResult> {
  const content = await file.text();
  return parseRosXml(content);
}

/**
 * Parse a New Recruit .json file
 */
export async function parseJsonFile(file: File | Blob): Promise<NewRecruitParseResult> {
  const content = await file.text();
  const data = JSON.parse(content) as NewRecruitExport;
  return extractParseResult(data.roster);
}

/**
 * Parse any supported army list file based on extension
 */
export async function parseArmyListFile(file: File): Promise<NewRecruitParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.rosz')) {
    return parseRoszFile(file);
  } else if (fileName.endsWith('.ros')) {
    return parseRosFile(file);
  } else if (fileName.endsWith('.json')) {
    return parseJsonFile(file);
  } else {
    throw new Error(`Unsupported file format: ${fileName}. Supported: .rosz, .ros, .json`);
  }
}

// ============================================================================
// XML Parsing
// ============================================================================

/**
 * Parse BattleScribe XML content to our roster structure
 */
function parseRosXml(xmlContent: string): NewRecruitParseResult {
  const parsed = xmlParser.parse(xmlContent);

  // The XML has a root 'roster' element
  const xmlRoster = parsed.roster;
  if (!xmlRoster) {
    throw new Error('Invalid BattleScribe file: missing roster element');
  }

  // Convert XML structure to our NewRecruitRoster format
  const roster = convertXmlRoster(xmlRoster);
  return extractParseResult(roster);
}

/**
 * Convert XML roster structure to NewRecruitRoster
 */
function convertXmlRoster(xml: Record<string, unknown>): NewRecruitRoster {
  return {
    id: xml.id as string,
    name: xml.name as string,
    battleScribeVersion: xml.battleScribeVersion as string,
    generatedBy: (xml.generatedBy as string) || 'BattleScribe',
    gameSystemId: xml.gameSystemId as string,
    gameSystemName: xml.gameSystemName as string,
    gameSystemRevision: xml.gameSystemRevision as string,
    xmlns: xml.xmlns as string,
    costs: convertCosts(xml.costs as Record<string, unknown>),
    costLimits: convertCostLimits(xml.costLimits as Record<string, unknown>),
    forces: convertForces(xml.forces as Record<string, unknown>),
  };
}

/**
 * Convert XML costs structure
 */
function convertCosts(xml: Record<string, unknown> | undefined): NewRecruitCost[] {
  if (!xml || !xml.cost) return [];
  const costs = Array.isArray(xml.cost) ? xml.cost : [xml.cost];
  return costs.map((c: Record<string, unknown>) => ({
    name: c.name as string,
    typeId: c.typeId as string,
    value: parseFloat(c.value as string),
  }));
}

/**
 * Convert XML cost limits structure
 */
function convertCostLimits(xml: Record<string, unknown> | undefined): NewRecruitCost[] {
  if (!xml || !xml.costLimit) return [];
  const limits = Array.isArray(xml.costLimit) ? xml.costLimit : [xml.costLimit];
  return limits.map((c: Record<string, unknown>) => ({
    name: c.name as string,
    typeId: c.typeId as string,
    value: parseFloat(c.value as string),
  }));
}

/**
 * Convert XML forces structure
 */
function convertForces(xml: Record<string, unknown> | undefined): NewRecruitForce[] {
  if (!xml || !xml.force) return [];
  const forces = Array.isArray(xml.force) ? xml.force : [xml.force];
  return forces.map(convertForce);
}

/**
 * Convert a single XML force
 */
function convertForce(xml: Record<string, unknown>): NewRecruitForce {
  return {
    id: xml.id as string,
    name: xml.name as string,
    entryId: xml.entryId as string,
    catalogueId: xml.catalogueId as string,
    catalogueRevision: xml.catalogueRevision as string,
    catalogueName: xml.catalogueName as string,
    selections: convertSelections(xml.selections as Record<string, unknown>),
    forces: xml.forces ? convertForces(xml.forces as Record<string, unknown>) : undefined,
    categories: convertCategories(xml.categories as Record<string, unknown>),
    costs: xml.costs ? convertCosts(xml.costs as Record<string, unknown>) : undefined,
  };
}

/**
 * Convert XML selections structure
 */
function convertSelections(xml: Record<string, unknown> | undefined): NewRecruitSelection[] {
  if (!xml || !xml.selection) return [];
  const selections = Array.isArray(xml.selection) ? xml.selection : [xml.selection];
  return selections.map(convertSelection);
}

/**
 * Convert a single XML selection
 */
function convertSelection(xml: Record<string, unknown>): NewRecruitSelection {
  return {
    id: xml.id as string,
    name: xml.name as string,
    entryId: xml.entryId as string,
    entryGroupId: xml.entryGroupId as string | undefined,
    number: parseInt(xml.number as string, 10),
    type: xml.type as 'unit' | 'upgrade' | 'model',
    from: xml.from as 'entry' | 'group',
    group: xml.group as string | undefined,
    selections: xml.selections
      ? convertSelections(xml.selections as Record<string, unknown>)
      : undefined,
    categories: xml.categories
      ? convertCategories(xml.categories as Record<string, unknown>)
      : undefined,
    costs: xml.costs ? convertCosts(xml.costs as Record<string, unknown>) : undefined,
    // Note: profiles and rules are omitted as they're not needed for import
  };
}

/**
 * Convert XML categories structure
 */
function convertCategories(xml: Record<string, unknown> | undefined): NewRecruitCategory[] {
  if (!xml || !xml.category) return [];
  const categories = Array.isArray(xml.category) ? xml.category : [xml.category];
  return categories.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    entryId: c.entryId as string,
    name: c.name as string,
    primary: c.primary === 'true' || c.primary === true,
  }));
}

// ============================================================================
// Result Extraction
// ============================================================================

/**
 * Extract the simplified parse result from a roster
 */
function extractParseResult(roster: NewRecruitRoster): NewRecruitParseResult {
  const force = roster.forces[0];
  if (!force) {
    throw new Error('Invalid roster: no forces found');
  }

  const units = extractUnits(force);
  const totalPoints = roster.costs.find((c) => c.typeId === 'points')?.value ?? 0;

  return {
    listName: roster.name,
    faction: force.catalogueName,
    gameSystem: roster.gameSystemName,
    totalPoints,
    units,
    generatedBy: roster.generatedBy,
    dataVersion: roster.gameSystemRevision,
  };
}

/**
 * Extract all units from a force (including nested regiments)
 */
function extractUnits(force: NewRecruitForce): NewRecruitImportUnit[] {
  const units: NewRecruitImportUnit[] = [];

  // Process top-level selections (e.g., faction terrain)
  for (const selection of force.selections) {
    if (selection.type === 'unit') {
      units.push(selectionToUnit(selection));
    }
  }

  // Process nested forces (regiments)
  for (const nestedForce of force.forces || []) {
    for (const selection of nestedForce.selections) {
      if (selection.type === 'unit') {
        units.push(selectionToUnit(selection));
      }
    }
  }

  return units;
}

/**
 * Convert a selection to an import unit
 */
function selectionToUnit(selection: NewRecruitSelection): NewRecruitImportUnit {
  const pointsCost = selection.costs?.find((c) => c.typeId === 'points')?.value ?? 0;

  return {
    name: selection.name,
    quantity: selection.number,
    pointsCost,
    categories: selection.categories?.map((c) => c.name) ?? [],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return ['.rosz', '.ros', '.json'];
}

/**
 * Check if a file is a supported army list format
 */
export function isSupportedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return getSupportedExtensions().some((ext) => lower.endsWith(ext));
}
