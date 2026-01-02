// =============================================================================
// HTML Sanitization Utility Tests
// =============================================================================
// Comprehensive test suite for XSS prevention in nursing notes
// =============================================================================

/**
 * @jest-environment node
 */

import {
  sanitizeHtml,
  validateSafeHtml,
  sanitizeNursingNoteFields,
  getWordCount,
  getCharacterCount,
  getEstimatedReadingTime,
} from '../sanitize';

describe('sanitizeHtml', () => {
  describe('XSS Attack Prevention', () => {
    it('should remove script tags', () => {
      const malicious = '<p>Hello <script>alert("XSS")</script> World</p>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove javascript: protocol in attributes', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('onclick');
    });

    it('should remove iframe tags', () => {
      const malicious = '<p>Text <iframe src="evil.com"></iframe> More text</p>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('iframe');
    });

    it('should remove object and embed tags', () => {
      const malicious = '<object data="evil.swf"></object><embed src="evil.swf">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('object');
      expect(result).not.toContain('embed');
    });

    it('should remove data:text/html URIs', () => {
      const malicious = '<a href="data:text/html,<script>alert(\'XSS\')</script>">Link</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('data:text/html');
    });

    it('should remove vbscript: protocol', () => {
      const malicious = '<a href="vbscript:msgbox(\'XSS\')">Click</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('vbscript:');
    });

    it('should remove meta tags', () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=evil.com">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('meta');
    });

    it('should remove link tags', () => {
      const malicious = '<link rel="stylesheet" href="evil.css">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('link');
    });

    it('should remove style tags', () => {
      const malicious = '<style>body { background: url("javascript:alert(\'XSS\')") }</style>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<style>');
    });
  });

  describe('CSS Injection Prevention', () => {
    it('should remove CSS expressions', () => {
      const malicious = '<div style="width: expression(alert(\'XSS\'))">Text</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('expression');
    });

    it('should remove CSS imports', () => {
      const malicious = '<div style="background: url(\'javascript:alert(1)\')">Text</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe CSS properties', () => {
      const safe = '<p style="color: red; text-align: center;">Text</p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('color: red');
      expect(result).toContain('text-align: center');
    });

    it('should remove dangerous CSS properties', () => {
      const malicious = '<div style="behavior: url(evil.htc)">Text</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('behavior');
    });
  });

  describe('Allowed HTML Tags', () => {
    it('should preserve safe formatting tags', () => {
      const safe = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should preserve headings', () => {
      const safe = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });

    it('should preserve lists', () => {
      const safe = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should preserve underline and strikethrough', () => {
      const safe = '<p><u>Underlined</u> and <s>strikethrough</s></p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<u>');
      expect(result).toContain('<s>');
    });

    it('should preserve code and mark tags', () => {
      const safe = '<p><code>code</code> and <mark>highlighted</mark></p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<code>');
      expect(result).toContain('<mark>');
    });

    it('should preserve blockquote', () => {
      const safe = '<blockquote>Quote</blockquote>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<blockquote>');
    });

    it('should preserve horizontal rules', () => {
      const safe = '<p>Text</p><hr><p>More text</p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('<hr>');
    });
  });

  describe('Attribute Filtering', () => {
    it('should preserve class attributes', () => {
      const safe = '<p class="clinical-note">Text</p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('class="clinical-note"');
    });

    it('should preserve data-* attributes by default', () => {
      const safe = '<div data-note-id="123">Text</div>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('data-note-id="123"');
    });

    it('should remove data-* attributes when disabled', () => {
      const safe = '<div data-note-id="123">Text</div>';
      const result = sanitizeHtml(safe, { allowDataAttributes: false });
      expect(result).not.toContain('data-note-id');
    });

    it('should remove unknown attributes', () => {
      const malicious = '<p custom-attr="value">Text</p>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('custom-attr');
    });

    it('should preserve table attributes', () => {
      const safe = '<table><tr><td colspan="2">Cell</td></tr></table>';
      const result = sanitizeHtml(safe);
      expect(result).toContain('colspan="2"');
    });
  });

  describe('Options', () => {
    it('should strip all HTML when stripAll is true', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(html, { stripAll: true });
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<');
    });

    it('should respect maxLength option', () => {
      const html = '<p>This is a very long text that should be truncated</p>';
      const result = sanitizeHtml(html, { maxLength: 20 });
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should preserve line breaks when stripping HTML', () => {
      const html = '<p>Line 1</p><p>Line 2</p>';
      const result = sanitizeHtml(html, { stripAll: true, preserveLineBreaks: true });
      expect(result).toContain('\n');
    });

    it('should not preserve line breaks when disabled', () => {
      const html = '<p>Line 1</p><p>Line 2</p>';
      const result = sanitizeHtml(html, { stripAll: true, preserveLineBreaks: false });
      expect(result).toBe('Line 1Line 2');
    });

    it('should allow additional tags', () => {
      const html = '<article>Content</article>';
      const result = sanitizeHtml(html, { additionalAllowedTags: ['article'] });
      expect(result).toContain('<article>');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should handle plain text without HTML', () => {
      const text = 'Plain text without HTML';
      expect(sanitizeHtml(text)).toBe(text);
    });

    it('should handle malformed HTML gracefully', () => {
      const malformed = '<p>Unclosed paragraph';
      const result = sanitizeHtml(malformed);
      expect(result).toBeTruthy();
    });

    it('should handle nested tags', () => {
      const nested = '<div><p><strong><em>Deep nesting</em></strong></p></div>';
      const result = sanitizeHtml(nested);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should trim whitespace', () => {
      const html = '  <p>Text</p>  ';
      const result = sanitizeHtml(html);
      expect(result).not.toMatch(/^\s+/);
      expect(result).not.toMatch(/\s+$/);
    });
  });
});

describe('validateSafeHtml', () => {
  it('should validate safe HTML as valid', () => {
    const safe = '<p><strong>Safe content</strong></p>';
    const result = validateSafeHtml(safe);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect script tags as error', () => {
    const malicious = '<script>alert("XSS")</script>';
    const result = validateSafeHtml(malicious);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect javascript: protocol as error', () => {
    const malicious = '<a href="javascript:alert(1)">Link</a>';
    const result = validateSafeHtml(malicious);
    expect(result.isValid).toBe(false);
  });

  it('should warn about unbalanced tags', () => {
    const unbalanced = '<p>Text <strong>Bold';
    const result = validateSafeHtml(unbalanced);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should warn about excessive nesting', () => {
    const deep = '<div>'.repeat(25) + 'Content' + '</div>'.repeat(25);
    const result = validateSafeHtml(deep);
    expect(result.warnings.some(w => w.includes('nesting'))).toBe(true);
  });

  it('should handle empty HTML', () => {
    const result = validateSafeHtml('');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('sanitizeNursingNoteFields', () => {
  it('should sanitize multiple fields in note object', () => {
    const note = {
      content: '<p>Content <script>alert(1)</script></p>',
      subjective: '<p>Subjective <script>alert(2)</script></p>',
      objective: '<p>Safe objective</p>',
      otherField: 'Not HTML',
    };

    const result = sanitizeNursingNoteFields(note);

    expect(result.content).not.toContain('<script>');
    expect(result.subjective).not.toContain('<script>');
    expect(result.objective).toContain('<p>');
    expect(result.otherField).toBe('Not HTML');
  });

  it('should sanitize custom field list', () => {
    const note = {
      customField: '<script>alert(1)</script>',
      normalField: 'text',
    };

    const result = sanitizeNursingNoteFields(note, ['customField']);

    expect(result.customField).not.toContain('<script>');
    expect(result.normalField).toBe('text');
  });

  it('should handle notes with missing fields', () => {
    const note = {
      content: '<p>Content</p>',
    };

    const result = sanitizeNursingNoteFields(note);

    expect(result.content).toContain('<p>');
    expect(result).not.toHaveProperty('subjective');
  });

  it('should preserve non-string fields', () => {
    const note = {
      content: '<p>Content</p>',
      noteId: 123,
      isActive: true,
      metadata: { key: 'value' },
    };

    const result = sanitizeNursingNoteFields(note);

    expect(result.noteId).toBe(123);
    expect(result.isActive).toBe(true);
    expect(result.metadata).toEqual({ key: 'value' });
  });
});

describe('Text Analysis Functions', () => {
  describe('getWordCount', () => {
    it('should count words in plain text', () => {
      const html = '<p>One two three four five</p>';
      expect(getWordCount(html)).toBe(5);
    });

    it('should ignore HTML tags', () => {
      const html = '<p>One <strong>two</strong> <em>three</em></p>';
      expect(getWordCount(html)).toBe(3);
    });

    it('should handle empty content', () => {
      expect(getWordCount('')).toBe(0);
      expect(getWordCount('<p></p>')).toBe(0);
    });

    it('should count hyphenated words as one', () => {
      const html = '<p>well-documented pre-existing</p>';
      expect(getWordCount(html)).toBe(2);
    });
  });

  describe('getCharacterCount', () => {
    it('should count characters excluding HTML tags', () => {
      const html = '<p>Hello</p>';
      expect(getCharacterCount(html)).toBe(5);
    });

    it('should count spaces', () => {
      const html = '<p>Hello World</p>';
      expect(getCharacterCount(html)).toBe(11);
    });

    it('should handle empty content', () => {
      expect(getCharacterCount('')).toBe(0);
    });

    it('should exclude HTML entities', () => {
      const html = '<p>Text with &lt;tags&gt;</p>';
      const count = getCharacterCount(html);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('getEstimatedReadingTime', () => {
    it('should estimate reading time based on word count', () => {
      const words = Array(400).fill('word').join(' ');
      const html = `<p>${words}</p>`;
      const time = getEstimatedReadingTime(html);
      expect(time).toBe(2); // 400 words / 200 wpm = 2 minutes
    });

    it('should round up to nearest minute', () => {
      const words = Array(250).fill('word').join(' ');
      const html = `<p>${words}</p>`;
      const time = getEstimatedReadingTime(html);
      expect(time).toBe(2); // 250 words / 200 wpm = 1.25, rounds up to 2
    });

    it('should return 0 for empty content', () => {
      expect(getEstimatedReadingTime('')).toBe(0);
    });

    it('should handle short content', () => {
      const html = '<p>Short text</p>';
      const time = getEstimatedReadingTime(html);
      expect(time).toBe(1); // Always at least 1 minute if there's content
    });
  });
});

describe('Clinical Documentation Scenarios', () => {
  it('should preserve SOAP note formatting', () => {
    const soap = `
      <h3>Subjective</h3>
      <p>Patient reports <strong>shortness of breath</strong></p>
      <h3>Objective</h3>
      <ul>
        <li>BP: 140/90</li>
        <li>HR: 88 bpm</li>
      </ul>
      <h3>Assessment</h3>
      <p>Possible respiratory infection</p>
      <h3>Plan</h3>
      <ol>
        <li>Order chest X-ray</li>
        <li>Start antibiotics</li>
      </ol>
    `;

    const result = sanitizeHtml(soap);
    expect(result).toContain('<h3>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>');
  });

  it('should preserve medication lists', () => {
    const meds = `
      <p><strong>Current Medications:</strong></p>
      <ul>
        <li>Aspirin 81mg - <em>once daily</em></li>
        <li>Lisinopril 10mg - <em>once daily</em></li>
      </ul>
    `;

    const result = sanitizeHtml(meds);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('<em>');
  });

  it('should preserve vital signs tables', () => {
    const vitals = `
      <table>
        <tr>
          <th>Vital</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>BP</td>
          <td>120/80</td>
        </tr>
      </table>
    `;

    const result = sanitizeHtml(vitals);
    expect(result).toContain('<table>');
    expect(result).toContain('<tr>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
  });

  it('should sanitize complete nursing note', () => {
    const note = {
      content: '<p>Patient assessment complete</p>',
      subjective: '<p>Patient complains of <strong>headache</strong></p>',
      objective: '<p>Alert and oriented x3</p>',
      assessment: '<p>Mild dehydration suspected</p>',
      plan: '<ol><li>Increase fluids</li><li>Monitor symptoms</li></ol>',
      interventions: '<p>Administered <strong>500ml NS IV</strong></p>',
      patientResponse: '<p>Patient reports <em>improvement</em> after 30 minutes</p>',
      patientEducation: '<p>Educated on <u>hydration importance</u></p>',
      communication: '<p>Reported to physician Dr. Smith</p>',
    };

    const result = sanitizeNursingNoteFields(note);

    Object.values(result).forEach(value => {
      if (typeof value === 'string') {
        expect(value).not.toContain('<script>');
        expect(value).not.toContain('javascript:');
        expect(value).not.toContain('onclick');
      }
    });
  });
});
