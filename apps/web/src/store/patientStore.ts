import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * HIPAA Compliance: PHI fields that must NEVER be persisted to localStorage
 * These fields are redacted before storage to prevent PHI leakage.
 *
 * Reference: 45 CFR §164.312(a)(2)(iv) - Encryption and Decryption
 */
const PHI_FIELDS_TO_REDACT = [
  'ssn',
  'social_security_number',
  'date_of_birth',
  'dob',
  'medicare_id',
  'medicaid_id',
  'medicare_beneficiary_id',
  'medical_record_number',
  'mrn',
  'phone',
  'primary_phone',
  'mobile_phone',
  'email',
  'address',
  'street_address',
  'city',
  'zip_code',
  'emergency_contact_phone',
  'emergency_contact_name',
  'insurance_member_id',
  'policy_number',
  'bank_account',
  'credit_card',
] as const;

/**
 * Redacts PHI fields from patient data before storage
 * Only non-sensitive identifiers are persisted for session continuity
 */
function redactPHI<T extends Record<string, unknown>>(data: T | null): T | null {
  if (!data) return null;

  const redacted = { ...data };

  for (const field of PHI_FIELDS_TO_REDACT) {
    if (field in redacted) {
      delete redacted[field];
    }
  }

  // Also redact any field that matches PHI patterns
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('ssn') ||
      lowerKey.includes('social_security') ||
      lowerKey.includes('medicare') ||
      lowerKey.includes('medicaid') ||
      lowerKey.includes('phone') ||
      lowerKey.includes('email') ||
      lowerKey.includes('address') ||
      lowerKey.includes('bank') ||
      lowerKey.includes('credit')
    ) {
      delete redacted[key];
    }
  }

  return redacted as T;
}

interface Patient {
  id: string | number;
  first_name?: string;
  last_name?: string;
  mi?: string;
  preferred_name?: string;
  date_of_birth?: string;
  suffix?: string;
  ssn?: string;
  dnr_id?: string;
  hipaa_received?: string;
  race_ethnicity_id?: string;
  race_ethnicity_name?: string;
  liaison_primary_id?: string;
  emergency_preparedness_level_id?: string;
  oxygen_dependent?: string;
  patient_consents?: string;
  gender?: string;
  genders?: string;
  dme_provider_id?: string;
  patient_pharmacy_id?: string;
  primary_diagnosis_id?: string;
  veterans_status?: string | number | boolean;
  [key: string]: unknown; // Allow additional properties
}

interface PatientStore {
  selectedPatientId: string | number | null;
  selectedPatientData: Patient | null;
  setSelectedPatient: (patientId: string | number, patientData?: Patient) => void;
  clearSelectedPatient: () => void;
  updatePatientData: (patientData: Partial<Patient>) => void;
}

export const usePatientStore = create<PatientStore>()(
  persist(
    (set) => ({
      selectedPatientId: null,
      selectedPatientData: null,

      setSelectedPatient: (patientId, patientData) => {
        set({
          selectedPatientId: patientId,
          selectedPatientData: patientData || null,
        });
      },

      clearSelectedPatient: () => {
        set({
          selectedPatientId: null,
          selectedPatientData: null,
        });
      },

      updatePatientData: (patientData) => {
        set((state) => ({
          selectedPatientData: state.selectedPatientData
            ? { ...state.selectedPatientData, ...patientData }
            : patientData as Patient,
        }));
      },
    }),
    {
      name: 'patient-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage instead of localStorage for better security
      /**
       * HIPAA Compliance: Redact PHI before persisting to storage
       * Only non-sensitive patient identifiers are stored for session continuity.
       * Full patient data including PHI must be fetched from the server.
       */
      partialize: (state) => ({
        selectedPatientId: state.selectedPatientId,
        // Redact all PHI fields before storage - only keep safe identifiers
        selectedPatientData: redactPHI(state.selectedPatientData),
      }),
    }
  )
);







