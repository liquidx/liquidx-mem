import dotenv from 'dotenv';
import { program } from 'commander';
import { addFirebaseCommands } from './tools/firebase-tools.js';

const DEFAULT_USER = 'BB8zGVrCbrQ2QryHyiZNaUZJjQ93';

const main = async () => {
	dotenv.config();

	program.option('-u --user-id <userId>', 'User ID', DEFAULT_USER);

	addFirebaseCommands(program.command('firebase'));

	program.parse();
};

main();
