# OpenAPI/Swagger Specification Guide

This guide explains how to use the OpenAPI specification for the Hospice EHR API.

---

## 📄 Files

- **`docs/openapi.yaml`** - Complete OpenAPI 3.0 specification
- **`docs/swagger-ui.html`** - Interactive API documentation viewer
- **`docs/API_CERTIFICATIONS_MEDICATIONS.md`** - Human-readable API documentation

---

## 🚀 Quick Start

### Method 1: View in Browser (Recommended)

Open the Swagger UI viewer:

```bash
# Navigate to docs directory
cd docs

# Open in browser (macOS)
open swagger-ui.html

# Open in browser (Linux)
xdg-open swagger-ui.html

# Open in browser (Windows)
start swagger-ui.html
```

### Method 2: Swagger Editor Online

1. Go to https://editor.swagger.io
2. Click **File** → **Import file**
3. Select `docs/openapi.yaml`
4. View and edit the spec in the browser

### Method 3: VS Code Extension

1. Install "Swagger Viewer" extension
2. Open `docs/openapi.yaml` in VS Code
3. Press `Shift+Alt+P` (Windows/Linux) or `Shift+Option+P` (macOS)
4. Select "Preview Swagger"

### Method 4: Local Swagger UI Server

```bash
# Using npx (no installation needed)
npx swagger-ui-watcher docs/openapi.yaml

# Or install globally
npm install -g swagger-ui-watcher
swagger-ui-watcher docs/openapi.yaml

# Will open browser at http://localhost:8000
```

---

## 🎯 What You Can Do With OpenAPI

### 1. Generate Client Libraries

Generate API client code in various languages:

#### JavaScript/TypeScript
```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o src/generated/api-client

# Usage in your app
import { CertificationsApi } from './generated/api-client';

const api = new CertificationsApi();
const certs = await api.getPatientCertifications(1);
```

#### Python
```bash
# Generate Python client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python \
  -o clients/python

# Usage in Python
from openapi_client import CertificationsApi, Configuration

config = Configuration(access_token="your_token")
api = CertificationsApi()
certs = api.get_patient_certifications(patient_id=1)
```

#### Java
```bash
# Generate Java client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g java \
  -o clients/java
```

#### Other Languages
- C#
- Go
- Ruby
- PHP
- Swift
- Kotlin
- And 50+ more...

### 2. Generate Server Stubs

Create server boilerplate code:

```bash
# Node.js Express server
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g nodejs-express-server \
  -o server-stub

# Python Flask server
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python-flask \
  -o server-stub
```

### 3. API Testing

Use with testing tools:

#### Postman
1. Open Postman
2. Click **Import**
3. Select **Link** tab
4. Paste: `file:///path/to/docs/openapi.yaml`
5. Complete collection automatically created

#### Insomnia
1. Open Insomnia
2. Click **Import/Export**
3. Select **Import Data** → **From File**
4. Choose `docs/openapi.yaml`

#### Paw (macOS)
1. Open Paw
2. File → Import
3. Select `docs/openapi.yaml`

### 4. Mock API Server

Create a mock server for testing:

```bash
# Using Prism (recommended)
npm install -g @stoplight/prism-cli

# Start mock server
prism mock docs/openapi.yaml

# Server running at http://127.0.0.1:4010
# Test: curl http://127.0.0.1:4010/patients/1/certifications
```

### 5. API Documentation Sites

Generate beautiful documentation:

#### ReDoc
```bash
# Install
npm install -g redoc-cli

# Generate standalone HTML
redoc-cli bundle docs/openapi.yaml -o docs/api-documentation.html

# Open in browser
open docs/api-documentation.html
```

#### Docusaurus
```bash
# Add to Docusaurus site
npm install docusaurus-plugin-openapi-docs

# Configure in docusaurus.config.js
```

### 6. Contract Testing

Ensure API matches specification:

```bash
# Using Dredd
npm install -g dredd

# Test API against OpenAPI spec
dredd docs/openapi.yaml http://localhost:3000/api
```

---

## 📊 OpenAPI Specification Structure

### Overview

```yaml
openapi: 3.0.3           # OpenAPI version
info:                    # API metadata
  title: ...
  version: ...
  description: ...
servers:                 # API servers (dev, staging, prod)
  - url: ...
security:                # Global security requirements
  - BearerAuth: []
tags:                    # Endpoint grouping
  - name: ...
paths:                   # API endpoints
  /patients/{id}:
    get: ...
    post: ...
components:              # Reusable schemas
  securitySchemes: ...
  schemas: ...
  responses: ...
```

### Key Sections

#### 1. Info
- API title and description
- Version number
- Contact information
- License

#### 2. Servers
- Development: `http://localhost:3000/api`
- Staging: `https://staging-api.hospice-ehr.com/api`
- Production: `https://api.hospice-ehr.com/api`

#### 3. Security
- Bearer token authentication
- JWT format
- Required on all endpoints

#### 4. Tags (7 groups)
- Certifications
- Face-to-Face Encounters
- Orders
- Medications
- MAR
- Comfort Kits
- Medication Reconciliation

#### 5. Paths (21 endpoints)
Each endpoint includes:
- HTTP method
- Path with parameters
- Request body schema
- Response schemas
- Examples
- Descriptions

#### 6. Components
Reusable schemas:
- Data models (Certification, Medication, etc.)
- Common responses (Error, Success)
- Request/response objects
- Enumerations (statuses, types)

---

## 🔍 Validation & Linting

### Validate OpenAPI Spec

```bash
# Using Swagger CLI
npm install -g @apidevtools/swagger-cli
swagger-cli validate docs/openapi.yaml

# Using OpenAPI CLI
npm install -g @redocly/openapi-cli
openapi lint docs/openapi.yaml
```

### Common Validation Checks
- ✅ Syntax correctness
- ✅ Schema compliance
- ✅ Reference integrity
- ✅ Example validity
- ✅ Best practices

---

## 📝 Editing the Specification

### Recommended Editors

1. **Swagger Editor** (Online)
   - https://editor.swagger.io
   - Real-time validation
   - Preview documentation

2. **VS Code** (Desktop)
   - Install "OpenAPI (Swagger) Editor" extension
   - Syntax highlighting
   - Auto-completion
   - Inline validation

3. **IntelliJ IDEA** (Desktop)
   - Built-in OpenAPI support
   - Refactoring tools
   - Code generation

### Adding a New Endpoint

1. **Add to `paths` section:**
```yaml
paths:
  /your-new-endpoint:
    post:
      tags:
        - YourTag
      summary: Brief description
      operationId: yourOperationId
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/YourSchema'
      responses:
        '201':
          description: Success
```

2. **Add schema to `components`:**
```yaml
components:
  schemas:
    YourSchema:
      type: object
      required:
        - field1
      properties:
        field1:
          type: string
```

3. **Validate:**
```bash
swagger-cli validate docs/openapi.yaml
```

---

## 🛠️ Tools & Resources

### Official Tools
- **Swagger Editor**: https://editor.swagger.io
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **OpenAPI Generator**: https://openapi-generator.tech
- **Redoc**: https://redoc.ly

### VS Code Extensions
- OpenAPI (Swagger) Editor
- Swagger Viewer
- YAML Language Support
- OpenAPI Preview

### CLI Tools
```bash
# Swagger CLI
npm install -g @apidevtools/swagger-cli

# OpenAPI CLI
npm install -g @redocly/openapi-cli

# Prism (mock server)
npm install -g @stoplight/prism-cli

# Redoc CLI
npm install -g redoc-cli
```

### Online Services
- **Swagger Hub**: Cloud-based API design
- **Stoplight**: API design platform
- **Postman**: API testing and documentation
- **ReadMe**: Interactive API docs

---

## 📚 Examples

### Example 1: Generate TypeScript Client

```bash
# Install generator
npm install @openapitools/openapi-generator-cli -g

# Generate client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o src/api-client \
  --additional-properties=supportsES6=true,npmName=hospice-ehr-client

# Use in your app
import { CertificationsApi, Configuration } from './api-client';

const config = new Configuration({
  basePath: 'http://localhost:3000/api',
  accessToken: 'your_jwt_token'
});

const certApi = new CertificationsApi(config);

// Get certifications
const response = await certApi.getPatientCertifications(1);
console.log(response.data);

// Create certification
await certApi.createCertification(1, {
  certification_period: 'INITIAL_90',
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  terminal_illness_narrative: '...'
});
```

### Example 2: Start Mock Server

```bash
# Install Prism
npm install -g @stoplight/prism-cli

# Start mock server
prism mock docs/openapi.yaml

# Server running at http://127.0.0.1:4010

# Test endpoints
curl http://127.0.0.1:4010/patients/1/certifications
curl http://127.0.0.1:4010/patients/1/medications
```

### Example 3: Generate Documentation

```bash
# Install Redoc
npm install -g redoc-cli

# Generate standalone HTML
redoc-cli bundle docs/openapi.yaml \
  -o docs/api-docs.html \
  --title "Hospice EHR API Documentation"

# Open in browser
open docs/api-docs.html
```

---

## 🎯 Best Practices

### 1. Versioning
- Use semantic versioning (1.0.0)
- Update version in `info.version`
- Document breaking changes

### 2. Descriptions
- Write clear, concise descriptions
- Include examples
- Document edge cases

### 3. Examples
- Provide realistic examples
- Cover common use cases
- Include error scenarios

### 4. Validation
- Always validate before committing
- Use linting tools
- Check references

### 5. Maintenance
- Keep in sync with actual API
- Update when adding endpoints
- Document deprecations

---

## 🐛 Troubleshooting

### Issue: "Schema validation failed"
**Solution:** Run `swagger-cli validate` to see specific errors

### Issue: "Cannot resolve reference"
**Solution:** Check all `$ref` paths are correct

### Issue: "Mock server returns 404"
**Solution:** Verify path matches spec exactly (case-sensitive)

### Issue: "Client generation fails"
**Solution:** Ensure all schemas have required properties defined

---

## 📞 Support

For OpenAPI specification questions:
- 📖 Official Docs: https://swagger.io/docs/specification/about/
- 💬 Stack Overflow: [openapi] tag
- 🐛 Issues: Report in project repository

---

**Last Updated:** 2024-12-27
**OpenAPI Version:** 3.0.3
**Specification Version:** 1.0.0
