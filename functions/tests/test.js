// End to end tests for Firebase Functions.

const fetch = require("make-fetch-happen");
const FormData = require("form-data");

const testData = "https://liquidx.net/ #test";

const testQuery = () => {
  const data = encodeURIComponent(testData);

  fetch(`http://localhost:5001/liquidx-mem/asia-northeast1/add?text=${data}`, {
    method: "GET"
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testJson = () => {
  fetch("http://localhost:5001/liquidx-mem/asia-northeast1/add", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ text: testData })
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

const testFormData = () => {
  const body = new FormData();
  body.append("text", testData);

  fetch("http://localhost:5001/liquidx-mem/asia-northeast1/add", {
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
  fetch("http://localhost:5001/liquidx-mem/asia-northeast1/add")
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

testJson();
