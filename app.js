const express = require('express');
const path = require('path');
const global = require('./common/global');
const bodyParser = require('body-parser');
const router = require('./routes/index');
const app = express();
const db = require('./common/db');
const router_pre_check = require('./routes/router_pre_check');

// 使用中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(express.static(path.join(__dirname, 'public')));
// 允许所有的请求形式
app.use(function(req, res, next) {
    req.header("Content-Type", "application/json,application/x-www-form-urlencoded");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// 使用中间件
app.use(function(req, res, next) {
    req.header("Content-Type", "application/json,application/x-www-form-urlencoded");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use('/', router);

app.listen(4004,()=>{
    console.log('listen:4004')
});
module.exports = app;