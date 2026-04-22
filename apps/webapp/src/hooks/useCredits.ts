import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useTelegram } from './useTelegram';

interface CreditsResponse {
  credits: number;
}

interface UseCreditsReturn {
  credits: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
  const { user } = useTelegram();
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await apiClient
        .get(`credits/user/${user.id}`)
        .json<CreditsResponse>();
      setCredits(response.credits);
    } catch {
      setCredits(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    isLoading,
    refetch: fetchCredits,
  };
}
