const chai = require("chai");
chai.should();

const { annotateMem } = require("../dist/core/annotator");

describe("annotator", () => {
  it("should get opengraph images from instagram", async () => {
    const mem = {
      url: "https://www.instagram.com/tv/CQKi_K8hivn/?utm_medium=share_sheet"
    };

    const expected = {};

    const result = await annotateMem(mem);
    result.should.have.property("photos").with.lengthOf(1);
  });

  it("should get opengraph images", async () => {
    const mem = {
      url:
        "https://observablehq.com/@mattdzugan/here-with-the-wind-using-wind-data-to-make-art-part-2-all-done-i"
    };

    const expected = {
      title: "Create Your Own Weather-Data-Driven-Art",
      description:
        "Early last year I put together this notebook - which was meant to inspire ideas on how one might use an otherwise mundane data source to create some beautiful graphics. It is by far my most-liked notebook (and even made it into Observable's list of top-10-most-liked notebooks in 2020). In that notebook, I kept the size of the dataset small so that all of the animations could be done in svg in the browser. But today, I come with BIG FUN 🎉 Not only are we going render these beautiful things in your browser,",
      photos: [
        {
          mediaUrl:
            "https://static.observableusercontent.com/thumbnail/7b24134d59d3aa336f093e756bdcdd462abdf8da7ef3b92b6ec2eabf9cd637ae.jpg"
        }
      ]
    };

    const result = await annotateMem(mem);
    result.should.have.property("title").equal(expected.title);
    result.should.have.property("description").equal(expected.description);
    result.should.have.property("photos").with.lengthOf(1);
    result.photos[0].should.have
      .property("mediaUrl")
      .equal(expected.photos[0].mediaUrl);
  });

  it("should get twitter description", async () => {
    const mem = {
      url: "https://twitter.com/hyappy717/status/1404416312282017798"
    };
    const result = await annotateMem(mem);
    result.should.have.property("descriptionHtml");
  });

  it("should get twitter images", async () => {
    const mem = {
      url: "https://twitter.com/0_skyblue/status/1404741709548769281"
    };
    const result = await annotateMem(mem);
    result.should.have.property("twitterMedia").with.lengthOf(2);
  });

  it("should get twitter animated gifs", async () => {
    const mem = {
      url: "https://twitter.com/ggsimm/status/1390017555612512257"
    };
    const result = await annotateMem(mem);
    result.should.have.property("videos").with.lengthOf(1);
  });

  it("should get twitter entities for long tweets", async () => {
    const mem = {
      url: "https://twitter.com/aemkei/status/1447297123440119824?s=12"
    };
    const result = await annotateMem(mem);
    result.should.have.property("twitterMedia").with.lengthOf(1);
  });

  it("should get url in tweet", async() => {
    const mem = {
      url: "https://twitter.com/karenklcheung/status/1448862196503482378?s=12"
    };
    const result = await annotateMem(mem);
    result.should.have.property("links").with.lengthOf(1);
  });
});
