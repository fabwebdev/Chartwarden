/**
 * Test Data Generators for E2E Tests
 *
 * IMPORTANT: All data generated here is SYNTHETIC and HIPAA-compliant.
 * NEVER use real PHI (Protected Health Information) in tests.
 */

/**
 * Generate a unique timestamp-based ID
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique email address for testing
 * @param prefix - Optional prefix for the email
 */
export function generateEmail(prefix: string = 'test'): string {
  const uniqueId = generateUniqueId();
  return `${prefix}-${uniqueId}@chartwarden.test`;
}

/**
 * Generate a random phone number (US format)
 */
export function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const firstPart = Math.floor(Math.random() * 900) + 100;
  const secondPart = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${firstPart}-${secondPart}`;
}

/**
 * Generate a random SSN (for testing only - NOT real)
 */
export function generateSSN(): string {
  const part1 = Math.floor(Math.random() * 900) + 100;
  const part2 = Math.floor(Math.random() * 90) + 10;
  const part3 = Math.floor(Math.random() * 9000) + 1000;
  return `${part1}-${part2}-${part3}`;
}

/**
 * Generate a unique MRN (Medical Record Number)
 */
export function generateMRN(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `MRN-${timestamp}-${random}`;
}

/**
 * Generate a random date within a range
 * @param startYear - Start year
 * @param endYear - End year
 */
export function generateRandomDate(startYear: number = 1940, endYear: number = 2010): string {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Generate a random zip code
 */
export function generateZipCode(): string {
  return String(Math.floor(Math.random() * 90000) + 10000);
}

/**
 * Common first names for testing
 */
const FIRST_NAMES = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Emma',
  'William', 'Olivia', 'James', 'Ava', 'Richard', 'Sophia', 'Thomas', 'Isabella',
];

/**
 * Common last names for testing
 */
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
];

/**
 * US States
 */
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

/**
 * Cities for testing
 */
const CITIES = [
  'Springfield', 'Franklin', 'Clinton', 'Madison', 'Georgetown',
  'Salem', 'Arlington', 'Fairview', 'Bristol', 'Chester',
];

/**
 * Get random item from array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate synthetic patient data
 * @param overrides - Optional overrides for specific fields
 */
export function generatePatientData(overrides: Partial<{
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  mrn: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  ssn: string;
}> = {}) {
  const firstName = overrides.firstName || getRandomItem(FIRST_NAMES);
  const lastName = overrides.lastName || getRandomItem(LAST_NAMES);

  return {
    firstName,
    lastName,
    dateOfBirth: overrides.dateOfBirth || generateRandomDate(1940, 2010),
    gender: overrides.gender || getRandomItem(['Male', 'Female', 'Other']),
    mrn: overrides.mrn || generateMRN(),
    phone: overrides.phone || generatePhoneNumber(),
    email: overrides.email || generateEmail(`patient-${firstName.toLowerCase()}`),
    addressLine1: overrides.addressLine1 || `${Math.floor(Math.random() * 9999) + 1} ${getRandomItem(['Main', 'Oak', 'Elm', 'Maple', 'Pine'])} St`,
    city: overrides.city || getRandomItem(CITIES),
    state: overrides.state || getRandomItem(US_STATES),
    zipCode: overrides.zipCode || generateZipCode(),
    ssn: overrides.ssn || generateSSN(),
  };
}

/**
 * Generate synthetic user data
 * @param overrides - Optional overrides for specific fields
 */
export function generateUserData(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  department: string;
  jobTitle: string;
  company: string;
}> = {}) {
  const firstName = overrides.firstName || getRandomItem(FIRST_NAMES);
  const lastName = overrides.lastName || getRandomItem(LAST_NAMES);

  return {
    firstName,
    lastName,
    email: overrides.email || generateEmail(`${firstName.toLowerCase()}.${lastName.toLowerCase()}`),
    password: overrides.password || 'Test@12345',
    role: overrides.role || 'clinician',
    phone: overrides.phone || generatePhoneNumber(),
    department: overrides.department || getRandomItem(['Clinical', 'Administrative', 'Nursing', 'Social Work']),
    jobTitle: overrides.jobTitle || getRandomItem(['RN', 'MD', 'Social Worker', 'Administrator']),
    company: overrides.company || 'Chartwarden Hospice Test',
  };
}

/**
 * Generate synthetic encounter data
 */
export function generateEncounterData(overrides: Partial<{
  encounterType: string;
  date: string;
  chiefComplaint: string;
  notes: string;
}> = {}) {
  return {
    encounterType: overrides.encounterType || getRandomItem(['Initial Assessment', 'Follow-up', 'Routine Visit', 'Emergency']),
    date: overrides.date || new Date().toISOString().split('T')[0],
    chiefComplaint: overrides.chiefComplaint || getRandomItem(['Pain management', 'Symptom assessment', 'Medication review', 'Family support']),
    notes: overrides.notes || `Test encounter notes generated at ${new Date().toISOString()}`,
  };
}

/**
 * Generate synthetic medication data
 */
export function generateMedicationData(overrides: Partial<{
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
}> = {}) {
  const medications = ['Morphine', 'Lorazepam', 'Haloperidol', 'Acetaminophen', 'Ibuprofen'];
  const routes = ['Oral', 'IV', 'Sublingual', 'Topical', 'Subcutaneous'];
  const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Every 4 hours', 'As needed'];

  return {
    name: overrides.name || getRandomItem(medications),
    dosage: overrides.dosage || `${Math.floor(Math.random() * 20) + 1}mg`,
    frequency: overrides.frequency || getRandomItem(frequencies),
    route: overrides.route || getRandomItem(routes),
    startDate: overrides.startDate || new Date().toISOString().split('T')[0],
  };
}

/**
 * Generate synthetic vital signs data
 */
export function generateVitalSignsData(overrides: Partial<{
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  painLevel: number;
}> = {}) {
  return {
    temperature: overrides.temperature || Math.round((Math.random() * 2 + 97) * 10) / 10,
    bloodPressureSystolic: overrides.bloodPressureSystolic || Math.floor(Math.random() * 40) + 100,
    bloodPressureDiastolic: overrides.bloodPressureDiastolic || Math.floor(Math.random() * 30) + 60,
    heartRate: overrides.heartRate || Math.floor(Math.random() * 40) + 60,
    respiratoryRate: overrides.respiratoryRate || Math.floor(Math.random() * 10) + 12,
    oxygenSaturation: overrides.oxygenSaturation || Math.floor(Math.random() * 5) + 95,
    painLevel: overrides.painLevel || Math.floor(Math.random() * 11),
  };
}

/**
 * Generate synthetic nursing note data
 */
export function generateNursingNoteData(overrides: Partial<{
  assessment: string;
  intervention: string;
  evaluation: string;
  plan: string;
}> = {}) {
  return {
    assessment: overrides.assessment || `Patient assessment conducted at ${new Date().toLocaleString()}. Patient appears comfortable.`,
    intervention: overrides.intervention || 'Provided comfort measures and medication as ordered.',
    evaluation: overrides.evaluation || 'Patient responded well to interventions. Pain level decreased.',
    plan: overrides.plan || 'Continue current care plan. Monitor for changes.',
  };
}

/**
 * Generate synthetic IDG meeting data
 */
export function generateIDGMeetingData(overrides: Partial<{
  date: string;
  attendees: string[];
  patientStatus: string;
  discussionPoints: string;
  actionItems: string;
}> = {}) {
  return {
    date: overrides.date || new Date().toISOString().split('T')[0],
    attendees: overrides.attendees || ['RN', 'MD', 'Social Worker', 'Chaplain'],
    patientStatus: overrides.patientStatus || 'Stable',
    discussionPoints: overrides.discussionPoints || 'Reviewed patient care plan, discussed symptom management.',
    actionItems: overrides.actionItems || 'Continue monitoring, follow up in 2 weeks.',
  };
}

/**
 * Generate a batch of patient data
 * @param count - Number of patients to generate
 */
export function generatePatientBatch(count: number) {
  return Array.from({ length: count }, () => generatePatientData());
}

/**
 * Generate a batch of user data
 * @param count - Number of users to generate
 */
export function generateUserBatch(count: number) {
  return Array.from({ length: count }, () => generateUserData());
}

/**
 * Generate strong password for testing
 */
export function generateStrongPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure it has at least one uppercase, lowercase, number, and special char
  return `Test@${password}123`;
}

/**
 * Wait for a specific amount of time
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
