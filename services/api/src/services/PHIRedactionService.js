/**
 * PHI/PII Redaction Service
 *
 * HIPAA-compliant service for redacting Protected Health Information (PHI)
 * and Personally Identifiable Information (PII) from data before logging.
 *
 * Based on HIPAA Safe Harbor de-identification method which requires
 * removal of 18 specific identifier types.
 */

import { logger } from '../utils/logger.js';

/**
 * HIPAA Safe Harbor 18 Identifiers plus additional PII fields
 */
const PHI_FIELD_PATTERNS = {
  // 1. Names
  names: [
    'name', 'firstName', 'first_name', 'lastName', 'last_name',
    'middleName', 'middle_name', 'fullName', 'full_name',
    'patientName', 'patient_name', 'username', 'displayName',
    'maidenName', 'maiden_name', 'nickname', 'alias',
  ],

  // 2. Geographic data smaller than state
  address: [
    'address', 'address1', 'address2', 'street', 'streetAddress',
    'street_address', 'city', 'county', 'zipCode', 'zip_code',
    'postalCode', 'postal_code', 'zip', 'neighborhood',
    'apartment', 'apt', 'suite', 'unit', 'building',
  ],

  // 3. Dates (except year) related to an individual
  dates: [
    'dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'birth_date',
    'deathDate', 'death_date', 'dateOfDeath', 'date_of_death',
    'admissionDate', 'admission_date', 'dischargeDate', 'discharge_date',
    'serviceDate', 'service_date', 'visitDate', 'visit_date',
    'birthdate', 'birthday',
  ],

  // 4. Phone numbers
  phone: [
    'phone', 'phoneNumber', 'phone_number', 'telephone', 'tel',
    'mobile', 'mobileNumber', 'mobile_number', 'cell', 'cellPhone',
    'fax', 'faxNumber', 'fax_number', 'homePhone', 'workPhone',
    'emergencyPhone', 'emergency_phone', 'contactPhone',
  ],

  // 5. Fax numbers (covered in phone)

  // 6. Email addresses
  email: [
    'email', 'emailAddress', 'email_address', 'mail',
    'e_mail', 'contactEmail', 'contact_email',
  ],

  // 7. Social Security numbers
  ssn: [
    'ssn', 'socialSecurityNumber', 'social_security_number',
    'socialSecurity', 'social_security', 'taxId', 'tax_id',
    'taxIdentifier', 'sin', 'nationalId', 'national_id',
  ],

  // 8. Medical record numbers
  mrn: [
    'mrn', 'medicalRecordNumber', 'medical_record_number',
    'medicalRecord', 'medical_record', 'chartNumber', 'chart_number',
    'patientNumber', 'patient_number', 'accountNumber', 'account_number',
  ],

  // 9. Health plan beneficiary numbers
  healthPlan: [
    'healthPlanId', 'health_plan_id', 'insuranceId', 'insurance_id',
    'memberId', 'member_id', 'subscriberId', 'subscriber_id',
    'groupNumber', 'group_number', 'policyNumber', 'policy_number',
    'beneficiaryId', 'beneficiary_id', 'medicaidId', 'medicareId',
  ],

  // 10. Account numbers
  account: [
    'bankAccount', 'bank_account', 'accountNum', 'account_num',
    'creditCard', 'credit_card', 'cardNumber', 'card_number',
    'routingNumber', 'routing_number', 'checkNumber', 'check_number',
  ],

  // 11. Certificate/license numbers
  certificate: [
    'licenseNumber', 'license_number', 'driverLicense', 'driver_license',
    'certificateNumber', 'certificate_number', 'npi', 'dea',
    'stateLicense', 'state_license', 'professionalLicense',
  ],

  // 12. Vehicle identifiers
  vehicle: [
    'vin', 'vehicleId', 'vehicle_id', 'licensePlate', 'license_plate',
    'vehicleNumber', 'vehicle_number', 'plateNumber', 'plate_number',
  ],

  // 13. Device identifiers
  device: [
    'deviceId', 'device_id', 'serialNumber', 'serial_number',
    'imei', 'macAddress', 'mac_address', 'deviceSerial',
  ],

  // 14. URLs
  url: [
    'personalUrl', 'personal_url', 'websiteUrl', 'website_url',
    'homepage', 'personalWebsite', 'personal_website',
  ],

  // 15. IP addresses
  // Note: IP addresses are kept for audit purposes but should be handled carefully
  ip: [
    'ipAddress', 'ip_address', 'clientIp', 'client_ip',
    'sourceIp', 'source_ip', 'remoteAddress', 'remote_address',
  ],

  // 16. Biometric identifiers
  biometric: [
    'fingerprint', 'voicePrint', 'voice_print', 'retinaScan',
    'retina_scan', 'faceId', 'face_id', 'biometricId', 'biometric_id',
  ],

  // 17. Photos
  photo: [
    'photo', 'image', 'picture', 'avatar', 'profilePhoto',
    'profile_photo', 'headshot', 'faceImage', 'face_image',
  ],

  // 18. Any other unique identifying number
  other: [
    'uniqueId', 'unique_id', 'identifier', 'id_number',
    'externalId', 'external_id', 'legacyId', 'legacy_id',
  ],

  // Additional security-sensitive fields
  security: [
    'password', 'passwordHash', 'password_hash', 'secret',
    'apiKey', 'api_key', 'accessToken', 'access_token',
    'refreshToken', 'refresh_token', 'privateKey', 'private_key',
    'secretKey', 'secret_key', 'encryptionKey', 'encryption_key',
    'pin', 'securityCode', 'security_code', 'cvv', 'cvc',
  ],

  // Medical information
  medical: [
    'diagnosis', 'diagnoses', 'condition', 'conditions',
    'medication', 'medications', 'drug', 'drugs',
    'treatment', 'treatments', 'procedure', 'procedures',
    'symptom', 'symptoms', 'allergy', 'allergies',
    'medicalHistory', 'medical_history', 'clinicalNote', 'clinical_note',
    'labResult', 'lab_result', 'testResult', 'test_result',
  ],
};

/**
 * Regex patterns for detecting PHI in string values
 */
const PHI_VALUE_PATTERNS = {
  // SSN: XXX-XX-XXXX or XXXXXXXXX
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Phone: Various formats
  phone: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Email
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Credit card: Major card formats
  creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,

  // IP address (v4)
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

  // Date patterns (MM/DD/YYYY, YYYY-MM-DD, etc.)
  date: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,

  // ZIP code
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,

  // MRN patterns (usually 6-10 digits, sometimes with prefix)
  mrn: /\b(?:MRN|MR|PT)?[-:\s]?\d{6,10}\b/gi,
};

/**
 * Flatten all PHI field patterns into a single array
 */
const ALL_PHI_FIELDS = Object.values(PHI_FIELD_PATTERNS).flat();

/**
 * Create a Set for O(1) lookups (case-insensitive)
 */
const PHI_FIELD_SET = new Set(ALL_PHI_FIELDS.map(f => f.toLowerCase()));

class PHIRedactionService {
  constructor() {
    this.redactionPlaceholder = '[REDACTED]';
    this.maxDepth = 15;
    this.stats = {
      totalRedactions: 0,
      fieldRedactions: 0,
      patternRedactions: 0,
    };
  }

  /**
   * Check if a field name should be redacted
   * @param {string} fieldName - Name of the field
   * @returns {boolean}
   */
  shouldRedactField(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
      return false;
    }

    const lowerField = fieldName.toLowerCase();

    // Direct match
    if (PHI_FIELD_SET.has(lowerField)) {
      return true;
    }

    // Partial match (field contains PHI pattern)
    for (const phiField of PHI_FIELD_SET) {
      if (lowerField.includes(phiField) || phiField.includes(lowerField)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Redact PHI patterns from a string value
   * @param {string} value - String to scan for PHI
   * @returns {string} Redacted string
   */
  redactStringPatterns(value) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    let redacted = value;
    let hadRedaction = false;

    // Apply each pattern
    for (const [patternName, pattern] of Object.entries(PHI_VALUE_PATTERNS)) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;

      if (pattern.test(redacted)) {
        pattern.lastIndex = 0;
        redacted = redacted.replace(pattern, `[${patternName.toUpperCase()}_REDACTED]`);
        hadRedaction = true;
      }
    }

    if (hadRedaction) {
      this.stats.patternRedactions++;
    }

    return redacted;
  }

  /**
   * Recursively redact PHI/PII from an object
   * @param {*} data - Data to redact
   * @param {number} depth - Current recursion depth
   * @param {Set} seen - Set of seen objects (circular reference detection)
   * @returns {*} Redacted data
   */
  redact(data, depth = 0, seen = new Set()) {
    // Prevent infinite recursion
    if (depth > this.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    // Handle null/undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Handle primitives
    if (typeof data !== 'object') {
      // Scan strings for PHI patterns
      if (typeof data === 'string') {
        return this.redactStringPatterns(data);
      }
      return data;
    }

    // Circular reference detection
    if (seen.has(data)) {
      return '[CIRCULAR_REFERENCE]';
    }
    seen.add(data);

    // Handle Date objects
    if (data instanceof Date) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.redact(item, depth + 1, seen));
    }

    // Handle objects
    const redacted = {};

    for (const [key, value] of Object.entries(data)) {
      // Check if field should be redacted
      if (this.shouldRedactField(key)) {
        redacted[key] = this.redactionPlaceholder;
        this.stats.fieldRedactions++;
        this.stats.totalRedactions++;
        continue;
      }

      // Recursively process nested objects
      if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redact(value, depth + 1, seen);
      } else if (typeof value === 'string') {
        // Scan string values for PHI patterns
        redacted[key] = this.redactStringPatterns(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Safe redact that catches errors
   * @param {*} data - Data to redact
   * @returns {*} Redacted data or original on error
   */
  safeRedact(data) {
    try {
      return this.redact(data);
    } catch (error) {
      logger.error('PHI redaction error', { error: error.message });
      // On error, return a safe placeholder rather than potentially exposing PHI
      return { _redactionError: true };
    }
  }

  /**
   * Redact specific fields from an object (whitelist approach)
   * Only keeps specified safe fields, redacts everything else
   * @param {Object} data - Data to process
   * @param {string[]} safeFields - Fields that are safe to keep
   * @returns {Object} Object with only safe fields
   */
  keepOnlySafeFields(data, safeFields) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const safeFieldSet = new Set(safeFields.map(f => f.toLowerCase()));
    const result = {};

    for (const [key, value] of Object.entries(data)) {
      if (safeFieldSet.has(key.toLowerCase())) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Create audit-safe metadata from a record
   * Keeps only non-PHI fields for audit logging
   * @param {Object} data - Record data
   * @returns {Object} Safe metadata for audit
   */
  createAuditMetadata(data) {
    // Fields that are safe to include in audit logs
    const safeFields = [
      'id', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
      'status', 'type', 'category', 'action', 'version',
      'isActive', 'is_active', 'isDeleted', 'is_deleted',
      'facility_id', 'facilityId', 'organization_id', 'organizationId',
    ];

    return this.keepOnlySafeFields(data, safeFields);
  }

  /**
   * Get redaction statistics
   * @returns {Object} Redaction stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRedactions: 0,
      fieldRedactions: 0,
      patternRedactions: 0,
    };
  }

  /**
   * Check if a value contains potential PHI
   * @param {string} value - Value to check
   * @returns {boolean}
   */
  containsPHI(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }

    for (const pattern of Object.values(PHI_VALUE_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all PHI field patterns (for external use)
   * @returns {Object}
   */
  getFieldPatterns() {
    return { ...PHI_FIELD_PATTERNS };
  }

  /**
   * Get all value patterns (for external use)
   * @returns {Object}
   */
  getValuePatterns() {
    return { ...PHI_VALUE_PATTERNS };
  }
}

// Export singleton instance
export const phiRedactionService = new PHIRedactionService();

// Export class for testing
export { PHIRedactionService };

// Export convenience functions
export const redact = (data) => phiRedactionService.safeRedact(data);
export const shouldRedactField = (field) => phiRedactionService.shouldRedactField(field);
export const containsPHI = (value) => phiRedactionService.containsPHI(value);
export const createAuditMetadata = (data) => phiRedactionService.createAuditMetadata(data);

export default phiRedactionService;
