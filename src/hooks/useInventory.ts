import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  subscribeToInventory,
  togglePaintOwnership,
} from '../services/inventory';

interface UseInventoryReturn {
  ownedPaintIds: Set<string>;
  isLoading: boolean;
  error: Error | null;
  isOwned: (paintId: string) => boolean;
  toggleOwnership: (paintId: string) => Promise<void>;
  isPending: (paintId: string) => boolean;
}

export function useInventory(): UseInventoryReturn {
  const { user, isAuthenticated } = useAuth();
  const [ownedPaintIds, setOwnedPaintIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Subscribe to real-time inventory updates
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOwnedPaintIds(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToInventory(
      user.uid,
      (paintIds) => {
        setOwnedPaintIds(paintIds);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthenticated]);

  const isOwned = useCallback(
    (paintId: string) => ownedPaintIds.has(paintId),
    [ownedPaintIds]
  );

  const isPending = useCallback(
    (paintId: string) => pendingIds.has(paintId),
    [pendingIds]
  );

  const toggleOwnership = useCallback(
    async (paintId: string) => {
      if (!user) return;

      const currentlyOwned = ownedPaintIds.has(paintId);

      // Optimistic update
      setPendingIds((prev) => new Set(prev).add(paintId));
      setOwnedPaintIds((prev) => {
        const next = new Set(prev);
        if (currentlyOwned) {
          next.delete(paintId);
        } else {
          next.add(paintId);
        }
        return next;
      });

      try {
        await togglePaintOwnership(user.uid, paintId, currentlyOwned);
      } catch (err) {
        // Rollback on error
        setOwnedPaintIds((prev) => {
          const next = new Set(prev);
          if (currentlyOwned) {
            next.add(paintId);
          } else {
            next.delete(paintId);
          }
          return next;
        });
        setError(err as Error);
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(paintId);
          return next;
        });
      }
    },
    [user, ownedPaintIds]
  );

  return {
    ownedPaintIds,
    isLoading,
    error,
    isOwned,
    toggleOwnership,
    isPending,
  };
}
