const express = require('express');
const apis = require('./api_models');
const formidable = require("formidable");
const async = require('async');
const ComponentModel = require('../controllers/ComponentController');
var router = express.Router();

router.get('/', (req, res, next) => {
    // let api_name = req.query.api_name;
    res.send('{"code":"MethodNotAllowedError","message":"GET is not allowed"}');
})

router.post('/', (req, res, next) => {
    console.log('测试方法', req.method);
    if (req.body.api_name == undefined) {
        console.log('0000000')
        let form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = './files';
        form.keepExtensions = true;
        form.parse(req, (err, fields, fiels) => {
            if (err) {
                res.send(err);
                return;
            }
            let api_name = fields.api_name;
            let path1 = fiels.file.path
            let company_id = fields.company_id
            console.log('1', api_name)
            console.log('2', path1)
            console.log('3', company_id)
            // return;
            if (typeof api_name == undefined) {
                JLSend.ressend('10008', req.body.api_name, res);
                return;
            } else {
                apply_action(api_name, req, res, path1, company_id, next);
            }
        })
    } else {
        //     api_name = req.params.api_name;
        //     console.log('2222',api_name)
        // return;
        api_name = req.body.api_name;
        if (typeof api_name == undefined) {
            JLSend.ressend('10008', req.body.api_name, res);
            return;
        } else {
            let path1;
            let company_id;
            apply_action(api_name, req, res, path1, company_id, next);
        }
    }
})
// 调用对应模块的接口方法
var apply_action = (api_name, req, res, path1, company_id, next) => {
    // console.log('111',api_name)
    var api_name_arr = api_name.split('.');
    var api_name_model = api_name_arr[0];
    var api_name_method = api_name_arr[1];
    console.log('api_name_model', api_name_model)
    console.log('api_name_method', api_name_method)
    // 判断并执行方法
    if (typeof apis[api_name_model][api_name_method] == 'function') {
        apis[api_name_model][api_name_method](req, res, path1, company_id, next);
    } else {
        JLSend.ressend('10009', req.body.api_name, res);
        return;
    }
}

module.exports = router;