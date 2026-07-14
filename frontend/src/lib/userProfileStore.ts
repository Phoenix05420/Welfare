import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  community: string;
  aadhaarNumber: string;
  mobileNumber: string;
  emailAddress: string;
  currentStandard: string;
  schoolName: string;
  schoolType: string;
  mediumOfInstruction: string;
  annualIncome: string;
  [key: string]: string; // For any unmapped dynamic fields
}

interface UserProfileState {
  profile: Partial<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export const useUserProfile = create<UserProfileState>()(
  persist(
    (set) => ({
      profile: {},
      updateProfile: (updates) =>
        set((state) => ({ profile: { ...state.profile, ...updates } })),
      clearProfile: () => set({ profile: {} }),
    }),
    {
      name: "welfare-user-profile",
    }
  )
);
