// =============================================================================
// Core Domain Models
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | 'admin' | 'physician' | 'nurse' | 'rn' | 'lpn' | 'cna'
  | 'social_worker' | 'chaplain' | 'aide' | 'billing' | 'scheduler' | 'medical_director';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: Date;
  gender: Gender;
  admissionDate: Date;
  dischargeDate?: Date;
  levelOfCare: LevelOfCare;
  status: PatientStatus;
  primaryDiagnosis?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type LevelOfCare = 'routine' | 'continuous' | 'inpatient' | 'respite';
export type PatientStatus = 'pending_admission' | 'active' | 'discharged' | 'deceased' | 'revoked' | 'transferred';

export interface Encounter {
  id: string;
  patientId: string;
  staffId: string;
  encounterType: EncounterType;
  visitType: VisitType;
  status: EncounterStatus;
  scheduledAt: Date;
  checkinAt?: Date;
  checkoutAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EncounterType = 'routine_visit' | 'admission' | 'recertification' | 'discharge' | 'death_visit' | 'prn_visit' | 'on_call';
export type VisitType = 'rn' | 'lpn' | 'cna' | 'msw' | 'chaplain' | 'volunteer' | 'physician' | 'np';
export type EncounterStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  route: MedicationRoute;
  frequency: string;
  status: MedicationStatus;
  isControlled: boolean;
  controlledSchedule?: 'II' | 'III' | 'IV' | 'V';
  createdAt: Date;
  updatedAt: Date;
}

export type MedicationRoute = 'oral' | 'sublingual' | 'topical' | 'transdermal' | 'subcutaneous' | 'intramuscular' | 'intravenous' | 'rectal' | 'inhalation';
export type MedicationStatus = 'active' | 'on_hold' | 'discontinued' | 'completed';

export interface Claim {
  id: string;
  patientId: string;
  payerId: string;
  claimNumber: string;
  serviceFromDate: Date;
  serviceToDate: Date;
  totalCharges: number;
  status: ClaimStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ClaimStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected' | 'paid' | 'denied' | 'appealed' | 'void';
