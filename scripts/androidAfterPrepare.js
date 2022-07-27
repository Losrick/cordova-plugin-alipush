#!/usr/bin/env node

module.exports = function (context) {
  var path = require("path"),
    fs = require("fs");

  let platformRoot = path.join(context.opts.projectRoot, "platforms/android");

  let manifestFile = path.join(platformRoot, "/app/src/main/AndroidManifest.xml");

  if (fs.existsSync(manifestFile)) {
    fs.readFile(manifestFile, "utf8", function (err, data) {
      if (err) {
        throw new Error("Unable to find AndroidManifest.xml: " + err);
      }

      let appClass = "com.blanktrack.alipush.MyApplication";

      if (data.indexOf(appClass) == -1) {
        let result = data.replace(/<application/g, '<application android:name="' + appClass + '"');

        fs.writeFile(manifestFile, result, "utf8", function (err) {
          if (err) throw new Error("Unable to write into AndroidManifest.xml: " + err);
        });
      }
    });
  }
};
