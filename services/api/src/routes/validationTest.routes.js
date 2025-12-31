/**
 * Validation Test Routes
 *
 * These routes are for testing the Yup validation middleware.
 * They demonstrate various validation scenarios and can be used
 * for integration testing.
 *
 * NOTE: These routes should be disabled in production or protected
 * behind admin authentication.
 */

import * as yup from 'yup';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  fields,
  schemas,
  paginationSchema,
  idParamSchema,
  sanitizedString
} from '../middleware/validation.middleware.js';

async function validationTestRoutes(fastify, options) {
  // Skip in production
  if (process.env.NODE_ENV === 'production') {
    fastify.log.info('Validation test routes disabled in production');
    return;
  }

  /**
   * Test basic body validation
   * POST /api/validation-test/body
   *
   * Body: { name: string (required), email: string (required), age?: number }
   */
  fastify.post('/body', {
    preHandler: [validateBody(yup.object({
      name: fields.requiredName(),
      email: fields.requiredEmail(),
      age: yup.number().integer().min(0).max(150)
    }))]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Body validation passed',
      data: {
        received: request.body,
        sanitized: true
      }
    };
  });

  /**
   * Test query parameter validation
   * GET /api/validation-test/query?page=1&limit=20&sort=name&order=asc
   */
  fastify.get('/query', {
    preHandler: [validateQuery(paginationSchema)]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Query validation passed',
      data: {
        received: request.query
      }
    };
  });

  /**
   * Test URL parameter validation
   * GET /api/validation-test/params/:id
   */
  fastify.get('/params/:id', {
    preHandler: [validateParams(idParamSchema)]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Params validation passed',
      data: {
        id: request.params.id
      }
    };
  });

  /**
   * Test combined body, query, and params validation
   * PUT /api/validation-test/combined/:id?include=details
   */
  fastify.put('/combined/:id', {
    preHandler: [validate({
      params: idParamSchema,
      query: yup.object({
        include: yup.string().oneOf(['details', 'summary', 'all']).default('summary')
      }),
      body: yup.object({
        name: fields.name(),
        description: fields.text()
      })
    })]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Combined validation passed',
      data: {
        params: request.params,
        query: request.query,
        body: request.body
      }
    };
  });

  /**
   * Test XSS sanitization
   * POST /api/validation-test/sanitize
   */
  fastify.post('/sanitize', {
    preHandler: [validateBody(yup.object({
      content: sanitizedString().required('Content is required')
    }))]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Input sanitized successfully',
      data: {
        sanitizedContent: request.body.content,
        note: 'HTML entities have been escaped to prevent XSS'
      }
    };
  });

  /**
   * Test auth schema validation (sign up)
   * POST /api/validation-test/auth/signup
   */
  fastify.post('/auth/signup', {
    preHandler: [validateBody(schemas.auth.signUp)]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Signup validation passed',
      data: {
        email: request.body.email,
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        passwordProvided: !!request.body.password
      }
    };
  });

  /**
   * Test patient schema validation (create)
   * POST /api/validation-test/patient
   */
  fastify.post('/patient', {
    preHandler: [validateBody(schemas.patient.create)]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Patient validation passed',
      data: request.body
    };
  });

  /**
   * Test encounter schema validation (create)
   * POST /api/validation-test/encounter
   */
  fastify.post('/encounter', {
    preHandler: [validateBody(schemas.encounter.create)]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Encounter validation passed',
      data: request.body
    };
  });

  /**
   * Test medication schema validation (create)
   * POST /api/validation-test/medication
   */
  fastify.post('/medication', {
    preHandler: [validateBody(schemas.medication.create)]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Medication validation passed',
      data: request.body
    };
  });

  /**
   * Test multiple validation errors
   * POST /api/validation-test/multiple-errors
   *
   * This endpoint is designed to return multiple validation errors
   * when invalid data is provided.
   */
  fastify.post('/multiple-errors', {
    preHandler: [validateBody(yup.object({
      email: fields.requiredEmail(),
      phone: fields.phone().required('Phone is required'),
      age: yup.number().required('Age is required').min(0).max(150),
      role: fields.oneOf(['admin', 'user', 'guest']).required('Role is required')
    }))]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'All validations passed',
      data: request.body
    };
  });

  /**
   * Test healthcare-specific field validation
   * POST /api/validation-test/healthcare
   */
  fastify.post('/healthcare', {
    preHandler: [validateBody(yup.object({
      mrn: fields.mrn().required('MRN is required'),
      ssn: fields.ssn(),
      npi: fields.npi()
    }))]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Healthcare field validation passed',
      data: {
        mrn: request.body.mrn,
        ssnProvided: !!request.body.ssn,
        npiProvided: !!request.body.npi
      }
    };
  });

  /**
   * Test stripUnknown behavior
   * POST /api/validation-test/strip-unknown
   *
   * Only 'allowed' field will be kept; 'notAllowed' will be stripped
   */
  fastify.post('/strip-unknown', {
    preHandler: [validate({
      body: yup.object({
        allowed: yup.string().required()
      }),
      stripUnknown: true
    })]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Unknown fields stripped',
      data: {
        body: request.body,
        note: 'Only "allowed" field should be present'
      }
    };
  });

  /**
   * Health check for validation test routes
   * GET /api/validation-test/health
   */
  fastify.get('/health', async (request, reply) => {
    return {
      success: true,
      message: 'Validation test routes are active',
      environment: process.env.NODE_ENV || 'development'
    };
  });
}

export default validationTestRoutes;
