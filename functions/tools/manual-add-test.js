// End to end tests for Firebase Functions.

const process = require("process");
const fs = require("fs");
const fetch = require("make-fetch-happen");
const FormData = require("form-data");
const program = require("commander");

const server = "http://localhost:5001/liquidx-mem/us-central1";
//const server = "https://liquidx-mem.web.app/api";
const testData = "https://liquidx.net/ This is a #test";

const testQuery = () => {
  const data = encodeURIComponent(testData);

  fetch(`${server}/add?text=${data}`, {
    method: "GET"
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testJsonWrongSecret = () => {
  fetch(`${server}/add`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ text: testData, secret: "wrongSecret" })
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testJson = () => {
  fetch(`${server}/add`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ text: testData, secret: "akita-inu" })
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testJsonImage = testData => {
  fetch(`${server}/add`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ image: testData, secret: "akita-inu" })
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testFormData = () => {
  const body = new FormData();
  body.append("text", testData);

  fetch(`${server}/add`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testGet = () => {
  fetch(`${server}/add`)
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const main = () => {
  program.command("json-image <image>").action(image => {
    const imageBase64 = fs.readFileSync(image).toString("base64");
    testJsonImage(imageBase64);
  });

  program.parse(process.argv);
};

main();
//testJson();
