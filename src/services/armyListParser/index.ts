/**
 * Army List Parser Service
 *
 * Parses army list files from BattleScribe and New Recruit into a unified format
 * for import into HobbyTrackerApp projects.
 */

export {
  parseRoszFile,
  parseRosFile,
  parseJsonFile,
  parseArmyListFile,
  getSupportedExtensions,
  isSupportedFile,
} from './battleScribeParser';

export type {
  NewRecruitExport,
  NewRecruitRoster,
  NewRecruitForce,
  NewRecruitSelection,
  NewRecruitCost,
  NewRecruitCategory,
  NewRecruitParseResult,
  NewRecruitImportUnit,
} from '../../types/newRecruit';
