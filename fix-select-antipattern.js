import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of files to process (from grep results)
const filesToProcess = [
  'src/controllers/patient/VitalSigns.controller.js',
  'src/controllers/patient/VisitInformation.controller.js',
  'src/controllers/patient/SpiritualPreference.controller.js',
  'src/controllers/patient/Signature.controller.js',
  'src/controllers/patient/Select.controller.js',
  'src/controllers/patient/RaceEthnicity.controller.js',
  'src/controllers/patient/Prognosis.controller.js',
  'src/controllers/patient/PrimaryDiagnosis.controller.js',
  'src/controllers/patient/PatientPharmacy.controller.js',
  'src/controllers/patient/PatientIdentifiers.controller.js',
  'src/controllers/patient/Pain/PainAssessment.controller.js',
  'src/controllers/patient/Nutrition.controller.js',
  'src/controllers/patient/NursingClinicalNote.controller.js',
  'src/controllers/patient/LivingArrangements.controller.js',
  'src/controllers/patient/LiaisonSecondary.controller.js',
  'src/controllers/patient/LiaisonPrimary.controller.js',
  'src/controllers/patient/IntegumentaryAssessment.controller.js',
  'src/controllers/patient/HematologicalAssessment.controller.js',
  'src/controllers/patient/EndocrineAssessment.controller.js',
  'src/controllers/patient/EmergencyPreparednessLevel.controller.js',
  'src/controllers/patient/Dnr.controller.js',
  'src/controllers/patient/Discharge.controller.js',
  'src/controllers/patient/CardiacAssessment.controller.js',
  'src/controllers/patient/BenefitPeriod.controller.js',
  'src/controllers/patient/AdmissionInformation.controller.js',
  'src/controllers/Role.controller.js',
  'src/controllers/Permission.controller.js',
  'src/controllers/IDGMeeting.controller.js',
  'src/controllers/HOPEAssessment.controller.js',
  'src/controllers/Encounter.controller.js',
  'src/controllers/Clearinghouse.controller.js',
  'src/controllers/Auth.controller.js',
  'src/services/DenialCodes.service.js',
  'src/services/CBSALookupService.js',
  'src/services/AuditService.js',
  'src/utils/errorHandler.js',
  'src/console/commands/MakeUserCommand.js',
  'src/config/db.config.js'
];

// Schema column mappings for common tables
const schemaColumns = {
  'patients': ['id', 'first_name', 'last_name', 'middle_name', 'mi', 'preferred_name', 'suffix', 'date_of_birth', 'gender', 'oxygen_dependent', 'patient_consents', 'hipaa_received', 'veterans_status', 'patient_pharmacy_id', 'primary_diagnosis_id', 'race_ethnicity_id', 'dme_provider', 'liaison_primary_id', 'liaison_secondary_id', 'dnr_id', 'emergency_preparedness_level_id', 'patient_identifier_id', 'createdAt', 'updatedAt'],
  'users': ['id', 'name', 'firstName', 'lastName', 'email', 'image', 'emailVerified', 'role', 'contact', 'createdAt', 'updatedAt'],
  'roles': ['id', 'name', 'guard_name', 'createdAt', 'updatedAt'],
  'permissions': ['id', 'name', 'guard_name', 'createdAt', 'updatedAt']
};

// Sensitive columns to EXCLUDE from list views (but include in detail views)
const sensitiveColumns = {
  'patients': ['ssn'],
  'users': ['password', 'remember_token'],
  'payer_information': ['social_security', 'medicare_beneficiary', 'medicaid_number']
};

function analyzeFile(filePath) {
  console.log(`\nAnalyzing: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');

  // Find all instances of .select().from(
  const selectPattern = /\.select\(\)\.from\(/g;
  const matches = content.match(selectPattern);

  if (matches) {
    console.log(`  Found ${matches.length} instance(s) of .select().from(`);
  } else {
    console.log(`  No instances found`);
  }
}

// Analyze all files
console.log('='.repeat(60));
console.log('ANALYZING FILES FOR SELECT * ANTI-PATTERN');
console.log('='.repeat(60));

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    analyzeFile(filePath);
  } else {
    console.log(`\nFile not found: ${file}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));
console.log('\nTo fix these files, you need to:');
console.log('1. Identify the schema used in each file');
console.log('2. Replace .select().from(table) with .select({ col1: table.col1, ... })');
console.log('3. For list views: exclude sensitive columns');
console.log('4. For detail/check views: include all columns or minimal columns');
