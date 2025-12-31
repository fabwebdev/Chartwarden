import { index } from "../../controllers/patient/DmeProvider.controller.js";

// Fastify plugin for DME provider routes
// DME provider is now a simple dropdown with predefined options
async function dmeProviderRoutes(fastify, options) {
  // Get DME provider options (predefined list)
  fastify.get("/providers", index);
}

export default dmeProviderRoutes;
