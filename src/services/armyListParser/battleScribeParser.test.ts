import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseRoszFile,
  parseRosFile,
  parseJsonFile,
  parseArmyListFile,
  isSupportedFile,
  getSupportedExtensions,
} from './battleScribeParser';

/**
 * Helper to create a File-like object from a file path.
 * In Node.js test environment, we need to add the text() method manually.
 */
function createFileFromPath(filePath: string, fileName: string): File {
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);

  // Create a File with the text() method that works in Node.js
  const file = new File([uint8Array], fileName);

  // Add text() method for Node.js compatibility
  (file as File & { text: () => Promise<string> }).text = async () => {
    return buffer.toString('utf-8');
  };

  return file;
}

describe('BattleScribe Parser', () => {
  const examplesDir = path.join(__dirname, '../../../examples');

  describe('isSupportedFile', () => {
    it('should recognize .rosz files', () => {
      expect(isSupportedFile('army.rosz')).toBe(true);
      expect(isSupportedFile('ARMY.ROSZ')).toBe(true);
    });

    it('should recognize .ros files', () => {
      expect(isSupportedFile('army.ros')).toBe(true);
    });

    it('should recognize .json files', () => {
      expect(isSupportedFile('army.json')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(isSupportedFile('army.txt')).toBe(false);
      expect(isSupportedFile('army.xml')).toBe(false);
      expect(isSupportedFile('army.pdf')).toBe(false);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return supported extensions', () => {
      const extensions = getSupportedExtensions();
      expect(extensions).toContain('.rosz');
      expect(extensions).toContain('.ros');
      expect(extensions).toContain('.json');
    });
  });

  describe('parseJsonFile', () => {
    it('should parse New Recruit JSON export', async () => {
      const filePath = path.join(examplesDir, '2k KB.json');
      const file = createFileFromPath(filePath, '2k KB.json');

      const result = await parseJsonFile(file);

      expect(result.listName).toBe('2k KB');
      expect(result.faction).toBe('Kruleboyz');
      expect(result.gameSystem).toBe('Age of Sigmar 4.0');
      expect(result.totalPoints).toBe(1930);
      expect(result.generatedBy).toBe('https://newrecruit.eu');
      expect(result.units.length).toBeGreaterThan(0);
    });

    it('should extract all units with correct data', async () => {
      const filePath = path.join(examplesDir, '2k KB.json');
      const file = createFileFromPath(filePath, '2k KB.json');

      const result = await parseJsonFile(file);

      // Check for specific units
      const breakaBoss = result.units.find((u) => u.name === 'Breaka-boss on Mirebrute Troggoth');
      expect(breakaBoss).toBeDefined();
      expect(breakaBoss?.pointsCost).toBe(200);
      expect(breakaBoss?.quantity).toBe(1);

      const gutrippaz = result.units.filter((u) => u.name === 'Gutrippaz');
      expect(gutrippaz.length).toBe(2); // Two units of Gutrippaz
      expect(gutrippaz[0].pointsCost).toBe(320);
    });
  });

  describe('parseRosFile', () => {
    it('should parse BattleScribe .ros XML file', async () => {
      const filePath = path.join(examplesDir, '2k KB.ros');
      const file = createFileFromPath(filePath, '2k KB.ros');

      const result = await parseRosFile(file);

      expect(result.listName).toBe('2k KB');
      expect(result.faction).toBe('Kruleboyz');
      expect(result.gameSystem).toBe('Age of Sigmar 4.0');
      expect(result.totalPoints).toBe(1930);
    });

    it('should produce same results as JSON parser', async () => {
      const jsonPath = path.join(examplesDir, '2k KB.json');
      const rosPath = path.join(examplesDir, '2k KB.ros');

      const jsonFile = createFileFromPath(jsonPath, '2k KB.json');
      const rosFile = createFileFromPath(rosPath, '2k KB.ros');

      const jsonResult = await parseJsonFile(jsonFile);
      const rosResult = await parseRosFile(rosFile);

      expect(rosResult.listName).toBe(jsonResult.listName);
      expect(rosResult.faction).toBe(jsonResult.faction);
      expect(rosResult.totalPoints).toBe(jsonResult.totalPoints);
      expect(rosResult.units.length).toBe(jsonResult.units.length);

      // Check unit names match
      const jsonUnitNames = jsonResult.units.map((u) => u.name).sort();
      const rosUnitNames = rosResult.units.map((u) => u.name).sort();
      expect(rosUnitNames).toEqual(jsonUnitNames);
    });
  });

  describe('parseRoszFile', () => {
    it('should parse compressed BattleScribe .rosz file', async () => {
      const filePath = path.join(examplesDir, '2k KB.rosz');
      const file = createFileFromPath(filePath, '2k KB.rosz');

      const result = await parseRoszFile(file);

      expect(result.listName).toBe('2k KB');
      expect(result.faction).toBe('Kruleboyz');
      expect(result.totalPoints).toBe(1930);
      expect(result.units.length).toBeGreaterThan(0);
    });
  });

  describe('parseArmyListFile', () => {
    it('should auto-detect and parse .json files', async () => {
      const filePath = path.join(examplesDir, '2k KB.json');
      const file = createFileFromPath(filePath, '2k KB.json');

      const result = await parseArmyListFile(file);
      expect(result.listName).toBe('2k KB');
    });

    it('should auto-detect and parse .ros files', async () => {
      const filePath = path.join(examplesDir, '2k KB.ros');
      const file = createFileFromPath(filePath, '2k KB.ros');

      const result = await parseArmyListFile(file);
      expect(result.listName).toBe('2k KB');
    });

    it('should auto-detect and parse .rosz files', async () => {
      const filePath = path.join(examplesDir, '2k KB.rosz');
      const file = createFileFromPath(filePath, '2k KB.rosz');

      const result = await parseArmyListFile(file);
      expect(result.listName).toBe('2k KB');
    });

    it('should reject unsupported file types', async () => {
      const file = new File(['test'], 'army.txt');

      await expect(parseArmyListFile(file)).rejects.toThrow('Unsupported file format');
    });
  });

  describe('Unit extraction', () => {
    it('should include faction terrain', async () => {
      const filePath = path.join(examplesDir, '2k KB.json');
      const file = createFileFromPath(filePath, '2k KB.json');

      const result = await parseJsonFile(file);

      const terrain = result.units.find((u) => u.name === 'Skaregob Totem');
      expect(terrain).toBeDefined();
      expect(terrain?.pointsCost).toBe(20);
    });

    it('should extract unit categories', async () => {
      const filePath = path.join(examplesDir, '2k KB.json');
      const file = createFileFromPath(filePath, '2k KB.json');

      const result = await parseJsonFile(file);

      const breakaBoss = result.units.find((u) => u.name === 'Breaka-boss on Mirebrute Troggoth');
      expect(breakaBoss?.categories).toContain('HERO');
      expect(breakaBoss?.categories).toContain('MONSTER');
    });
  });
});
