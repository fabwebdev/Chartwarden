import {
    index,
    store,
    show,
    update,
    destroy,
    getOptions,
} from "../../controllers/patient/RaceEthnicity.controller.js";

// Fastify plugin for race ethnicity routes
async function raceEthnicityRoutes(fastify, options) {
  // Race Ethnicity Routes
  // Note: More specific routes must be defined before parameterized routes
  fastify.get("/raceEthnicity/options", getOptions); // Get comprehensive list of options
  fastify.get("/raceEthnicity", index); // Get all from database
  fastify.post("/raceEthnicity/store", store);
  fastify.get("/raceEthnicity/:id", show);
  fastify.put("/raceEthnicity/:id", update);
  fastify.delete("/raceEthnicity/:id", destroy);
}

export default raceEthnicityRoutes;
