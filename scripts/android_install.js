#!/usr/bin/env node

module.exports = function (context) {
  var path = require("path"),
    fs = require("fs"),
    shell = require("shelljs");
  (projectRoot = context.opts.projectRoot), (plugins = context.opts.plugins || []);

  var ConfigParser = null;
  try {
    ConfigParser = context.requireCordovaModule("cordova-common").ConfigParser;
  } catch (e) {
    // fallback
    ConfigParser = context.requireCordovaModule("cordova-lib/src/configparser/ConfigParser");
  }

  var config = new ConfigParser(path.join(context.opts.projectRoot, "config.xml")),
    packageName = config.android_packageName() || config.packageName();

  // replace dash (-) with underscore (_)
  packageName = packageName.replace(/-/g, "_");

  console.info(
    "Running android-install.Hook: " + context.hook + ", Package: " + packageName + ", Path: " + projectRoot + "."
  );

  if (!packageName) {
    console.error("Package name could not be found!");
    return;
  }

  // android platform available?
  if (context.opts.cordova.platforms.indexOf("android") === -1) {
    console.info("Android platform has not been added.");
    return;
  }

  var targetDir = path.join(
    projectRoot,
    "platforms",
    "android",
    "app",
    "src",
    "main",
    "java",
    packageName.replace(/\./g, path.sep),
    "alipush"
  );

  // create directory
  shell.mkdir("-p", targetDir);
  var filename = "AliPushActivity.java";

  if (["after_plugin_install"].indexOf(context.hook) === -1) {
    try {
      fs.unlinkSync(path.join(targetDir, filename));
      shell.rm("-f", targetDir);
    } catch (err) {}
  } else {
    // sync the content
    fs.readFile(
      path.join(context.opts.plugin.dir, "src", "android", filename),
      { encoding: "utf-8" },
      function (err, data) {
        if (err) {
          throw err;
        }

        data = data.replace(/__PACKAGE_NAME__/gm, packageName);
        fs.writeFileSync(path.join(targetDir, filename), data);
      }
    );
  }

  let platformRoot = path.join(context.opts.projectRoot, "platforms/android");
  //在应用级目录下的build.gradle中添加
  let appGradle = path.join(platformRoot, "/app/build.gradle");
  if (fs.existsSync(appGradle)) {
    fs.readFile(appGradle, "utf8", function (err, data) {
      if (err) {
        throw new Error("Unable to find build.gradle:" + err);
      }
      let isChange = false; //是否需要修改文件
      //添加阿里云推送的包依赖
      let dependencies = "// SUB-PROJECT DEPENDENCIES END";
      if (data.indexOf("// 阿里集成推送依赖开始，把所有的aar都添加上") == -1) {
        data = data.replace(
          dependencies,
          `${dependencies}
    // 阿里集成推送依赖开始，把所有的aar都添加上
    api(name:'alicloud-android-accs-4.6.3-emas', ext: 'aar')
    api(name:'alicloud-android-agoo-4.6.3-emas', ext: 'aar')
    api(name:'alicloud-android-push-3.7.7', ext: 'aar')
    api(name:'alicloud-android-error-1.1.0', ext: 'aar')
    api(name:'alicloud-android-logger-1.2.0', ext: 'aar')
    api(name:'alicloud-android-rest-1.6.5-open', ext: 'aar')
    api(name:'alicloud-android-sender-1.1.4', ext: 'aar')

    api(name:'alicloud-android-third-push-3.7.7', ext: 'aar')
    api(name:'alicloud-android-third-push-fcm-3.7.7', ext: 'aar')
    api(name:'alicloud-android-third-push-huawei-3.7.7', ext: 'aar')
    api(name:'alicloud-android-third-push-meizu-3.7.7', ext: 'aar')
    api(name:'alicloud-android-third-push-oppo-3.7.7', ext: 'aar')
    api(name:'alicloud-android-third-push-vivo-3.7.7', ext: 'aar')
    api(name:'alicloud-android-third-push-xiaomi-3.7.7', ext: 'aar')

    api(name:'opush-3.0.0', ext: 'aar')
    api(name:'tnet4android-3.1.14.10-open-fix1', ext: 'aar')
    api(name:'vivo-push-3.0.0.4', ext: 'aar')

    // 华为从5.0.2版本开始不在提供离线包
    api 'com.huawei.hms:push:5.3.0.304'
    // 魅族从4.1.4版本开始不在提供离线包
    api 'com.meizu.flyme.internet:push-internal:4.1.4'
    // 阿里集成推送依赖结束`
        );
        isChange = true;
      }

      //引用emas-services
      let application = `apply plugin: 'com.android.application'`;
      if (data.indexOf(`apply plugin: 'com.aliyun.ams.emas-services'`) == -1) {
        data = data.replace(
          application,
          `${application}
apply plugin: 'com.aliyun.ams.emas-services'`
        );
        isChange = true;
      }

      //引用资源包
      let android = `android {`;
      if (data.indexOf("dirs 'libs' //this way we can find the .aar file in libs folder") == -1) {
        data = data.replace(
          android,
          `${android}
        repositories {
        flatDir {
            dirs 'libs' //this way we can find the .aar file in libs folder
        }
    }`
        );
        isChange = true;
      }

      if (isChange === true) {
        fs.writeFile(appGradle, data, "utf8", function (err) {
          if (err) {
            throw new Error("Unable to write into 引用资源包: " + err);
          }
        });
      }
    });
  }
  //在项目级build.gradle中添加
  let projectGradle = path.join(platformRoot, "/build.gradle");
  if (fs.existsSync(projectGradle)) {
    fs.readFile(projectGradle, "utf8", function (err, data) {
      if (err) {
        throw new Error("Unable to find build.gradle: " + err);
      }

      let isChange = false; // 是否需要修改文件
      let allprojectsIndex = data.indexOf(`allprojects {`); //allprojects字符串的位置，用于划分文件部分

      //添加阿里云仓库地址
      let aliMaven = `
        // 添加阿里云仓库地址
        maven{ url 'https://maven.aliyun.com/nexus/content/repositories/releases/'}`;
      let firstPart = data.slice(0, allprojectsIndex); //文件截止至allprojects字符串的上半部分
      let lastPart = data.slice(allprojectsIndex); //文件从allprojects字符串开始到结尾的下半部分

      if (firstPart.indexOf(`https://maven.aliyun.com/nexus/content/repositories/releases/`) == -1) {
        let firstRepositoriesIndex = firstPart.indexOf(`repositories {`);
        firstPart =
          firstPart.slice(0, firstRepositoriesIndex + 14) + aliMaven + firstPart.slice(firstRepositoriesIndex + 14);
        data = firstPart + lastPart;
        isChange = true;
      }
      if (lastPart.indexOf(`https://maven.aliyun.com/nexus/content/repositories/releases/`) == -1) {
        let firstRepositoriesIndex = lastPart.indexOf(`repositories {`);
        lastPart =
          lastPart.slice(0, firstRepositoriesIndex + 14) + aliMaven + lastPart.slice(firstRepositoriesIndex + 14);
        data = firstPart + lastPart;
        isChange = true;
      }

      // 添加emas-services插件
      let dependencies = `dependencies {`;
      if (data.indexOf("com.aliyun.ams:emas-services") == -1) {
        data = data.replace(
          dependencies,
          `${dependencies}
        // 添加emas-services插件
        classpath 'com.aliyun.ams:emas-services:1.0.1'`
        );
        isChange = true;
      }

      //添加HMS Core SDK的Maven仓地址
      let hms = `https://developer.huawei.com/repo/`;
      if (data.indexOf(hms, allprojectsIndex) == -1) {
        let repositoriesIndex = data.indexOf(`repositories {`, allprojectsIndex);
        const HMSDK = `repositories {
        // 配置HMS Core SDK的Maven仓地址
        maven {url 'https://developer.huawei.com/repo/'}`;
        data = data.slice(0, repositoriesIndex) + HMSDK + data.slice(repositoriesIndex + 14);
        isChange = true;
      }
      //添加魅族配置依赖
      let mavenCentral = `
        mavenCentral()`;
      if (data.indexOf(`mavenCentral()`, allprojectsIndex) == -1) {
        let repositoriesIndex = data.indexOf(`repositories {`, allprojectsIndex);
        data = data.slice(0, repositoriesIndex + 14) + mavenCentral + data.slice(repositoriesIndex + 14);
        isChange = true;
      }

      if (isChange === true) {
        fs.writeFile(projectGradle, data, "utf8", function (err) {
          if (err) throw new Error("Unable to write into 项目级build.gradle: " + err);
        });
      }
    });
  }
};
