/**
 * Wikipedia Art Browser
 * Written for node.js
 */

var http = require("http"),
    sys = require("sys"),
    express = require("express"),
    wikipedia = require("./wikipedia"),
    WAGConsts = require("../shared/WAGConsts");

var puts = sys.puts,
    inspect = sys.inspect;

process.addListener("uncaughtException", function(e) {
  puts(inspect(e));
});

var app = express.createServer();
app.use(express.cookieDecoder());
app.use(express.session());

var wp = wikipedia.createInstance("en.wikipedia.org");

app.get("/", function(req, res) {
  res.send({
    resultCode: WAGConsts.UNKNOWN_METHOD
  });
});

function handleCategoryImages(req, res, data) {
  if (data.pages.length == 0) {
    res.send({
      resultCode: WAGConsts.EMPTY_CATEGORY
    });
    return;
  }

  // Store current parameters in session
  req.session.curCategory = data.title;
  req.session.continueKey = data.continuekey;

  var images = [];
  for (var i in data.pages) {
    images.push(data.pages[i].image_title);
  }

  // Now get thumbs for each of the images
  wp.getImageThumbs(images, 300, function(thumbdata) {
    for (var i in data.pages) {
      var image_title = data.pages[i].image_title;
      if (thumbdata[image_title]) {
        data.pages[i].thumb_url = thumbdata[image_title];
      } else {
        console.error("CONSISTENCY: Did not retrieve thumb for "+image_title);
        res.send({
          resultCode: WAGConsts.UNKNOWN
        });
        return;
      }
    }
    var result = {
      resultCode: WAGConsts.SUCCESS,
      data: data.pages
    };
    result.hasMore = !!data.continuekey;
    res.send(result);
  });
}

/**
 * Given a category, sets the active category in the session and returns the
 * first set of images for it.
 */
app.get("/category/:cat", function(req, res) {
  wp.getCategoryImages(req.params.cat, null, function(data) {
    handleCategoryImages(req, res, data);
  });
});

/**
 * Given an active session, returns more images for the given category.
 * If none, returns null.
 */
app.get("/more", function(req, res) {
  if (!req.session.curCategory || !req.session.continueKey) {
    res.send({
      resultCode: WAGConsts.NO_MORE
    });
    return;
  }

  wp.getCategoryImages(req.session.curCategory, req.session.continueKey,
    function(data) {
      handleCategoryImages(req, res, data);
    }
  );
});

app.listen(8900);
console.log("Server running");
