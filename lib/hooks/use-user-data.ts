"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/auth-context';

export function useUserData() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const { data, error } = await supabase
          .from('usr')
          .select('*, brands(*)')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
        } else {
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  return { userData, isLoading };
}
