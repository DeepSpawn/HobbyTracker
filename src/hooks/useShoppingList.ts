import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  subscribeToShoppingList,
  updateProjectUnit,
  type ShoppingListData,
} from '../services/project';

interface UseShoppingListReturn {
  data: ShoppingListData | null;
  isLoading: boolean;
  error: Error | null;
  markAsOwned: (projectId: string, unitId: string) => Promise<void>;
}

export function useShoppingList(): UseShoppingListReturn {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToShoppingList(
      user.uid,
      (shoppingListData) => {
        setData(shoppingListData);
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
    async (projectId: string, unitId: string) => {
      if (!user) return;
      await updateProjectUnit(user.uid, projectId, unitId, { status: 'owned' });
      // Real-time subscription will automatically update the list
    },
    [user]
  );

  return {
    data,
    isLoading,
    error,
    markAsOwned,
  };
}
