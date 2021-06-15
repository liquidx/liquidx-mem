const chai = require("chai");
chai.should();

const { annotateMem } = require("../dist/core/annotator");

describe("annotator", () => {
  it("should get opengraph data", async () => {
    const mem = {
      url: "www.npmjs.com/package/open-graph-scraper"
    };

    const result = await annotateMem(mem);
    result.should.have.property("title").equal("open-graph-scraper");
    result.should.have
      .property("description")
      .equal("Node.js scraper module for Open Graph and Twitter Card info");
  });
});
