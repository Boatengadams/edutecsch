import { useContext, createContext } from 'react';
import type { UserProfile, SchoolSettings, SubscriptionStatus } from '../types';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export interface AuthenticationContextType {
  user: firebase.User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  schoolSettings: SchoolSettings | null;
  subscriptionStatus: SubscriptionStatus | null;
}

export const AuthenticationContext = createContext<AuthenticationContextType>({ user: null, userProfile: null, loading: true, schoolSettings: null, subscriptionStatus: null });

export const useAuthentication = () => {
  return useContext(AuthenticationContext);
};