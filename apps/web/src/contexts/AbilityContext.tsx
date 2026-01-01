'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { createMongoAbility, MongoAbility, RawRuleOf } from '@casl/ability';

// Import shared CASL definitions from @chartwarden/types
import {
  CASL_ACTIONS,
  CASL_SUBJECTS,
  CaslAction,
  CaslSubject,
  SerializedAbilityRule,
  ROLE_PERMISSIONS_MAP,
  PERMISSION_TO_CASL_MAP,
} from '@chartwarden/types';

// Re-export for convenience
export { CASL_ACTIONS, CASL_SUBJECTS };
export type { CaslAction, CaslSubject };

// Define the Ability type
type AppAbility = MongoAbility<[CaslAction, CaslSubject]>;

// Create a default empty ability
const createDefaultAbility = (): AppAbility => {
  return createMongoAbility<[CaslAction, CaslSubject]>([]);
};

// Create ability from serialized rules (from API)
export const createAbilityFromRules = (rules: SerializedAbilityRule[]): AppAbility => {
  const formattedRules = rules.map((rule) => ({
    action: rule.action as CaslAction | CaslAction[],
    subject: rule.subject as CaslSubject | CaslSubject[],
    conditions: rule.conditions,
    fields: rule.fields,
    inverted: rule.inverted,
    reason: rule.reason,
  })) as RawRuleOf<AppAbility>[];

  return createMongoAbility<[CaslAction, CaslSubject]>(formattedRules);
};

// Create ability from user role (client-side generation matching backend)
export const createAbilityFromRole = (role: string): AppAbility => {
  const permissions = ROLE_PERMISSIONS_MAP[role.toLowerCase()] || [];
  const rules: RawRuleOf<AppAbility>[] = [];

  // Admin has full access
  if (role.toLowerCase() === 'admin') {
    rules.push({
      action: CASL_ACTIONS.MANAGE as CaslAction,
      subject: CASL_SUBJECTS.ALL as CaslSubject,
    });
    return createMongoAbility<[CaslAction, CaslSubject]>(rules);
  }

  // Map permissions to CASL rules
  permissions.forEach((permission) => {
    const mapping = PERMISSION_TO_CASL_MAP[permission];
    if (mapping) {
      rules.push({
        action: mapping.action as CaslAction,
        subject: mapping.subject as CaslSubject,
      });
    }
  });

  return createMongoAbility<[CaslAction, CaslSubject]>(rules);
};

// Context interface
interface AbilityContextType {
  ability: AppAbility;
  isLoading: boolean;
  updateAbility: (rules: SerializedAbilityRule[]) => void;
  updateAbilityFromRole: (role: string) => void;
  can: (action: CaslAction, subject: CaslSubject) => boolean;
  cannot: (action: CaslAction, subject: CaslSubject) => boolean;
}

// Create the context
const AbilityContext = createContext<AbilityContextType | undefined>(undefined);

/**
 * Can component for conditional rendering based on abilities
 * This is a simple implementation that doesn't require @casl/react
 */
interface CanProps {
  I: CaslAction;
  a: CaslSubject;
  children: ReactNode;
  passThrough?: boolean;
  not?: boolean;
}

export function Can({ I: action, a: subject, children, passThrough = false, not = false }: CanProps) {
  const context = useContext(AbilityContext);
  if (!context) {
    if (passThrough) return <>{children}</>;
    return null;
  }

  const hasPermission = not ? context.cannot(action, subject) : context.can(action, subject);

  if (hasPermission || passThrough) {
    return <>{children}</>;
  }

  return null;
}

// Props for the provider
interface AbilityProviderProps {
  children: ReactNode;
  initialRules?: SerializedAbilityRule[];
  initialRole?: string;
}

/**
 * AbilityProvider - Provides CASL authorization context to the application
 *
 * Usage:
 * 1. Wrap your app with <AbilityProvider>
 * 2. Use the useAbility() hook to access ability and helper functions
 * 3. Use <Can I="read" a="Patient">content</Can> for conditional rendering
 */
export function AbilityProvider({ children, initialRules, initialRole }: AbilityProviderProps) {
  const [ability, setAbility] = useState<AppAbility>(() => {
    if (initialRules && initialRules.length > 0) {
      return createAbilityFromRules(initialRules);
    }
    if (initialRole) {
      return createAbilityFromRole(initialRole);
    }
    return createDefaultAbility();
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, _setIsLoading] = useState(false);

  // Update ability from serialized rules
  const updateAbility = (rules: SerializedAbilityRule[]) => {
    const newAbility = createAbilityFromRules(rules);
    setAbility(newAbility);
  };

  // Update ability from role
  const updateAbilityFromRole = (role: string) => {
    const newAbility = createAbilityFromRole(role);
    setAbility(newAbility);
  };

  // Helper functions
  const can = (action: CaslAction, subject: CaslSubject): boolean => {
    return ability.can(action, subject);
  };

  const cannot = (action: CaslAction, subject: CaslSubject): boolean => {
    return ability.cannot(action, subject);
  };

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      ability,
      isLoading,
      updateAbility,
      updateAbilityFromRole,
      can,
      cannot,
    }),
    [ability, isLoading]
  );

  return (
    <AbilityContext.Provider value={contextValue}>
      {children}
    </AbilityContext.Provider>
  );
}

/**
 * Hook to access the ability context
 */
export function useAbility(): AbilityContextType {
  const context = useContext(AbilityContext);
  if (!context) {
    throw new Error('useAbility must be used within an AbilityProvider');
  }
  return context;
}

/**
 * Hook to check a single permission
 */
export function usePermission(action: CaslAction, subject: CaslSubject): boolean {
  const { ability } = useAbility();
  return ability.can(action, subject);
}

export { AbilityContext };
export type { AppAbility, AbilityContextType };
