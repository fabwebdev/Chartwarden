import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  [key: string]: any; // Allow additional properties
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
      name: 'patient-storage', // localStorage key
    }
  )
);







