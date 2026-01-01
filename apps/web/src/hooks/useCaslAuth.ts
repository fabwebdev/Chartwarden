'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from 'store/authStore';
import { useAbility } from 'contexts/AbilityContext';
import {
  CASL_ACTIONS,
  CASL_SUBJECTS,
} from '@chartwarden/types';
import type { CaslAction, CaslSubject } from '@chartwarden/types';
import axiosInstance from './useCookie';

/**
 * Hook that syncs CASL abilities with the auth store
 * Automatically updates abilities when user role changes
 */
export const useCaslAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { ability, updateAbility, updateAbilityFromRole, can, cannot } = useAbility();

  // Sync abilities when user changes
  useEffect(() => {
    if (user && user.role) {
      updateAbilityFromRole(user.role);
    }
  }, [user?.id, user?.role, updateAbilityFromRole]);

  // Fetch abilities from backend API (for server-driven abilities)
  const fetchAbilities = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await axiosInstance.get('/auth/abilities');
      if (response.data?.data?.abilities?.rules) {
        updateAbility(response.data.data.abilities.rules);
      }
    } catch (error) {
      console.error('Failed to fetch CASL abilities:', error);
      // Fallback to role-based abilities
      if (user?.role) {
        updateAbilityFromRole(user.role);
      }
    }
  }, [isAuthenticated, user?.role, updateAbility, updateAbilityFromRole]);

  return {
    ability,
    can,
    cannot,
    fetchAbilities,
    isAuthenticated,
    // Re-export CASL constants for convenience
    ACTIONS: CASL_ACTIONS,
    SUBJECTS: CASL_SUBJECTS,
  };
};

/**
 * Hook to check if user can perform an action
 * @param action - The action to check (e.g., 'read', 'create')
 * @param subject - The subject to check (e.g., 'Patient', 'Medication')
 * @returns boolean indicating if user can perform the action
 */
export const useCan = (action: CaslAction, subject: CaslSubject): boolean => {
  const { can } = useAbility();
  return can(action, subject);
};

/**
 * Hook to check if user cannot perform an action
 * @param action - The action to check
 * @param subject - The subject to check
 * @returns boolean indicating if user cannot perform the action
 */
export const useCannot = (action: CaslAction, subject: CaslSubject): boolean => {
  const { cannot } = useAbility();
  return cannot(action, subject);
};

export default useCaslAuth;
