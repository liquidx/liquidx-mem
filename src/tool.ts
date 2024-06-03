import { program } from 'commander';
import { addFirebaseCommands } from './tools/firebase-tools';

const main = async () => {
	const firebaseCommand = program.createCommand('firebase');
	addFirebaseCommands(firebaseCommand);

	program.parse();
};

main();
