export {
  searchPaints,
  getAutocompleteSuggestions,
  getPaintById,
  getPaintBySku,
  getPaintFilterOptions,
  preloadPaints,
} from './paintService';

export { invalidateCache as invalidatePaintCache } from './paintCache';
