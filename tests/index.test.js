// Offline tests.
const test = require('firebase-functions-test')();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sinon = require('sinon');

const chai = require('chai');
const assert = chai.assert;

describe('Cloud Functions', () => {
	let testableFunctions, adminInitStub, userStub, firestoreAddStub;

	before(() => {
		adminInitStub = sinon.stub(admin, 'initializeApp');
		testableFunctions = require('../functions/dist/src/index.js');

		console.log(testableFunctions);

		userStub = sinon.stub(testableFunctions, 'userForSharedSecret');
		userStub.returns(
			new Promise((resolve, reject) => {
				resolve({ id: '1', secret: 'test-secret' });
			})
		);

		firestoreAddStub = sinon.stub(testableFunctions, 'firestoreAdd');
		firestoreAddStub.returns(
			new Promise((resolve) => {
				resolve('');
			})
		);
	});

	after(() => {
		adminInitStub.restore();
		userStub.restore();
		firestoreAddStub.restore();
		test.cleanup();
	});

	describe('add', () => {
		it('should fail with a fake secret', () => {
			const req = { body: { text: 'input', secret: 'fake-secret' } };
			const res = {
				status: (code) => {
					assert.equal(code, 403);
				},
				send: (contents) => {
					assert.isString(contents);
					done();
				}
			};
			testableFunctions.add(req, res);
		});
	});
});
