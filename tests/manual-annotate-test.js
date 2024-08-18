// End to end tests for Firebase Functions.
const axios = require("axios");

const server = "http://localhost:5001/liquidx-mem/us-central1";
//const server = "https://liquidx-mem.web.app/api";

const testAnnotate = (userId, memId) => {
  axios.get(`${server}/annotate?user=${userId}&mem=${memId}`).then((response) => {
    console.log(response.data);
  });
};

testAnnotate("BB8zGVrCbrQ2QryHyiZNaUZJjQ93", "57xoLmtby1lGIy7QgnQx");
