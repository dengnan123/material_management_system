const config_release = require('./config_release.json');
const config_debug = require('./config_debug.json');

let config = {};

// 开发模式
const develop_mode = "DEBUG";
//正式模式
// const develop_mode = "release";

if (develop_mode == "DEBUG") { // 开发模式
    config = config_debug;
} else { //发布模式
    config = config_release
}

module.exports = config;