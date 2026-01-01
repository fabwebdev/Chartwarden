/**
 * Patient API Service
 * 
 * Comprehensive API service for all patient-related endpoints.
 * All routes are mounted under /api/patient and require authentication.
 * 
 * @see HOSPICE_ROUTES_COUNT.md for complete backend route documentation
 */

import http from 'hooks/useCookie';

// ==============================|| MAIN PATIENT ROUTES ||============================== //

/**
 * Test route - verify patient routes are working
 */
export const testPatientRoutes = async () => {
  const response = await http.get('/patient/test');
  return response.data;
};

/**
 * Get all patients
 * @requires Auth: Admin, Doctor, Nurse, Patient
 */
export const getAllPatients = async () => {
  const response = await http.get('/patient');
  return response.data;
};

/**
 * Get patient by ID
 * @requires Permission: VIEW_PATIENT
 */
export const getPatientById = async (id: string | number) => {
  const response = await http.get(`/patient/${id}`);
  return response.data;
};

/**
 * Create a new patient
 * @requires Auth: Doctor, Admin
 */
export const createPatient = async (patientData: any) => {
  const response = await http.post('/patient', patientData);
  return response.data;
};

/**
 * Update patient
 * @requires Permission: UPDATE_PATIENT
 */
export const updatePatient = async (id: string | number, patientData: any) => {
  const response = await http.put(`/patient/${id}`, patientData);
  return response.data;
};

/**
 * Delete patient
 * @requires Auth: Admin only
 */
export const deletePatient = async (id: string | number) => {
  const response = await http.delete(`/patient/${id}`);
  return response.data;
};

// ==============================|| ADMISSION INFORMATION ||============================== //

export const getAllAdmissions = async () => {
  const response = await http.get('/patient/admission');
  return response.data;
};

export const getAdmissionById = async (id: string | number) => {
  const response = await http.get(`/patient/admission/${id}`);
  return response.data;
};

export const autoSaveAdmission = async (admissionData: any) => {
  const response = await http.post('/patient/admission/admission/store', admissionData);
  return response.data;
};

// ==============================|| BENEFIT PERIOD ||============================== //
// NOTE: Benefit periods can be created by any authenticated user (no role check).
export const createBenefitPeriod = async (patientId: string | number) => {
  const response = await http.post(`/benefit-periods/patient/${patientId}/benefit-periods/create-next`);
  return response.data;
};

export const updateBenefitPeriod = async (id: string | number, benefitPeriodData: any) => {
  const response = await http.post(`/patient/benefit-period/update/${id}`, benefitPeriodData);
  return response.data;
};

export const getBenefitPeriodById = async (id: string | number) => {
  const response = await http.get(`/patient/benefit-period/${id}`);
  return response.data;
};

// ==============================|| CARDIAC ASSESSMENT ||============================== //

export const getCardiacAssessment = async (id: string | number) => {
  const response = await http.get(`/patient/cardiac-assessment/${id}`);
  return response.data;
};

export const getCardiacAssessmentByPatient = async (patientId: string | number, id: string | number) => {
  const response = await http.get(`/patient/cardiac-assessment/${patientId}/${id}`);
  return response.data;
};

export const storeCardiacAssessment = async (assessmentData: any) => {
  const response = await http.post('/patient/cardiac-assessment/store', assessmentData);
  return response.data;
};

export const getAllCardiacAssessmentsForPatient = async (patientId: string | number) => {
  const response = await http.get(`/patient/cardiac-assessment/${patientId}`);
  return response.data;
};

// ==============================|| DISCHARGE ||============================== //

export const getAllDischarges = async () => {
  const response = await http.get('/discharge');
  return response.data;
};

export const getDischargeList = async () => {
  const response = await http.get('/discharge-list');
  return response.data;
};

export const storeDischarge = async (dischargeData: any) => {
  const response = await http.post('/discharge/discharge/store', dischargeData);
  return response.data;
};

export const getDischargeById = async (id: string | number) => {
  const response = await http.get(`/discharge/discharge/${id}`);
  return response.data;
};

export const getDischargeSections = async () => {
  const response = await http.get('/discharge-sections');
  return response.data;
};

// ==============================|| DME PROVIDER ||============================== //

export const getAllDmeProviders = async () => {
  const response = await http.get('/dme-provider/providers');
  return response.data;
};

/**
 * Create DME provider
 * @param providerData - Object with name, address, and/or phone
 * @note At least one of name, address, or phone must be provided
 */
export const createDmeProvider = async (providerData: { name?: string; address?: string; phone?: string }) => {
  const response = await http.post('/dme-provider/providers/store', providerData);
  return response.data;
};

export const getDmeProviderById = async (id: string | number) => {
  const response = await http.get(`/dme-provider/providers/${id}`);
  return response.data;
};

export const updateDmeProvider = async (id: string | number, providerData: any) => {
  const response = await http.put(`/dme-provider/providers/update/${id}`, providerData);
  return response.data;
};

export const deleteDmeProvider = async (id: string | number) => {
  const response = await http.delete(`/dme-provider/providers/${id}`);
  return response.data;
};

// ==============================|| DNR ||============================== //

export const getAllDnrRecords = async () => {
  const response = await http.get('/dnr/dnr');
  return response.data;
};

/**
 * Create DNR record
 * @param dnrData - Object with dnr_status, dnr_date, and/or dnr_notes
 * @note At least one of dnr_status, dnr_date, or dnr_notes must be provided
 */
export const createDnrRecord = async (dnrData: { dnr_status?: string; dnr_date?: string; dnr_notes?: string }) => {
  const response = await http.post('/dnr/dnr/store', dnrData);
  return response.data;
};

export const getDnrRecordById = async (id: string | number) => {
  const response = await http.get(`/dnr/dnr/${id}`);
  return response.data;
};

export const updateDnrRecord = async (id: string | number, dnrData: any) => {
  const response = await http.put(`/dnr/dnr/${id}`, dnrData);
  return response.data;
};

export const deleteDnrRecord = async (id: string | number) => {
  const response = await http.delete(`/dnr/dnr/${id}`);
  return response.data;
};

// ==============================|| EMERGENCY PREPAREDNESS LEVEL ||============================== //

export const getAllEmergencyPreparednessLevels = async () => {
  const response = await http.get('/emergency-preparedness-level/emergencyPreparednessLevel');
  return response.data;
};

/**
 * Create emergency preparedness level
 * @param levelData - Object with level and/or description
 * @note At least one of level or description must be provided
 */
export const createEmergencyPreparednessLevel = async (levelData: { level?: string; description?: string }) => {
  const response = await http.post('/emergency-preparedness-level/emergencyPreparednessLevel/store', levelData);
  return response.data;
};

export const getEmergencyPreparednessLevelById = async (id: string | number) => {
  const response = await http.get(`/emergency-preparedness-level/emergencyPreparednessLevel/${id}`);
  return response.data;
};

export const updateEmergencyPreparednessLevel = async (id: string | number, levelData: any) => {
  const response = await http.put(`/emergency-preparedness-level/emergencyPreparednessLevel/${id}`, levelData);
  return response.data;
};

// ==============================|| ENDOCRINE ASSESSMENT ||============================== //

export const getEndocrineAssessment = async (id: string | number) => {
  const response = await http.get(`/patient/endocrine-assessment/${id}`);
  return response.data;
};

export const getEndocrineAssessmentByPatient = async (patientId: string | number, id: string | number) => {
  const response = await http.get(`/patient/endocrine-assessment/${patientId}/${id}`);
  return response.data;
};

export const storeEndocrineAssessment = async (assessmentData: any) => {
  const response = await http.post('/patient/endocrine-assessment/store', assessmentData);
  return response.data;
};

export const getAllEndocrineAssessmentsForPatient = async (patientId: string | number) => {
  const response = await http.get(`/patient/endocrine-assessment/${patientId}`);
  return response.data;
};

// ==============================|| HEMATOLOGICAL ASSESSMENT ||============================== //

export const getHematologicalAssessment = async (id: string | number) => {
  const response = await http.get(`/patient/hematological-assessment/${id}`);
  return response.data;
};

export const getHematologicalAssessmentByPatient = async (patientId: string | number, id: string | number) => {
  const response = await http.get(`/patient/hematological-assessment/${patientId}/${id}`);
  return response.data;
};

export const storeHematologicalAssessment = async (assessmentData: any) => {
  const response = await http.post('/patient/hematological-assessment/store', assessmentData);
  return response.data;
};

export const getAllHematologicalAssessmentsForPatient = async (patientId: string | number) => {
  const response = await http.get(`/patient/hematological-assessment/${patientId}`);
  return response.data;
};

// ==============================|| HIS PDF ||============================== //

export const generateHisPdf = async (params?: any) => {
  const response = await http.get('/his-pdf/generate-his-pdf', { params });
  return response.data;
};

// ==============================|| INTEGUMENTARY ASSESSMENT ||============================== //

export const getIntegumentaryAssessment = async (id: string | number) => {
  const response = await http.get(`/patient/integumentary-assessment/${id}`);
  return response.data;
};

export const getIntegumentaryAssessmentByPatient = async (patientId: string | number, id: string | number) => {
  const response = await http.get(`/patient/integumentary-assessment/${patientId}/${id}`);
  return response.data;
};

export const storeIntegumentaryAssessment = async (assessmentData: any) => {
  const response = await http.post('/patient/integumentary-assessment/store', assessmentData);
  return response.data;
};

export const getAllIntegumentaryAssessmentsForPatient = async (patientId: string | number) => {
  const response = await http.get(`/patient/integumentary-assessment/${patientId}`);
  return response.data;
};

// ==============================|| LIAISON PRIMARY ||============================== //

export const getAllLiaisonPrimary = async () => {
  const response = await http.get('/liaison-primary/liaisonPrimary');
  return response.data;
};

/**
 * Create liaison primary
 * @param liaisonData - Object with first_name, last_name, phone, email, and/or relationship
 * @note At least one field must be provided
 */
export const createLiaisonPrimary = async (liaisonData: { first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }) => {
  const response = await http.post('/liaison-primary/liaisonPrimary/store', liaisonData);
  return response.data;
};

export const getLiaisonPrimaryById = async (id: string | number) => {
  const response = await http.get(`/liaison-primary/liaisonPrimary/${id}`);
  return response.data;
};

export const updateLiaisonPrimary = async (id: string | number, liaisonData: any) => {
  const response = await http.put(`/liaison-primary/liaisonPrimary/${id}`, liaisonData);
  return response.data;
};

export const deleteLiaisonPrimary = async (id: string | number) => {
  const response = await http.delete(`/liaison-primary/liaisonPrimary/${id}`);
  return response.data;
};

// ==============================|| LIAISON SECONDARY ||============================== //

export const getAllLiaisonSecondary = async () => {
  const response = await http.get('/liaison-secondary/liaisonSecondary');
  return response.data;
};

/**
 * Create liaison secondary
 * @param liaisonData - Object with first_name, last_name, phone, email, and/or relationship
 * @note At least one field must be provided
 */
export const createLiaisonSecondary = async (liaisonData: { first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }) => {
  const response = await http.post('/liaison-secondary/liaisonSecondary/store', liaisonData);
  return response.data;
};

export const getLiaisonSecondaryById = async (id: string | number) => {
  const response = await http.get(`/liaison-secondary/liaisonSecondary/${id}`);
  return response.data;
};

export const updateLiaisonSecondary = async (id: string | number, liaisonData: any) => {
  const response = await http.put(`/liaison-secondary/liaisonSecondary/${id}`, liaisonData);
  return response.data;
};

export const deleteLiaisonSecondary = async (id: string | number) => {
  const response = await http.delete(`/liaison-secondary/liaisonSecondary/${id}`);
  return response.data;
};

// ==============================|| LIVING ARRANGEMENTS ||============================== //

export const getAllLivingArrangements = async () => {
  const response = await http.get('/patient/living-arrangements');
  return response.data;
};

export const createLivingArrangement = async (arrangementData: any) => {
  const response = await http.post('/patient/living-arrangements/store', arrangementData);
  return response.data;
};

export const getLivingArrangementById = async (id: string | number) => {
  const response = await http.get(`/patient/living-arrangements/${id}`);
  return response.data;
};

// ==============================|| NUTRITION ASSESSMENT ||============================== //

export const getNutritionProblemTypes = async () => {
  const response = await http.get('/nutrition-assessment/nutrition/problems-types');
  return response.data;
};

export const getNutritionAssessment = async (id: string | number) => {
  const response = await http.get(`/nutrition-assessment/nutrition/${id}`);
  return response.data;
};

export const autoSaveNutritionAssessment = async (id: string | number, assessmentData: any) => {
  const response = await http.post(`/nutrition-assessment/nutrition/${id}/auto-save`, assessmentData);
  return response.data;
};

// ==============================|| PAIN ASSESSMENT ||============================== //

// Pain Types
export const getBreakthroughPainTypes = async () => {
  const response = await http.get('/pain/pain-type/breakthrough');
  return response.data;
};

export const getPainCharacterTypes = async () => {
  const response = await http.get('/pain/pain-type/character');
  return response.data;
};

export const getPainFrequencyTypes = async () => {
  const response = await http.get('/pain/pain-type/frequency');
  return response.data;
};

export const getPainObservationTypes = async () => {
  const response = await http.get('/pain/pain-type/observation');
  return response.data;
};

export const getEffectsOnFunctionTypes = async () => {
  const response = await http.get('/pain/pain-type/effects-on-function');
  return response.data;
};

export const getRatingScaleUsedTypes = async () => {
  const response = await http.get('/pain/pain-type/rating-scale-used');
  return response.data;
};

export const getRatedByTypes = async () => {
  const response = await http.get('/pain/pain-type/rated-by');
  return response.data;
};

export const getWorsenedTypes = async () => {
  const response = await http.get('/pain/pain-type/worsened');
  return response.data;
};

export const getRelievedByTypes = async () => {
  const response = await http.get('/pain/pain-type/relieved-by');
  return response.data;
};

export const getDurationTypes = async () => {
  const response = await http.get('/pain/pain-type/duration');
  return response.data;
};

export const getNegativeVocalizationTypes = async () => {
  const response = await http.get('/pain/pain-type/negative-vocalization');
  return response.data;
};

export const getFacialExpressionTypes = async () => {
  const response = await http.get('/pain/pain-type/facial-expression');
  return response.data;
};

export const getBodyLanguageTypes = async () => {
  const response = await http.get('/pain/pain-type/body-language');
  return response.data;
};

export const getConsolabilityTypes = async () => {
  const response = await http.get('/pain/pain-type/consolability');
  return response.data;
};

export const getBreathingTypes = async () => {
  const response = await http.get('/pain/pain-type/breathing');
  return response.data;
};

export const getFaceTypes = async () => {
  const response = await http.get('/pain/pain-type/face');
  return response.data;
};

export const getLegsTypes = async () => {
  const response = await http.get('/pain/pain-type/legs');
  return response.data;
};

export const getActivityTypes = async () => {
  const response = await http.get('/pain/pain-type/activity');
  return response.data;
};

export const getCryTypes = async () => {
  const response = await http.get('/pain/pain-type/cry');
  return response.data;
};

export const getPainSeverityTypes = async () => {
  const response = await http.get('/pain/pain-type/pain-serverity');
  return response.data;
};

export const getStandardizedPainToolTypes = async () => {
  const response = await http.get('/pain/pain-type/standardized-pain-tool');
  return response.data;
};

export const getComprehensivePainIncludedTypes = async () => {
  const response = await http.get('/pain/pain-type/comprehensive-pain-included');
  return response.data;
};

// Pain Assessments
export const getAllPainAssessments = async () => {
  const response = await http.get('/pain/pain-assessment');
  return response.data;
};

export const getPainAssessmentById = async (id: string | number) => {
  const response = await http.get(`/pain/pain-assessment/${id}`);
  return response.data;
};

export const storePainAssessment = async (assessmentData: any) => {
  const response = await http.post('/pain/pain-assessment/store', assessmentData);
  return response.data;
};

// Pain Sub-Assessments - Store
export const storePainRatedBy = async (data: any) => {
  const response = await http.post('/pain/pain-rated-by/store', data);
  return response.data;
};

export const storePainDuration = async (data: any) => {
  const response = await http.post('/pain/pain-duration/store', data);
  return response.data;
};

export const storePainFrequency = async (data: any) => {
  const response = await http.post('/pain/pain-frequency/store', data);
  return response.data;
};

export const storePainObservation = async (data: any) => {
  const response = await http.post('/pain/pain-observation/store', data);
  return response.data;
};

export const storePainWorsenedBy = async (data: any) => {
  const response = await http.post('/pain/pain-worsened-by/store', data);
  return response.data;
};

export const storePainCharacter = async (data: any) => {
  const response = await http.post('/pain/pain-character/store', data);
  return response.data;
};

export const storePainRelievedBy = async (data: any) => {
  const response = await http.post('/pain/pain-relieved-by/store', data);
  return response.data;
};

export const storePainEffectsOnFunction = async (data: any) => {
  const response = await http.post('/pain/pain-effects-on-function/store', data);
  return response.data;
};

export const storePainBreakthrough = async (data: any) => {
  const response = await http.post('/pain/pain-breakthrough/store', data);
  return response.data;
};

export const storePainRatingScale = async (data: any) => {
  const response = await http.post('/pain/pain-rating-scale/store', data);
  return response.data;
};

export const storePainVitalSigns = async (data: any) => {
  const response = await http.post('/pain/pain-vital-signs/store', data);
  return response.data;
};

export const storeFlaccBehavioralPain = async (data: any) => {
  const response = await http.post('/pain/flacc-behavioral-pain/store', data);
  return response.data;
};

export const storePainScreening = async (data: any) => {
  const response = await http.post('/pain/pain-screening/store', data);
  return response.data;
};

export const storePainActiveProblem = async (data: any) => {
  const response = await http.post('/pain/pain-active-problem/store', data);
  return response.data;
};

// Pain Sub-Assessments - Get
export const getPainRatedBy = async (id: string | number) => {
  const response = await http.get(`/pain/pain-rated-by/${id}`);
  return response.data;
};

export const getPainDuration = async (id: string | number) => {
  const response = await http.get(`/pain/pain-duration/${id}`);
  return response.data;
};

export const getPainFrequency = async (id: string | number) => {
  const response = await http.get(`/pain/pain-frequency/${id}`);
  return response.data;
};

export const getPainObservation = async (id: string | number) => {
  const response = await http.get(`/pain/pain-observation/${id}`);
  return response.data;
};

export const getPainWorsenedBy = async (id: string | number) => {
  const response = await http.get(`/pain/pain-worsened-by/${id}`);
  return response.data;
};

export const getPainCharacter = async (id: string | number) => {
  const response = await http.get(`/pain/pain-character/${id}`);
  return response.data;
};

export const getPainRelievedBy = async (id: string | number) => {
  const response = await http.get(`/pain/pain-relieved-by/${id}`);
  return response.data;
};

export const getPainEffectsOnFunction = async (id: string | number) => {
  const response = await http.get(`/pain/pain-effects-on-function/${id}`);
  return response.data;
};

export const getPainBreakthrough = async (id: string | number) => {
  const response = await http.get(`/pain/pain-breakthrough/${id}`);
  return response.data;
};

export const getPainRatingScale = async (id: string | number) => {
  const response = await http.get(`/pain/pain-rating-scale/${id}`);
  return response.data;
};

export const getPainVitalSigns = async (id: string | number) => {
  const response = await http.get(`/pain/pain-vital-signs/${id}`);
  return response.data;
};

export const getFlaccBehavioralPain = async (id: string | number) => {
  const response = await http.get(`/pain/flacc-behavioral-pain/${id}`);
  return response.data;
};

export const getPainScreening = async (id: string | number) => {
  const response = await http.get(`/pain/pain-screening/${id}`);
  return response.data;
};

export const getPainActiveProblem = async (id: string | number) => {
  const response = await http.get(`/pain/pain-active-problem/${id}`);
  return response.data;
};

// Additional Pain Assessment Routes
export const storePainAssessmentInDementiaScale = async (data: any) => {
  const response = await http.post('/pain/pain-assessment-in-dementia-scale/store', data);
  return response.data;
};

export const getPainAssessmentInDementiaScale = async (id: string | number) => {
  const response = await http.get(`/pain/pain-assessment-in-dementia-scale/${id}`);
  return response.data;
};

export const storeComprehensivePainAssessment = async (data: any) => {
  const response = await http.post('/pain/comprehensive-pain-assessment/store', data);
  return response.data;
};

export const getComprehensivePainAssessment = async (id: string | number) => {
  const response = await http.get(`/pain/comprehensive-pain-assessment/${id}`);
  return response.data;
};

export const storePainSummaryInterventionsGoals = async (data: any) => {
  const response = await http.post('/pain/pain-summary-interventions-goals/store', data);
  return response.data;
};

export const getPainSummaryInterventionsGoals = async (id: string | number) => {
  const response = await http.get(`/pain/pain-summary-interventions-goals/${id}`);
  return response.data;
};

// ==============================|| PATIENT IDENTIFIERS ||============================== //

export const getAllPatientIdentifiers = async () => {
  const response = await http.get('/patient/patient-identifiers');
  return response.data;
};

export const createPatientIdentifier = async (identifierData: any) => {
  const response = await http.post('/patient/patient-identifiers/store', identifierData);
  return response.data;
};

export const getPatientIdentifierById = async (id: string | number) => {
  const response = await http.get(`/patient/patient-identifiers/${id}`);
  return response.data;
};

// ==============================|| PATIENT PHARMACY ||============================== //

export const getAllPatientPharmacies = async () => {
  const response = await http.get('/patient/patientPharmacy');
  return response.data;
};

export const createPatientPharmacy = async (pharmacyData: any) => {
  const response = await http.post('/patient/patientPharmacy/store', pharmacyData);
  return response.data;
};

export const getPatientPharmacyById = async (id: string | number) => {
  const response = await http.get(`/patient/patientPharmacy/${id}`);
  return response.data;
};

export const updatePatientPharmacy = async (id: string | number, pharmacyData: any) => {
  const response = await http.put(`/patient/patientPharmacy/update/${id}`, pharmacyData);
  return response.data;
};

export const deletePatientPharmacy = async (id: string | number) => {
  const response = await http.delete(`/patient/patientPharmacy/${id}`);
  return response.data;
};

// ==============================|| PAYER INFORMATION ||============================== //

export const storePayerInformation = async (payerData: any) => {
  const response = await http.post('/patient/payer-information/store', payerData);
  return response.data;
};

export const getPayerInformationById = async (id: string | number) => {
  const response = await http.get(`/patient/payer-information/${id}`);
  return response.data;
};

// ==============================|| PRIMARY DIAGNOSIS ||============================== //

export const getAllPrimaryDiagnoses = async () => {
  const response = await http.get('/patient/primaryDiagnosis');
  return response.data;
};

/**
 * Search primary diagnoses by query
 * @param query - Search term to match against diagnosis_code and diagnosis_description
 * @returns Response with structure: { count, data, query }
 */
export const searchPrimaryDiagnoses = async (query: string) => {
  const response = await http.get('/primary-diagnosis/primaryDiagnosis/search', {
    params: { query }
  });
  return response.data;
};

/**
 * Create primary diagnosis
 * @param diagnosisData - Object with diagnosis_code and diagnosis_description
 * @note Backend expects diagnosis_code and diagnosis_description fields
 */
export const createPrimaryDiagnosis = async (diagnosisData: { diagnosis_code?: string; diagnosis_description?: string }) => {
  const response = await http.post('/patient/primaryDiagnosis/store', diagnosisData);
  return response.data;
};

export const getPrimaryDiagnosisById = async (id: string | number) => {
  const response = await http.get(`/patient/primaryDiagnosis/${id}`);
  return response.data;
};

export const updatePrimaryDiagnosis = async (id: string | number, diagnosisData: any) => {
  const response = await http.put(`/patient/primaryDiagnosis/update/${id}`, diagnosisData);
  return response.data;
};

export const deletePrimaryDiagnosis = async (id: string | number) => {
  const response = await http.delete(`/patient/primaryDiagnosis/${id}`);
  return response.data;
};

// ==============================|| PROGNOSIS ||============================== //

export const getAllPrognoses = async () => {
  const response = await http.get('/prognosis/prognosis');
  return response.data;
};

export const createPrognosis = async (prognosisData: any) => {
  const response = await http.post('/prognosis/prognosis/store', prognosisData);
  return response.data;
};

export const getPrognosisById = async (id: string | number) => {
  const response = await http.get(`/prognosis/prognosis/${id}`);
  return response.data;
};

// ==============================|| RACE ETHNICITY ||============================== //

export const getAllRaceEthnicities = async () => {
  const response = await http.get('/patient/raceEthnicity');
  return response.data;
};

/**
 * Create race/ethnicity record
 * @param raceEthnicityData - Object with race (required) and ethnicity (optional)
 * @note At least one of race or ethnicity must be provided
 */
export const createRaceEthnicity = async (raceEthnicityData: { race: string; ethnicity?: string }) => {
  const response = await http.post('/patient/raceEthnicity/store', raceEthnicityData);
  return response.data;
};

export const getRaceEthnicityById = async (id: string | number) => {
  const response = await http.get(`/patient/raceEthnicity/${id}`);
  return response.data;
};

export const updateRaceEthnicity = async (id: string | number, raceEthnicityData: any) => {
  const response = await http.put(`/patient/raceEthnicity/${id}`, raceEthnicityData);
  return response.data;
};

export const deleteRaceEthnicity = async (id: string | number) => {
  const response = await http.delete(`/patient/raceEthnicity/${id}`);
  return response.data;
};

// ==============================|| SELECT OPTIONS ||============================== //

/**
 * Get race/ethnicity options from the new options endpoint
 * Returns: { races, detailedRaces, ethnicities, supportsMultiple }
 */
export const getRaceEthnicityOptions = async () => {
  const response = await http.get('/race-ethnicity/raceEthnicity/options');
  return response.data;
};

/**
 * @deprecated Use getRaceEthnicityOptions instead
 * Old endpoint - kept for backward compatibility if needed
 */
export const getRaceEthnicitySelectOptions = async () => {
  const response = await http.get('/patient/select/race-ethnicity');
  return response.data;
};

export const getPrimaryDiagnosisOptions = async () => {
  const response = await http.get('/patient/select/primary-diagnosis');
  return response.data;
};

export const getDmeProviderOptions = async () => {
  const response = await http.get('/patient/select/dme-provider');
  return response.data;
};

export const getLiaisonPrimaryOptions = async () => {
  const response = await http.get('/patient/select/liaison-primary');
  return response.data;
};

export const getLiaisonSecondaryOptions = async () => {
  const response = await http.get('/patient/select/liaison-secondary');
  return response.data;
};

export const getNutritionTemplate = async () => {
  const response = await http.get('/patient/nutrition-template');
  return response.data;
};

export const getNutritionProblem = async () => {
  const response = await http.get('/patient/nutrition-problem');
  return response.data;
};

// ==============================|| SIGNATURE ||============================== //

export const storeSignature = async (signatureData: any) => {
  const response = await http.post('/patient/signature/store', signatureData);
  return response.data;
};

export const getSignatureById = async (id: string | number) => {
  const response = await http.get(`/patient/signature/${id}`);
  return response.data;
};

// ==============================|| SPIRITUAL PREFERENCE ||============================== //

export const getAllSpiritualPreferences = async () => {
  const response = await http.get('/patient/spiritual-preference');
  return response.data;
};

export const createSpiritualPreference = async (preferenceData: any) => {
  const response = await http.post('/patient/spiritual-preference/store', preferenceData);
  return response.data;
};

export const getSpiritualPreferenceById = async (id: string | number) => {
  const response = await http.get(`/patient/spiritual-preference/${id}`);
  return response.data;
};

// ==============================|| VISIT INFORMATION ||============================== //

export const storeVisitInformation = async (visitData: any) => {
  const response = await http.post('/patient/visit-information/store', visitData);
  return response.data;
};

export const getVisitInformationById = async (id: string | number) => {
  const response = await http.get(`/patient/visit-information/${id}`);
  return response.data;
};

// ==============================|| VITAL SIGNS ||============================== //

export const getAllVitalSigns = async () => {
  const response = await http.get('/vital-signs/vital-signs');
  return response.data;
};

export const storeVitalSigns = async (vitalSignsData: any) => {
  const response = await http.post('/vital-signs/vital-signs/store', vitalSignsData);
  return response.data;
};

export const getVitalSignsById = async (id: string | number) => {
  const response = await http.get(`/vital-signs/vital-signs/${id}`);
  return response.data;
};

/**
 * Get vital signs for a specific patient with pagination
 * @param patientId - Patient ID
 * @param options - Query options (limit, offset, from_date, to_date, abnormal_only)
 */
export const getPatientVitalSigns = async (
  patientId: string | number,
  options?: {
    limit?: number;
    offset?: number;
    from_date?: string;
    to_date?: string;
    abnormal_only?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) => {
  const params: any = {};
  if (options?.limit) params.limit = options.limit;
  if (options?.offset) params.offset = options.offset;
  if (options?.from_date) params.from_date = options.from_date;
  if (options?.to_date) params.to_date = options.to_date;
  if (options?.abnormal_only !== undefined) params.abnormal_only = options.abnormal_only ? 'true' : 'false';
  if (options?.sortBy) params.sortBy = options.sortBy;
  if (options?.sortOrder) params.sortOrder = options.sortOrder;

  const response = await http.get(`/patients/${patientId}/vital-signs`, { params });
  return response.data;
};

/**
 * Get latest vital signs for a patient
 */
export const getPatientLatestVitalSigns = async (patientId: string | number) => {
  const response = await http.get(`/patients/${patientId}/vital-signs/latest`);
  return response.data;
};

/**
 * Get vital signs trend data for charting
 * @param patientId - Patient ID
 * @param options - Query options (from_date, to_date, vital_type)
 */
export const getPatientVitalSignsTrend = async (
  patientId: string | number,
  options?: {
    from_date?: string;
    to_date?: string;
    vital_type?: string;
  }
) => {
  const params: any = {};
  if (options?.from_date) params.from_date = options.from_date;
  if (options?.to_date) params.to_date = options.to_date;
  if (options?.vital_type) params.vital_type = options.vital_type;

  const response = await http.get(`/patients/${patientId}/vital-signs/trend`, { params });
  return response.data;
};

/**
 * Get vital signs statistics for a patient
 * @param patientId - Patient ID
 * @param options - Query options (from_date, to_date)
 */
export const getPatientVitalSignsStats = async (
  patientId: string | number,
  options?: {
    from_date?: string;
    to_date?: string;
  }
) => {
  const params: any = {};
  if (options?.from_date) params.from_date = options.from_date;
  if (options?.to_date) params.to_date = options.to_date;

  const response = await http.get(`/patients/${patientId}/vital-signs/stats`, { params });
  return response.data;
};

/**
 * Create vital signs for a patient
 */
export const createPatientVitalSigns = async (patientId: string | number, vitalSignsData: any) => {
  const response = await http.post(`/patients/${patientId}/vital-signs`, vitalSignsData);
  return response.data;
};

/**
 * Update vital signs (partial update)
 */
export const updateVitalSigns = async (id: string | number, vitalSignsData: any) => {
  const response = await http.patch(`/vital-signs/${id}`, vitalSignsData);
  return response.data;
};

/**
 * Delete vital signs (soft delete)
 */
export const deleteVitalSigns = async (id: string | number) => {
  const response = await http.delete(`/vital-signs/${id}`);
  return response.data;
};

/**
 * Get vital signs reference information (validation metadata)
 */
export const getVitalSignsReference = async () => {
  const response = await http.get('/vital-signs/reference');
  return response.data;
};

// ==============================|| PATIENT CONTACTS ||============================== //

/**
 * Get all contacts for a patient
 * @param patientId - Patient ID
 * @param type - Optional filter by contact type
 */
export const getPatientContacts = async (patientId: string | number, type?: string) => {
  const params = type ? { type } : {};
  const response = await http.get(`/patients/${patientId}/contacts`, { params });
  return response.data;
};

/**
 * Get emergency contacts for a patient
 */
export const getPatientEmergencyContacts = async (patientId: string | number) => {
  const response = await http.get(`/patients/${patientId}/emergency-contacts`);
  return response.data;
};

/**
 * Get a specific contact
 */
export const getPatientContact = async (patientId: string | number, contactId: string | number) => {
  const response = await http.get(`/patients/${patientId}/contacts/${contactId}`);
  return response.data;
};

/**
 * Create a new patient contact
 */
export const createPatientContact = async (patientId: string | number, contactData: any) => {
  const response = await http.post(`/patients/${patientId}/contacts`, contactData);
  return response.data;
};

/**
 * Update a patient contact
 */
export const updatePatientContact = async (patientId: string | number, contactId: string | number, contactData: any) => {
  const response = await http.put(`/patients/${patientId}/contacts/${contactId}`, contactData);
  return response.data;
};

/**
 * Delete a patient contact (soft delete)
 */
export const deletePatientContact = async (patientId: string | number, contactId: string | number) => {
  const response = await http.delete(`/patients/${patientId}/contacts/${contactId}`);
  return response.data;
};

/**
 * Set a contact as primary
 */
export const setPatientContactPrimary = async (patientId: string | number, contactId: string | number) => {
  const response = await http.post(`/patients/${patientId}/contacts/${contactId}/set-primary`);
  return response.data;
};

// ==============================|| PATIENT ADDRESSES ||============================== //

/**
 * Get all addresses for a patient
 * @param patientId - Patient ID
 * @param type - Optional filter by address type (PRIMARY, BILLING, MAILING, FACILITY, TEMPORARY)
 */
export const getPatientAddresses = async (patientId: string | number, type?: string) => {
  const params = type ? { type } : {};
  const response = await http.get(`/patients/${patientId}/addresses`, { params });
  return response.data;
};

/**
 * Get a specific address
 */
export const getPatientAddress = async (patientId: string | number, addressId: string | number) => {
  const response = await http.get(`/patients/${patientId}/addresses/${addressId}`);
  return response.data;
};

/**
 * Create a new patient address
 */
export const createPatientAddress = async (patientId: string | number, addressData: any) => {
  const response = await http.post(`/patients/${patientId}/addresses`, addressData);
  return response.data;
};

/**
 * Update a patient address
 */
export const updatePatientAddress = async (patientId: string | number, addressId: string | number, addressData: any) => {
  const response = await http.put(`/patients/${patientId}/addresses/${addressId}`, addressData);
  return response.data;
};

/**
 * Delete a patient address (soft delete)
 */
export const deletePatientAddress = async (patientId: string | number, addressId: string | number) => {
  const response = await http.delete(`/patients/${patientId}/addresses/${addressId}`);
  return response.data;
};

/**
 * Set an address as primary for its type
 */
export const setPatientAddressPrimary = async (patientId: string | number, addressId: string | number) => {
  const response = await http.post(`/patients/${patientId}/addresses/${addressId}/set-primary`);
  return response.data;
};

// ==============================|| PATIENT PAYERS ||============================== //

/**
 * Get all payers for a patient
 * @param patientId - Patient ID
 * @param options - Optional filters (type, active_only, primary_only)
 */
export const getPatientPayers = async (patientId: string | number, options?: { type?: string; active_only?: boolean; primary_only?: boolean }) => {
  const params: any = {};
  if (options?.type) params.type = options.type;
  if (options?.active_only !== undefined) params.active_only = options.active_only ? 'true' : 'false';
  if (options?.primary_only !== undefined) params.primary_only = options.primary_only ? 'true' : 'false';
  const response = await http.get(`/patients/${patientId}/payers`, { params });
  return response.data;
};

/**
 * Get the primary payer for a patient
 */
export const getPatientPrimaryPayer = async (patientId: string | number) => {
  const response = await http.get(`/patients/${patientId}/payers/primary`);
  return response.data;
};

/**
 * Get a specific payer
 */
export const getPatientPayer = async (patientId: string | number, payerId: string | number) => {
  const response = await http.get(`/patients/${patientId}/payers/${payerId}`);
  return response.data;
};

/**
 * Create a new patient payer
 */
export const createPatientPayer = async (patientId: string | number, payerData: any) => {
  const response = await http.post(`/patients/${patientId}/payers`, payerData);
  return response.data;
};

/**
 * Update a patient payer
 */
export const updatePatientPayer = async (patientId: string | number, payerId: string | number, payerData: any) => {
  const response = await http.put(`/patients/${patientId}/payers/${payerId}`, payerData);
  return response.data;
};

/**
 * Delete a patient payer (soft delete)
 */
export const deletePatientPayer = async (patientId: string | number, payerId: string | number) => {
  const response = await http.delete(`/patients/${patientId}/payers/${payerId}`);
  return response.data;
};

/**
 * Set a payer as primary
 */
export const setPatientPayerPrimary = async (patientId: string | number, payerId: string | number) => {
  const response = await http.post(`/patients/${patientId}/payers/${payerId}/set-primary`);
  return response.data;
};

/**
 * Verify payer eligibility
 */
export const verifyPatientPayer = async (patientId: string | number, payerId: string | number, verificationData: any) => {
  const response = await http.post(`/patients/${patientId}/payers/${payerId}/verify`, verificationData);
  return response.data;
};

/**
 * Reorder payers for coordination of benefits
 */
export const reorderPatientPayers = async (patientId: string | number, payerOrders: Array<{ id: number; order: number }>) => {
  const response = await http.post(`/patients/${patientId}/payers/reorder`, { payer_orders: payerOrders });
  return response.data;
};

