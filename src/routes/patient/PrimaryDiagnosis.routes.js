import {
    index,
    store,
    show,
    update,
    destroy,
    search,
} from "../../controllers/patient/PrimaryDiagnosis.controller.js";

// Fastify plugin for primary diagnosis routes
async function primaryDiagnosisRoutes(fastify, options) {
  // Primary Diagnosis Routes
  // Note: More specific routes must be defined before parameterized routes
  fastify.get("/primaryDiagnosis", index);
  fastify.get("/primaryDiagnosis/list", index); // Alias for listing all diagnoses
  fastify.get("/primaryDiagnosis/search", search); // Search diagnoses by code or description
  fastify.post("/primaryDiagnosis/store", store);
  fastify.get("/primaryDiagnosis/:id", show);
  fastify.put("/primaryDiagnosis/update/:id", update);
  fastify.delete("/primaryDiagnosis/:id", destroy);
}

export default primaryDiagnosisRoutes;
