import dotenv from 'dotenv';
import { program } from 'commander';
import { addFirebaseCommands } from './tools/firebase-tools.js';
import { addMongoCommands } from './tools/mongo-tools.js';

const DEFAULT_USER = 'BB8zGVrCbrQ2QryHyiZNaUZJjQ93';

const main = async () => {
  dotenv.config();
  const dbUser = process.env.MONGO_DB_USERNAME ?? '';
  const dbPassword = process.env.MONGO_DB_PASSWORD ?? '';

  program.option('-u --user-id <userId>', 'User ID', DEFAULT_USER);
  addFirebaseCommands(program.command('firebase'));
  addMongoCommands(program.command('mongo'), dbUser, dbPassword);

  program.parse();
};

main();
