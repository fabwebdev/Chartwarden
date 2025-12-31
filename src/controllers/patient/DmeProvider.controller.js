import { logger } from '../../utils/logger.js';

// Get all DME provider options (predefined list)
// DME provider is now a simple dropdown with predefined options
export const index = async (request, reply) => {
  try {
    // Return predefined DME equipment options
    const dmeOptions = [
      { value: "none", label: "None" },
      { value: "wheelchair", label: "Wheelchair" },
      { value: "oxygen", label: "Oxygen" },
      { value: "bed", label: "Bed" },
      { value: "over bed table", label: "Over Bed Table" },
      { value: "pressure mattress", label: "Pressure Mattress" },
    ];
    
    reply.code(200);
    return dmeOptions;
  } catch (error) {
    logger.error("Error in index:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};
