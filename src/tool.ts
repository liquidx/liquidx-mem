import { program } from "commander";
import dotenv from "dotenv";

import { addMongoCommands } from "./tools/mongo-tools.js";

const DEFAULT_USER = "BB8zGVrCbrQ2QryHyiZNaUZJjQ93";

const main = async () => {
  dotenv.config();
  const dbUser = process.env.MONGO_DB_USERNAME ?? "";
  const dbPassword = process.env.MONGO_DB_PASSWORD ?? "";

  if (!dbUser) {
    console.log("No MONGO_DB_USERNAME set");
    return;
  }
  if (!dbPassword) {
    console.log("No MONGO_DB_PASSWORD set");
    return;
  }

  program.option("-u --user-id <userId>", "User ID", DEFAULT_USER);
  addMongoCommands(program.command("mongo"), dbUser, dbPassword);

  program.parse();
};

main();
