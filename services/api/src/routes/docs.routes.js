/**
 * API Documentation Routes
 *
 * Serves OpenAPI/Swagger documentation at /api/docs
 *
 * Endpoints:
 * - GET /api/docs - Swagger UI interface
 * - GET /api/docs/openapi.yaml - OpenAPI 3.0 specification (YAML)
 * - GET /api/docs/openapi.json - OpenAPI 3.0 specification (JSON)
 * - GET /api/docs/info - API metadata and statistics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to docs directory
const docsPath = path.join(__dirname, '../../docs');

/**
 * Simple YAML to JSON parser for OpenAPI spec
 * Handles the basic YAML structure without external dependencies
 * @param {string} yamlContent - YAML content string
 * @returns {object} Parsed object
 */
function parseYamlSimple(yamlContent) {
  // For OpenAPI spec, we'll extract key metadata using regex
  const info = {
    title: yamlContent.match(/title:\s*(.+)/)?.[1]?.trim() || 'Chartwarden API',
    version: yamlContent.match(/version:\s*(.+)/)?.[1]?.trim() || '2.0.0',
    openapi: yamlContent.match(/openapi:\s*(.+)/)?.[1]?.trim() || '3.0.3'
  };

  // Count paths (endpoints)
  const pathMatches = yamlContent.match(/^\s{2}\/[^\s:]+:/gm) || [];

  // Count schemas
  const schemaMatches = yamlContent.match(/^\s{4}[A-Z][a-zA-Z]+:$/gm) || [];

  // Count tags
  const tagMatches = yamlContent.match(/^\s{2}- name:/gm) || [];

  return {
    info,
    stats: {
      endpoints: pathMatches.length,
      schemas: schemaMatches.length,
      tags: tagMatches.length
    }
  };
}

/**
 * Register documentation routes
 * @param {import('fastify').FastifyInstance} fastify
 */
async function docsRoutes(fastify) {
  // Serve Swagger UI at /api/docs
  fastify.get('/', async (request, reply) => {
    try {
      const htmlPath = path.join(docsPath, 'swagger-ui.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      reply.type('text/html').send(html);
    } catch (error) {
      fastify.log.error('Error serving Swagger UI:', error);
      reply.code(500).send({
        status: 500,
        message: 'Error loading API documentation'
      });
    }
  });

  // Serve OpenAPI YAML specification
  fastify.get('/openapi.yaml', async (request, reply) => {
    try {
      const yamlPath = path.join(docsPath, 'openapi.yaml');
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      reply
        .type('text/yaml')
        .header('Content-Disposition', 'inline; filename="openapi.yaml"')
        .header('Access-Control-Allow-Origin', '*')
        .send(yamlContent);
    } catch (error) {
      fastify.log.error('Error serving OpenAPI YAML:', error);
      reply.code(500).send({
        status: 500,
        message: 'Error loading OpenAPI specification'
      });
    }
  });

  // Serve OpenAPI JSON specification
  // Note: For full JSON conversion, consider adding js-yaml package
  // Currently returns basic metadata as JSON
  fastify.get('/openapi.json', async (request, reply) => {
    try {
      const yamlPath = path.join(docsPath, 'openapi.yaml');
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');

      // Try to dynamically import js-yaml if available
      try {
        const yaml = await import('js-yaml');
        const jsonContent = yaml.default.load(yamlContent);
        return reply
          .type('application/json')
          .header('Content-Disposition', 'inline; filename="openapi.json"')
          .header('Access-Control-Allow-Origin', '*')
          .send(jsonContent);
      } catch {
        // js-yaml not available, return message directing to YAML endpoint
        return reply.code(200).send({
          status: 200,
          message: 'Full JSON specification requires js-yaml package. Use /api/docs/openapi.yaml instead.',
          yamlEndpoint: '/api/docs/openapi.yaml',
          metadata: parseYamlSimple(yamlContent)
        });
      }
    } catch (error) {
      fastify.log.error('Error serving OpenAPI JSON:', error);
      reply.code(500).send({
        status: 500,
        message: 'Error loading OpenAPI specification'
      });
    }
  });

  // Provide API documentation metadata
  fastify.get('/info', async (request, reply) => {
    try {
      const yamlPath = path.join(docsPath, 'openapi.yaml');
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const parsed = parseYamlSimple(yamlContent);

      reply.send({
        status: 200,
        data: {
          title: parsed.info.title,
          version: parsed.info.version,
          openApiVersion: parsed.info.openapi,
          stats: parsed.stats,
          endpoints: {
            swaggerUi: '/api/docs',
            openapiYaml: '/api/docs/openapi.yaml',
            openapiJson: '/api/docs/openapi.json',
            info: '/api/docs/info'
          },
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      fastify.log.error('Error getting API info:', error);
      reply.code(500).send({
        status: 500,
        message: 'Error loading API information'
      });
    }
  });
}

export default docsRoutes;
