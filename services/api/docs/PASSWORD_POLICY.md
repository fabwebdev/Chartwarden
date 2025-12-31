# Password Policy Documentation

**Implemented**: December 28, 2025
**Phase**: 0 - Critical Security Fixes
**Ticket**: #006
**HIPAA**: §164.308(a)(5)(ii)(D) - Password Management

## Overview

A comprehensive password policy has been implemented to protect against weak passwords, common passwords, and breached passwords. This ensures that user accounts are secured with strong, unique credentials.

## Password Requirements

### 1. Minimum Length: 12 Characters

All passwords must be at least 12 characters long.

**Rationale:** NIST SP 800-63B recommends minimum 8 characters, but for healthcare applications handling PHI, we require 12 characters for enhanced security.

### 2. Complexity: 3 of 4 Character Types

Passwords must contain at least **3 of the following 4** character types:

- ✅ Lowercase letters (a-z)
- ✅ Uppercase letters (A-Z)
- ✅ Numbers (0-9)
- ✅ Special characters (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Examples:**
- ✅ `MyP@ssw0rd123` - Valid (has lowercase, uppercase, special, numbers)
- ✅ `SecurePass!456` - Valid (has lowercase, uppercase, special, numbers)
- ✅ `STRONG-PASS-999` - Valid (has uppercase, special, numbers)
- ❌ `mypassword123` - Invalid (only lowercase & numbers, missing 3rd type)
- ❌ `MyPassword` - Invalid (only lowercase & uppercase, missing 3rd type)

### 3. Password Strength: Score 3/4

Passwords are evaluated using **zxcvbn**, an industry-standard password strength estimator.

**Strength Scores:**
- 0 = Too weak (rejected)
- 1 = Weak (rejected)
- 2 = Fair (rejected)
- 3 = Strong (✅ accepted)
- 4 = Very strong (✅ accepted)

The algorithm analyzes:
- Common patterns (e.g., "qwerty", "12345")
- Keyboard patterns (e.g., "asdfgh")
- Repeated characters (e.g., "aaaa")
- Dictionary words
- L33t speak substitutions
- Dates and sequences

### 4. Breached Password Checking

All passwords are checked against the **HaveIBeenPwned** database of 850+ million breached passwords.

**How it works:**
1. Password is hashed with SHA-1
2. Only first 5 characters of hash are sent to API (k-anonymity model)
3. API returns list of matching hash suffixes
4. Password is rejected if found in breach database

**Privacy:**
- ✅ Full password never sent to external service
- ✅ Only 5-character hash prefix transmitted
- ✅ No personally identifiable information exposed

**Example:**
```
Password: "password123"
SHA-1 Hash: 482c811da5d5b4bc6d497ffa98491e38
Sent to API: 482c8 (first 5 chars only)
Result: Found in 2,390,152 breaches → REJECTED
```

### 5. Common Password Blocking

Top 100+ most common passwords are explicitly blocked, including:
- `password`, `123456`, `qwerty`, `letmein`
- `admin`, `welcome`, `password123`, `P@ssw0rd`
- And many more...

Even with complexity requirements, some common patterns are blocked.

## Implementation

### Backend Validation

Password validation occurs during:
- **User signup** (`POST /api/auth/sign-up`)
- **Password reset** (future implementation)
- **Password change** (future implementation)

### Validation Response

**Success (password accepted):**
```json
{
  "status": 201,
  "message": "User created successfully",
  "user": { "id": "123", "email": "user@example.com" }
}
```

**Failure (weak password):**
```json
{
  "status": 422,
  "message": "Password does not meet security requirements",
  "errors": [
    {
      "type": "field",
      "msg": "Password must be at least 12 characters",
      "path": "password",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Password must contain at least 3 of the following: lowercase letters (a-z), uppercase letters (A-Z), numbers (0-9), special characters (!@#$%^&*)",
      "path": "password",
      "location": "body"
    }
  ],
  "suggestions": [
    "Add numbers (0-9) or special characters (!@#$%^&*)",
    "Avoid sequences of characters"
  ],
  "strength": {
    "score": 2,
    "crackTime": "3 hours"
  }
}
```

**Failure (breached password):**
```json
{
  "status": 422,
  "message": "Password does not meet security requirements",
  "errors": [
    {
      "type": "field",
      "msg": "This password has been exposed in 2,390,152 data breaches. Please choose a different password.",
      "path": "password",
      "location": "body"
    }
  ],
  "suggestions": [],
  "strength": {
    "score": 2,
    "crackTime": "3 hours"
  }
}
```

## Frontend Integration

### Password Strength Indicator

Recommend implementing a real-time password strength indicator:

```javascript
import zxcvbn from 'zxcvbn';

function PasswordStrengthMeter({ password }) {
  const result = zxcvbn(password);

  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const strengthColors = ['red', 'orange', 'yellow', 'lightgreen', 'green'];

  return (
    <div>
      <div className="strength-bar" style={{
        width: `${(result.score / 4) * 100}%`,
        backgroundColor: strengthColors[result.score]
      }} />
      <p>{strengthLabels[result.score]}</p>
      <p>Time to crack: {result.crack_times_display.offline_slow_hashing_1e4_per_second}</p>
      {result.feedback.warning && <p>⚠️ {result.feedback.warning}</p>}
      {result.feedback.suggestions.map(s => <p key={s}>💡 {s}</p>)}
    </div>
  );
}
```

### Signup Form Validation

```javascript
async function handleSignup(email, password, firstName, lastName) {
  try {
    const response = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName })
    });

    if (response.status === 422) {
      const error = await response.json();

      // Display errors to user
      error.errors.forEach(err => {
        showError(err.msg);
      });

      // Display suggestions
      error.suggestions.forEach(suggestion => {
        showSuggestion(suggestion);
      });

      // Show strength info
      showStrength(error.strength.score, error.strength.crackTime);

      return false;
    }

    return true;
  } catch (error) {
    console.error('Signup error:', error);
    return false;
  }
}
```

## Testing

### Test Valid Passwords

```bash
# Test strong password (should succeed)
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "MySecure!Pass2024",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test Weak Passwords

```bash
# Too short (should fail)
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Short!1"}'

# No complexity (should fail)
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "alllowercase"}'

# Common password (should fail)
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'

# Breached password (should fail)
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Unit Tests

```javascript
import { validatePassword, checkComplexity, checkStrength } from '../utils/passwordSecurity.js';

describe('Password Validation', () => {
  it('should reject passwords shorter than 12 characters', async () => {
    const result = await validatePassword('Short!1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 12 characters');
  });

  it('should reject passwords without complexity', async () => {
    const result = await validatePassword('alllowercase123');
    expect(result.valid).toBe(false);
  });

  it('should reject common passwords', async () => {
    const result = await validatePassword('Password123!');
    expect(result.valid).toBe(false);
  });

  it('should accept strong passwords', async () => {
    const result = await validatePassword('MySecure!Pass2024');
    expect(result.valid).toBe(true);
  });
});
```

## Password Generation

For admins creating accounts, use the secure password generator:

```javascript
import { generateStrongPassword } from '../utils/passwordSecurity.js';

// Generate a 16-character strong password
const password = generateStrongPassword(16);
console.log(password); // e.g., "aB3!xY7&mQ2$nR9@"

// Generate a 20-character strong password
const longerPassword = generateStrongPassword(20);
```

## Compliance

### HIPAA §164.308(a)(5)(ii)(D)

✅ **Password Management Procedures**

Requirements:
- Procedures for creating, changing, and safeguarding passwords

Implementation:
- Minimum 12 characters
- Complexity requirements enforced
- Breached password checking
- Common password blocking
- Password strength validation

**Evidence:**
- `src/utils/passwordSecurity.js` - Password validation implementation
- `src/config/betterAuth.js:58` - minPasswordLength: 12
- `src/routes/auth.routes.js:53-84` - Password validation in signup

### NIST SP 800-63B

✅ **Password Composition and Complexity Rules**

NIST Recommendations:
- Minimum 8 characters (we exceed with 12)
- Check against breach databases (we implement)
- No arbitrary complexity requirements that reduce security

Our Implementation:
- 12 character minimum (exceeds NIST)
- Breach checking via HaveIBeenPwned
- Smart complexity (3 of 4 types, not rigid requirements)
- Strength scoring with zxcvbn

## Troubleshooting

### "Password has been exposed in data breaches"

**Cause:** Password found in HaveIBeenPwned database

**Solution:**
1. Choose a completely different password
2. Use a password manager to generate unique password
3. Never reuse passwords from other sites

### "Could not verify against breach database"

**Cause:** HaveIBeenPwned API temporarily unavailable

**Impact:** Password validation continues without breach check (fail open for availability)

**Solution:** System will still validate other requirements. Consider retrying signup later.

### "Password is too weak"

**Cause:** Password strength score < 3/4

**Solution:**
1. Make password longer (16+ characters recommended)
2. Avoid common patterns and dictionary words
3. Use mix of character types
4. Avoid personal information (name, email, birthdate)

## Best Practices

### ✅ DO

- Use a password manager (1Password, LastPass, Bitwarden)
- Generate random passwords
- Use unique passwords for each account
- Make passwords 16+ characters when possible
- Include all 4 character types

### ❌ DON'T

- Reuse passwords across sites
- Use personal information (names, birthdates, etc.)
- Use common patterns (qwerty, 12345, etc.)
- Use dictionary words
- Write passwords down (use password manager instead)
- Share passwords

## Future Enhancements

- [ ] Password history (prevent reuse of last 5 passwords)
- [ ] Password expiration (90-180 days)
- [ ] MFA requirement for sensitive operations
- [ ] Account lockout after failed attempts
- [ ] Password reset via email with secure tokens

---

**Last Updated**: December 28, 2025
**Next Review**: March 28, 2026
