/**
 * ICD-10 Code Service
 * TICKET #014: Custom ICD-10 lookup service
 *
 * Replaces the icd10-api package which had unfixable axios vulnerabilities.
 * Provides ICD-10 code validation and lookup functionality.
 *
 * Future enhancements:
 * - Import ICD-10 codes into database
 * - Full-text search capabilities
 * - Code hierarchy navigation
 */

import { db } from '../config/db.drizzle.js';

/**
 * ICD-10 Service
 * Provides validation and lookup for ICD-10 diagnosis codes
 */
class ICD10Service {
  /**
   * Validate ICD-10 code format
   * ICD-10 codes follow the pattern: Letter + 2 digits + optional decimal + 1-2 digits
   * Examples: A00, A00.0, A00.01, Z99.89
   *
   * @param {string} code - ICD-10 code to validate
   * @returns {boolean} - True if code matches ICD-10 format
   */
  validateFormat(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // ICD-10 format: Letter + 2 digits + optional (. + 1-2 digits)
    // Examples: A00, A00.0, A00.01, Z99.89
    const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,2})?$/;
    return icd10Pattern.test(code.trim().toUpperCase());
  }

  /**
   * Normalize ICD-10 code to uppercase
   *
   * @param {string} code - ICD-10 code
   * @returns {string} - Normalized code
   */
  normalize(code) {
    if (!code || typeof code !== 'string') {
      return '';
    }
    return code.trim().toUpperCase();
  }

  /**
   * Search ICD-10 codes
   * NOTE: This is a placeholder implementation
   * Future: Implement database lookup when ICD-10 codes are imported
   *
   * @param {string} query - Search query (code or description)
   * @param {number} limit - Max results (default: 20)
   * @returns {Promise<Array>} - Array of matching ICD-10 codes
   */
  async search(query, limit = 20) {
    // TODO: Implement database search when ICD-10 codes table is created
    // For now, return empty array with validation
    if (!query || typeof query !== 'string') {
      return [];
    }

    // Future implementation will query icd10Codes table:
    /*
    const searchTerm = `%${query.trim()}%`;
    const results = await db.select()
      .from(icd10Codes)
      .where(or(
        like(icd10Codes.code, searchTerm),
        like(icd10Codes.description, searchTerm)
      ))
      .limit(limit);
    return results;
    */

    return [];
  }

  /**
   * Get ICD-10 code details by code
   * NOTE: This is a placeholder implementation
   * Future: Implement database lookup when ICD-10 codes are imported
   *
   * @param {string} code - ICD-10 code
   * @returns {Promise<Object|null>} - Code details or null if not found
   */
  async getByCode(code) {
    // TODO: Implement database lookup when ICD-10 codes table is created
    if (!this.validateFormat(code)) {
      return null;
    }

    const normalizedCode = this.normalize(code);

    // Future implementation will query icd10Codes table:
    /*
    const result = await db.select()
      .from(icd10Codes)
      .where(eq(icd10Codes.code, normalizedCode))
      .limit(1);
    return result.length > 0 ? result[0] : null;
    */

    return null;
  }

  /**
   * Validate and sanitize an array of ICD-10 codes
   *
   * @param {Array<string>} codes - Array of ICD-10 codes
   * @returns {Object} - { valid: Array, invalid: Array }
   */
  validateCodes(codes) {
    if (!Array.isArray(codes)) {
      return { valid: [], invalid: [] };
    }

    const valid = [];
    const invalid = [];

    for (const code of codes) {
      if (this.validateFormat(code)) {
        valid.push(this.normalize(code));
      } else {
        invalid.push(code);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get ICD-10 code category (first letter indicates category)
   *
   * @param {string} code - ICD-10 code
   * @returns {string|null} - Category description or null
   */
  getCategory(code) {
    if (!this.validateFormat(code)) {
      return null;
    }

    const firstLetter = code.charAt(0).toUpperCase();

    // ICD-10 category mapping
    const categories = {
      'A': 'Certain infectious and parasitic diseases (A00-B99)',
      'B': 'Certain infectious and parasitic diseases (A00-B99)',
      'C': 'Neoplasms (C00-D49)',
      'D': 'Diseases of the blood and blood-forming organs (D50-D89)',
      'E': 'Endocrine, nutritional and metabolic diseases (E00-E89)',
      'F': 'Mental, Behavioral and Neurodevelopmental disorders (F01-F99)',
      'G': 'Diseases of the nervous system (G00-G99)',
      'H': 'Diseases of the eye and ear (H00-H95)',
      'I': 'Diseases of the circulatory system (I00-I99)',
      'J': 'Diseases of the respiratory system (J00-J99)',
      'K': 'Diseases of the digestive system (K00-K95)',
      'L': 'Diseases of the skin and subcutaneous tissue (L00-L99)',
      'M': 'Diseases of the musculoskeletal system (M00-M99)',
      'N': 'Diseases of the genitourinary system (N00-N99)',
      'O': 'Pregnancy, childbirth and the puerperium (O00-O9A)',
      'P': 'Certain conditions originating in perinatal period (P00-P96)',
      'Q': 'Congenital malformations and chromosomal abnormalities (Q00-Q99)',
      'R': 'Symptoms, signs and abnormal findings (R00-R99)',
      'S': 'Injury, poisoning and external causes (S00-T88)',
      'T': 'Injury, poisoning and external causes (S00-T88)',
      'V': 'External causes of morbidity (V00-Y99)',
      'W': 'External causes of morbidity (V00-Y99)',
      'X': 'External causes of morbidity (V00-Y99)',
      'Y': 'External causes of morbidity (V00-Y99)',
      'Z': 'Factors influencing health status (Z00-Z99)'
    };

    return categories[firstLetter] || 'Unknown category';
  }
}

// Export singleton instance
export default new ICD10Service();
