import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { subscribeToPaintShoppingList } from '../services/project';
import { addPaintToInventory } from '../services/inventory/inventoryService';
import type { PaintShoppingListData } from '../types/paintShoppingList';

interface UsePaintShoppingListReturn {
  data: PaintShoppingListData | null;
  isLoading: boolean;
  error: Error | null;
  markAsOwned: (paintId: string) => Promise<void>;
  isPending: (paintId: string) => boolean;
}

export function usePaintShoppingList(): UsePaintShoppingListReturn {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<PaintShoppingListData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToPaintShoppingList(
      user.uid,
      (paintShoppingListData) => {
        setData(paintShoppingListData);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthenticated]);

  const markAsOwned = useCallback(
    async (paintId: string) => {
      if (!user) return;

      setPendingIds((prev) => new Set(prev).add(paintId));

      try {
        await addPaintToInventory(user.uid, paintId);
        // Real-time subscription will automatically remove from list
      } catch (err) {
        setError(err as Error);
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(paintId);
          return next;
        });
      }
    },
    [user]
  );

  const isPending = useCallback(
    (paintId: string) => pendingIds.has(paintId),
    [pendingIds]
  );

  return {
    data,
    isLoading,
    error,
    markAsOwned,
    isPending,
  };
}
