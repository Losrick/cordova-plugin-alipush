#!/usr/bin/env node

module.exports = function (context) {
  var fs = context.requireCordovaModule("fs"),
    path = context.requireCordovaModule("path");

  var platformRoot = path.join(context.opts.projectRoot, "platforms/android");

  var manifestFile = path.join(platformRoot, "/app/src/main/AndroidManifest.xml");

  if (fs.existsSync(manifestFile)) {
    fs.readFile(manifestFile, "utf8", function (err, data) {
      if (err) {
        throw new Error("Unable to find AndroidManifest.xml: " + err);
      }

      var appClass = "com.blanktrack.alipush.MyApplication";

      if (data.indexOf(appClass) !== -1) {
        var result = data.replace(/android:name="com.blanktrack.alipush.MyApplication"/g, "");

        fs.writeFile(manifestFile, result, "utf8", function (err) {
          if (err) throw new Error("Unable to write into AndroidManifest.xml: " + err);
        });
      }
    });
  }

  //删除应用级build.gradle下的内容
  var appGradle = path.join(platformRoot, "/app/build.gradle");

  if (fs.existsSync(appGradle)) {
    fs.readFile(appGradle, "utf8", function (err, data) {
      if (err) {
        throw new Error("Unable to find build.gradle:" + err);
      }
      let isChange = false; // 是否需要修改文件
      //删除包依赖
      if (data.indexOf(`// 阿里集成推送依赖开始，把所有的aar都添加上`) !== -1) {
        var startIndex = data.indexOf(`// 阿里集成推送依赖开始，把所有的aar都添加上`);
        var endIndex = data.indexOf(`// 阿里集成推送依赖结束`) + 13;
        data = data.replace(data.substring(startIndex, endIndex), "");
        isChange = true;
      }
      //删除emas-services的引用
      if (data.indexOf(`apply plugin: 'com.aliyun.ams.emas-services'`) !== -1) {
        data = data.replace(`apply plugin: 'com.aliyun.ams.emas-services'`, "");
        isChange = true;
      }
      if (isChange === true) {
        fs.writeFile(appGradle, data, "utf8", function (err) {
          if (err) throw new Error("Unable to write into 应用级build.gradle: " + err);
        });
      }
    });
  }

  //删除项目级build.gradle下的内容
  var buildGradle = path.join(platformRoot, "/build.gradle");
  if (fs.existsSync(buildGradle)) {
    fs.readFile(buildGradle, "utf8", function (err, data) {
      if (err) {
        throw new Error("Unable to find build.gradle:" + err);
      }
      let isChange = false; // 是否需要修改文件
      //删除阿里云仓库
      let isAliMaven = data.indexOf(`https://maven.aliyun.com/nexus/content/repositories/releases/`);
      while (isAliMaven !== -1) {
        var startIndex = data.indexOf(`// 添加阿里云仓库地址`);
        var endIndex = data.indexOf(`https://maven.aliyun.com/nexus/content/repositories/releases/'`) + 63;
        data = data.replace(data.substring(startIndex, endIndex), "");
        isAliMaven = data.indexOf(`https://maven.aliyun.com/nexus/content/repositories/releases/`);
        isChange = true;
      }
      //删除emas-services插件
      if (data.indexOf(`classpath 'com.aliyun.ams:emas-services:1.0.1'`) !== -1) {
        var startIndex = data.indexOf(`// 添加emas-services插件`);
        var endIndex = data.indexOf(`aliyun.ams:emas-services:1.0.1'`) + 31;
        data = data.replace(data.substring(startIndex, endIndex), "");
        isChange = true;
      }
      //删除HMS Core SDK的Maven仓地址
      if (data.indexOf(`https://developer.huawei.com/repo/`) !== -1) {
        var startIndex = data.indexOf(`// 配置HMS Core SDK的Maven仓地址`);
        var endIndex = data.indexOf(`https://developer.huawei.com/repo/`) + 36;
        data = data.replace(data.substring(startIndex, endIndex), "");
        isChange = true;
      }
      if (isChange === true) {
        fs.writeFile(buildGradle, data, "utf8", function (err) {
          if (err) throw new Error("Unable to write into 应用级build.gradle: " + err);
        });
      }
    });
  }
};
