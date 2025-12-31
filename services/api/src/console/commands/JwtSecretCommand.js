import { Command } from "commander";
import crypto from "crypto";

import { logger } from '../../utils/logger.js';
class JwtSecretCommand {
  constructor() {
    this.command = new Command("jwt:secret");
    this.configureCommand();
  }

  configureCommand() {
    this.command
      .description("Set the JWTAuth secret key used to sign the tokens")
      .option(
        "-s, --show",
        "Display the generated key instead of modifying .env file"
      )
      .option("-a, --always-no", "Skip generating key if key already exists")
      .action((options) => {
        this.generateSecret(options);
      });
  }

  generateSecret(options) {
    const key = crypto.randomBytes(32).toString("hex");

    if (options.show) {
      logger.info("JWT_SECRET=" + key)
      return;
    }

    logger.info("JWT secret generated successfully.")
    logger.info("Please add the following line to your .env file:")
    logger.info("JWT_SECRET=" + key)
  }

  getCommand() {
    return this.command;
  }
}

export default JwtSecretCommand;
