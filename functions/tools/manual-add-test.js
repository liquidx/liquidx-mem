// End to end tests for Firebase Functions.

const process = require("process");
const fs = require("fs");
const FormData = require("form-data");
const program = require("commander");
const axios = require("axios");

const server = "http://127.0.0.1:5001/liquidx-mem/us-central1";
//const server = "https://liquidx-mem.web.app/api";
const testData = "https://liquidx.net/ This is a #test";

const testQuery = () => {
  const data = encodeURIComponent(testData);

  axios.get(`${server}/add?text=${data}`)
    .then(response => {
      console.log(response.data);
    });
};

const testJsonWrongSecret = () => {
  axios.post(`${server}/add`,
    JSON.stringify({ text: testData, secret: "wrongSecret" }),
    {
      headers: {
        "content-type": "application/json"
      },
    })
    .then(response => {
      console.log(response.data);
    });
};

const testJsonAdd = () => {
  axios.post(`${server}/add`,
    JSON.stringify({ text: testData, secret: "akita-inu" }),
    {
      headers: {
        "content-type": "application/json"
      },
    })
    .then(response => {
      console.log(response.data);
    });
};

const testJsonImage = testData => {
  axios.post(`${server}/add`,
    JSON.stringify({ image: testData, secret: "akita-inu" }),
    {
      headers: {
        "content-type": "application/json"
      },
    })
    .then(response => {
      console.log(response.data);
    });
};

const testAddWithFormData = () => {
  const body = new FormData();
  body.append("text", testData);
  body.append("secret", "akita-inu");

  axios.post(`${server}/add`, {
    text: testData,
    secret: "akita-inu"
  })
    .then(response => {
      console.log(response.data);
    })
    .catch(err => {
      console.log(err)
    })
};

const testGet = () => {
  axios.get(`${server}/add`)
    .then(response => {
      console.log(response.data);
    });
};

const main = () => {
  program.command("json-image <image>").action(image => {
    const imageBase64 = fs.readFileSync(image).toString("base64");
    testJsonImage(imageBase64);
  });

  program.command('test-add-get').action(() => {
    testGet()
  })

  program.command('test-add-post').action(() => {
    testJsonAdd()
  })



  program.parse(process.argv);
};

main();
