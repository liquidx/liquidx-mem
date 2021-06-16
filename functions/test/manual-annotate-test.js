// End to end tests for Firebase Functions.
const fetch = require("make-fetch-happen");

const server = "http://localhost:5001/liquidx-mem/us-central1";
//const server = "https://liquidx-mem.web.app/api";

const testAnnotate = (userId, memId) => {
  fetch(`${server}/annotate?user=${userId}&mem=${memId}`, {
    method: "GET"
  })
    .then(response => response.text())
    .then(response => {
      console.log(response);
    });
};

testAnnotate("BB8zGVrCbrQ2QryHyiZNaUZJjQ93", "57xoLmtby1lGIy7QgnQx");
