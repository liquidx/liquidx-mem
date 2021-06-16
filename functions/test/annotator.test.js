const chai = require("chai");
chai.should();

const { annotateMem } = require("../dist/core/annotator");

describe("annotator", () => {
  it("should get opengraph data", async () => {
    const mem = {
      url: "https://www.npmjs.com/package/open-graph-scraper"
    };

    const result = await annotateMem(mem);
    result.should.have.property("title").equal("open-graph-scraper");
    result.should.have
      .property("description")
      .equal("Node.js scraper module for Open Graph and Twitter Card info");
  });

  it("should get twitter description", async () => {
    const mem = {
      url: "https://twitter.com/hyappy717/status/1404416312282017798"
    };
    const result = await annotateMem(mem);
    console.log(result.twitterMedia[0]);
    console.log(result.videos);
    result.should.have.property("descriptionHtml");
  });

  it("should get twitter images", async () => {
    const mem = {
      url: "https://twitter.com/0_skyblue/status/1404741709548769281"
    };
    const result = await annotateMem(mem);
    result.should.have.property("twitterMedia").with.lengthOf(2);
  });
});
