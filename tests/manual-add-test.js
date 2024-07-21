// End to end tests for Firebase Functions.
import process from 'process';
import fs from 'fs';
import FormData from 'form-data';
import { program } from 'commander';
import axios from 'axios';

const server = 'http://localhost:12000/_api';
//const server = "https://dev.mem.liquidx.net/_api";
const testData = 'https://liquidx.net/ This is a #test';

const testQuery = () => {
	const data = encodeURIComponent(testData);

	axios.get(`${server}/add?text=${data}`).then((response) => {
		console.log(response.data);
	});
};

const testJsonWrongSecret = () => {
	axios
		.post(`${server}/add`, JSON.stringify({ text: testData, secret: 'wrongSecret' }), {
			headers: {
				'content-type': 'application/json'
			}
		})
		.then((response) => {
			console.log(response.data);
		});
};

const testJsonAdd = () => {
	const body = { text: testData, secret: 'akita-inu' };
	const req = {
		headers: {
			'content-type': 'application/json'
		}
	};

	console.log(`${server}/mem/add`);

	return axios
		.post(`${server}/mem/add`, body, req)
		.then((response) => {
			console.log(response.data);
		})
		.catch((err) => {
			console.log(err.response.statusText);
		});
};

const testJsonImage = (testData) => {
	axios
		.post(`${server}/add`, JSON.stringify({ image: testData, secret: 'akita-inu' }), {
			headers: {
				'content-type': 'application/json'
			}
		})
		.then((response) => {
			console.log(response.data);
		});
};

const testAddWithFormData = () => {
	const body = new FormData();
	body.append('text', testData);
	body.append('secret', 'akita-inu');

	axios
		.post(`${server}/add`, {
			text: testData,
			secret: 'akita-inu'
		})
		.then((response) => {
			console.log(response.data);
		})
		.catch((err) => {
			console.log(err);
		});
};

const testGet = () => {
	axios.get(`${server}/add`).then((response) => {
		console.log(response.data);
	});
};

const main = () => {
	program.command('json-image <image>').action((image) => {
		const imageBase64 = fs.readFileSync(image).toString('base64');
		testJsonImage(imageBase64);
	});

	program.command('test-add-get').action(() => {
		testGet();
	});

	program.command('test-add-post').action(() => {
		testJsonAdd();
	});

	program.parse(process.argv);
};

main();
