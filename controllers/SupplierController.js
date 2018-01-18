//by  Dany
/**
 * 供应商操作
 */

function SupplierController() {
    const SupplierModel = require('../models/SupplierModel');
    const async = require('async');
    const uuidv1 = require('uuid/v1');
    const uuid = require('uuid');
    const ErrInfo = require('../config/error_msg.json');
    const xlsx = require('node-xlsx');
    const fs = require('fs');
    const path = require('path');
    const qiniu = require('node-qiniu');
    const formidable = require("formidable");
    const request = require('request');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
    // 条件检索
    /**
     * BY Dany
     * provider_number@供应商编号
     * provider_name@供应商名字
     * provider_region@供应商地址
     */
    let orderNumber = function () {
        let date = new Date(),
            year = String(date.getFullYear()),
            month = (date.getMonth()) + 1,
            day = String(date.getDate()),
            hours = String(date.getHours()),
            minutes = String(date.getMinutes()),
            seconds = String(date.getSeconds());
        if (month < 10) {
            month = '0' + String((date.getMonth()) + 1);
        } else {
            month = String((date.getMonth()) + 1);
        }
        if (day < 10) {
            day = '0' + String(date.getDate());
        } else {
            day = String(date.getDate());
        }
        if (hours < 10) {
            hours = '0' + String(date.getHours())
        } else {
            hours = String(date.getHours())
        }
        if (minutes < 10) {
            minutes = '0' + String(date.getMinutes())
        } else {
            minutes = String(date.getMinutes())
        }
        if (seconds < 10) {
            seconds = '0' + String(date.getSeconds());
        } else {
            seconds = String(date.getSeconds());
        }
        let rand = Math.floor(Math.random() * 899999 + 100000),
            order_number = year + month + day + hours + minutes + seconds + rand;
        return (order_number);
    };
    this.SupplierModel_find = (req, res) => {
        let query = {};
        let { provider_number, provider_name, provider_region, company_id } = req.body;
        if (provider_name) {
            query['provider_name'] = { $regex: provider_name, $options: '$i' };
        }
        if (provider_number) {
            query['provider_number'] = { $regex: provider_number, $options: '$i' };
        }
        if (company_id) {
            query['company_id'] = company_id;
        }
        let country,
            province,
            city,
            area,
            xxx;
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code !== '' && provider_region.provider_city.code !== '' && provider_region.provider_area.code !== '') {
            area = provider_region.provider_area.code
            xxx = 'provider_region.provider_area.code';
        };
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code !== '' && provider_region.provider_city.code !== '' && provider_region.provider_area.code == '') {

            city = provider_region.provider_city.code
            xxx = 'provider_region.provider_city.code';
        };
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code !== '' && provider_region.provider_city.code == '' && provider_region.provider_area.code == '') {

            province = provider_region.provider_province.code
            xxx = 'provider_region.provider_province.code';


        };
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code == '' && provider_region.provider_city.code == '' && provider_region.provider_area.code == '') {
            country = provider_region.provider_country.code
            xxx = 'provider_region.provider_country.code';
        };
        if (area || city || province || country) {

            query[xxx] = area || city || province || country;
        };

        let page_size = req.body.page_size;
        let current_page = req.body.current_page || 1;
        let skipnum = (current_page - 1) * page_size;
        async.waterfall([
            (callback) => {
                SupplierModel.count(query, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                SupplierModel.find(query).skip(skipnum).limit(page_size).sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, {
                        count: data,
                        result: result
                    });
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_find',
                    error_msg: ErrInfo.error_10010
                })
                return;
            }
            res.send({
                api_name: 'SupplierModel.SupplierModel_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result.result,
                    'count': result.count,
                    'page_size': page_size,
                    'current_page': current_page
                }
            })
        })
    }
    //增加供应商信息
    this.SupplierModel_add = (req, res) => {
        let { company_id, provider_number, provider_name, provider_region, provider_contact, provider_remark, provider_defined, provider_state } = req.body;
        let provider_id = uuidv1();
        let create_time = Math.round(new Date().getTime());
        console.log('provider_number', provider_number)
        console.log('provider_name', provider_name)
        if (provider_name == undefined || provider_name == '') {
            res.send({
                api_name: 'SupplierModel.SupplierModel_add',
                error_msg: ErrInfo.error_10015
            })
            return
        }
        if (provider_number == undefined || provider_number == '') {
            res.send({
                api_name: 'SupplierModel.SupplierModel_add',
                error_msg: ErrInfo.error_10016
            })
            return
        }
        let query = {
            create_time,
            company_id,
            provider_id,
            provider_state,
            provider_number,
            provider_name,
            provider_region,
            provider_contact,
            provider_remark,
            provider_defined
        };
        async.waterfall([
            (callback) => {
                SupplierModel.findOne({ 'provider_number': provider_number, 'company_id': company_id }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10013,
                            api_name: "StorageModel.StorageModel_add"
                        })
                        return;
                    }
                    callback(null, result)
                })
            },
            (data, callback) => {
                SupplierModel.findOne({ 'provider_name': provider_name, 'company_id': company_id }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10014,
                            api_name: "StorageModel.StorageModel_add"
                        })
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                SupplierModel.create(query, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result);
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10011,
                    api_name: "SupplierModel.SupplierModel_add"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
                api_name: "SupplierModel.SupplierModel_add",
                code: '0'
            })
        })
    };
    //供应商信息展示
    this.SupplierModel_edit = (req, res) => {
        let { provider_id, company_id } = req.body;
        let query = {
            provider_id,
            company_id
        }
        SupplierModel.findOne(query, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "SupplierModel.SupplierModel_edit"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: {
                        'data': result
                    },
                    api_name: "SupplierModel.SupplierModel_edit"
                })
            }
        })
    }
    //编辑后保存
    this.SupplierModel_save = (req, res) => {
        let { company_id, provider_id, provider_state, provider_number, provider_name, provider_remark, provider_defined, provider_general, provider_region,provider_contact } = req.body
        let query = {
            provider_state,
            provider_number,
            provider_name,
            provider_remark,
            provider_defined,
            provider_general,
            provider_region,
            provider_contact
        };
        async.waterfall([
            (callback) => {
                SupplierModel.findOne({ 'provider_number': provider_number, 'company_id': company_id, 'provider_id': { $nin: [provider_id] } }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10013,
                            api_name: "StorageModel.StorageModel_add"
                        })
                        return;
                    }
                    callback(null, result)
                })
            },
            (data, callback) => {
                SupplierModel.findOne({ 'provider_name': provider_name, 'company_id': company_id, 'provider_id': { $nin: [provider_id] } }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10014,
                            api_name: "StorageModel.StorageModel_add"
                        })
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                SupplierModel.update({ provider_id: provider_id, 'company_id': company_id }, { $set: query }, { multi: true }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result);
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_save',
                    error_msg: ErrInfo.error_10012
                })
                return;
            }
            res.send({
                api_name: 'SupplierModel.SupplierModel_save',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
            })
        })
    }
    /**
     * 供应商导出
     * provider_number@供应商编号
     * provider_name@供应商名字
     * provider_region@供应商地址
     */
    this.SupplierModel_export = (req, res) => {
        let query = {};
        let { provider_number, provider_name, provider_region, company_id } = req.body;
        if (provider_name) {
            query['provider_name'] = { $regex: provider_name, $options: '$i' };
        }
        if (provider_number) {
            query['provider_number'] = { $regex: provider_number, $options: '$i' };
        }
        if (company_id) {
            query['company_id'] = company_id;
        }
        let country,
            province,
            city,
            area,
            xxx;
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code !== '' && provider_region.provider_city.code !== '' && provider_region.provider_area.code !== '') {
            area = provider_region.provider_area.code
            xxx = 'provider_region.provider_area.code';
        };
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code !== '' && provider_region.provider_city.code !== '' && provider_region.provider_area.code == '') {

            city = provider_region.provider_city.code
            xxx = 'provider_region.provider_city.code';
        };
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code !== '' && provider_region.provider_city.code == '' && provider_region.provider_area.code == '') {

            province = provider_region.provider_province.code
            xxx = 'provider_region.provider_province.code';


        };
        if (provider_region.provider_country.code !== '' && provider_region.provider_province.code == '' && provider_region.provider_city.code == '' && provider_region.provider_area.code == '') {
            country = provider_region.provider_country.code
            xxx = 'provider_region.provider_country.code';
        };
        if (area || city || province || country) {
            query[xxx] = area || city || province || country;
        };

        async.waterfall([
            (callback) => {
                SupplierModel.find(query, {
                    "provider_number": 1,
                    "provider_name": 1,
                    "provider_contact": 1,
                    "provider_region": 1
                }).sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result);
                })
            },
            (data1, callback) => {

                //以下为了以特定的长度分割数组
                var newArr = [];
                let item__ = 5000;
                var s = parseInt(data1.length / item__);
                var n = 0;
                for (var i = 1; i <= s; i++) {
                    var star = (i - 1) * item__;
                    newArr[n++] = data1.slice(star, star + item__);
                }
                var y = data1.length - s * item__;
                if (y > 0) {
                    newArr[n++] = data1.slice(s * item__);
                }
                console.log('147258',newArr)
                if(newArr.length == 0){
                    res.send({
                        api_name: 'ApplicationModel.ApplicationModel_export',
                        error_msg: ErrInfo.error_10034
                    })
                    return;
                }
                let skipnum = 1;
                async.concatSeries(newArr, (item1, callback) => {
                    async.waterfall([
                        (callback1) => {
                            let data = [['供应商编号', '供应商名称', '供应商地址', '联系方式']];
                            let arr__ = [];
                            let now_time = orderNumber();
                            let file_name = `供应商信息导出(${skipnum} - ${skipnum+item1.length -1})${now_time}`;
                            for (let i = 0; i < item1.length; i++) {
                                let arr_ = [];
                                let item = item1[i];
                                let provider_number = item.provider_number;
                                let provider_name = item.provider_name;
                                let provider_address = item.provider_region.provider_address;
                                let provider_contact = item.provider_contact;
                                arr_.push(provider_number, provider_name, provider_address, provider_contact);
                                arr__.push(arr_);
                            }
                            data = data.concat(arr__);
                            let buffer = xlsx.build([{ name: "mySheetName", data: data }]);
                            let name = `${file_name}.xlsx`;
                            let path_ = path.resolve(`files/${name}`);
                            fs.writeFile(path_, buffer, (err, result) => {
                                if (err) {
                                    callback1(null, err)
                                    return;
                                }
                                callback1(null, {
                                    path_: path_,
                                    name: name,
                                    length_:item1.length
                                });
                            });
                        },
                        (data, callback1) => {
                            qiniu.config({
                                access_key: config_qiniu.access_key,
                                secret_key: config_qiniu.secret_key,
                            })
                            var imagesBucket = qiniu.bucket(config_qiniu.bucket);
                            let puttingStream = imagesBucket.createPutStream(data.name);
                            let readingStream = fs.createReadStream(data.path_);
                            readingStream.pipe(puttingStream)
                                .on('error', (err) => {
                                    callback1(null, err);
                                    return;
                                })
                                .on('end', (reply) => {
                                    skipnum = skipnum + data.length_;
                                    console.log('147258',skipnum)
                                    callback1(null, {
                                        data: data,
                                        response: `${config_qiniu.address}${data.name}`,
                                    })
                                })
                        }
                    ], callback)
                }, (err, result) => {
                    if (err) {
                        callback(null, err)
                        return;
                    }
                    let Arr = [];
                    for (index of result) {
                        Arr.push(index.response);
                        let path_ = index.data.path_;
                    }
                    callback(null, {
                        Arr,
                    })
                })
            },
            (data, callback) => {
                let path3 = path.resolve('files')  //文件件路径
                var files = fs.readdirSync(path3);//读取该文件夹
                files.forEach(function (file) {
                    var stats = fs.statSync(path3 + '/' + file);
                    if (stats.isDirectory()) {
                        emptyDir(path3 + '/' + file);
                    } else {
                        fs.unlinkSync(path3 + '/' + file);
                        console.log("删除文件" + path3 + '/' + file + "成功");
                    }
                });
                callback(null, data.Arr)
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_export',
                    error_msg: ErrInfo.error_10022
                })
                return;
            }
            res.send({
                api_name: 'SupplierModel.SupplierModel_export',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            })
        })
    }
    /**
     * 供应商批量导入
     * 
     */
    this.SupplierModel_import = (req, res, path1, company_id) => {
        let path_ = path.resolve(path1);
        let path2 = path_.split(".")
        let url = config.development_version;
        if (path2[1] !== 'xlsx') {
            res.send({
                error_msg: ErrInfo.error_10033,
                api_name: "SupplierModel.SupplierModel_import",
            })
            return;
        }
        var obj = xlsx.parse(path_);
        let data_ = obj[0];
        let provider_region_arr = [];
        for (let i = 1; i < data_.data.length; i++) {
            let index = data_.data[i];
            let provider_number = index[0];
            let provider_name = index[1];
            let provider_region = index[2];
            provider_region_arr.push(provider_region);
            if (provider_name == undefined || provider_name == '') {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_import',
                    error_msg: ErrInfo.error_10015,
                })
                return;
            }
            if (provider_number == undefined || provider_number == '') {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_import',
                    error_msg: ErrInfo.error_10016,
                })
                return;
            }
            for (let j = i + 1; j < data_.data.length; j++) {
                let item = data_.data[j];
                let provider_number_ = item[0];
                let provider_name_ = item[1];
                if (provider_number == provider_number_) {
                    res.send({
                        api_name: 'SupplierModel.SupplierModel_import',
                        error_msg: ErrInfo.error_10013,
                    })
                    return;
                }
                if (provider_name == provider_name_) {
                    res.send({
                        api_name: 'SupplierModel.SupplierModel_import',
                        error_msg: ErrInfo.error_10014,
                    })
                    return;
                }
            }
        }
        async.waterfall([
            //拿全部名字和编号数据
            (callback) => {
                SupplierModel.find({ company_id: company_id }, 'provider_number provider_name', (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    let provider_name_arr = [];
                    let provider_number_arr = [];
                    for (let i = 0; i < result.length; i++) {
                        let index = result[i];
                        provider_name_arr.push(index.provider_name);
                        provider_number_arr.push(index.provider_number);
                    }
                    callback(null, {
                        provider_name_arr: provider_name_arr,
                        provider_number_arr: provider_number_arr
                    })
                })
            },
            (data, callback) => {
                let provider_name_arr = data.provider_name_arr;
                let provider_number_arr = data.provider_number_arr;
                for (let i = 1; i < data_.data.length; i++) {
                    let index = data_.data[i];
                    let provider_number = index[0];
                    let provider_name = index[1];
                    if (provider_name_arr.contains(provider_name)) {
                        res.send({
                            api_name: 'SupplierModel.SupplierModel_import',
                            error_msg: ErrInfo.error_10023,
                            err_index: `第${i}行`
                        })
                        return;
                    }
                    if (provider_number_arr.contains(provider_number)) {
                        res.send({
                            api_name: 'SupplierModel.SupplierModel_import',
                            error_msg: ErrInfo.error_10024,
                            err_index: `第${i}行`
                        })
                        return;
                    }
                }
                callback(null, data)
            },
            (data, callback) => {
                let arr_ = [];
                let arr = data_.data.slice(1)
                let i = 1;
                async.concatSeries(arr, (index, callback1) => {
                    let obj__ = {};
                    let provider_number = index[0];
                    let provider_name = index[1];
                    if (index[4] !== undefined && index[3] == undefined) {
                        res.send({
                            api_name: 'SupplierModel.SupplierModel_import',
                            error_msg: ErrInfo.error_10027,
                            err_index: `第${i}条数据`
                        })
                        return;
                    }
                    console.log('index[5] ', index[5])
                    if (index[5] !== undefined && (index[3] == undefined || index[4] == undefined)) {
                        res.send({
                            api_name: 'SupplierModel.SupplierModel_import',
                            error_msg: ErrInfo.error_10028,
                            err_index: `第${i}条数据`
                        })
                        return;
                    }
                    let provider_country = (index[2] !== undefined) ? index[2] : '';
                    let provider_province = (index[3] !== undefined) ? index[3] : '';
                    let provider_city = (index[4] !== undefined) ? index[4] : '';
                    let provider_area = (index[5] !== undefined) ? index[5] : '';
                    let provider_address = (index[6] !== undefined) ? index[6] : '';
                    let provider_remark = (index[7] !== undefined) ? index[7] : '';
                    let provider_contact = (index[8] !== undefined) ? index[8] : '';
                    async.waterfall([
                        (callback2) => {
                            if (!provider_province) {
                                let province_code = '';
                                callback2(null, province_code)
                            } else {
                                let requestData = {
                                    api_name: 'linkage.linkage_province'
                                }
                               
                                request({
                                    url: url,
                                    method: "POST",
                                    json: true,
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: requestData
                                }, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        let result = false
                                        let province_code;
                                        for (index of body.response) {
                                            let province = index.name;
                                            province = province.substring(0, 2)
                                            if (province == provider_province) {
                                                result = true;
                                                province_code = index.code;
                                            }
                                        }
                                        if (result == true) {
                                            callback2(null, province_code)
                                        } else {
                                            res.send({
                                                error_msg: ErrInfo.error_10029,
                                                api_name: "SupplierModel.SupplierModel_import",
                                                err_index: `第${i}条数据`
                                            })
                                            return;
                                        }
                                    }
                                })
                            }
                        },
                        (province_code, callback2) => {
                            if (!provider_city) {
                                let city_code = '';
                                callback2(null, {
                                    city_code,
                                    province_code
                                })
                            } else {
                                let requestData = {
                                    api_name: 'linkage.linkage_city'
                                }
                              
                                request({
                                    url: url,
                                    method: "POST",
                                    json: true,
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: requestData
                                }, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        let result = false;
                                        let city_code;
                                        for (index of body.response) {
                                            let city = index.name;
                                            // console.log('城市',city)

                                            if (city == provider_city) {
                                                
                                                result = true;
                                                city_code = index.code;
                                            }
                                        }
                                        if (result == true) {
                                            callback2(null, {
                                                city_code,
                                                province_code
                                            })
                                        } else {
                                            res.send({
                                                error_msg: ErrInfo.error_10030,
                                                api_name: "SupplierModel.SupplierModel_import",
                                                err_index: `第${i}条数据`
                                            })
                                            return;
                                        }
                                    }
                                })
                            }

                        },
                        (data, callback2) => {
                            if (!provider_area) {
                                let area_code = '';
                                callback2(null, {
                                    data,
                                    area_code
                                })
                            } else {
                                let requestData = {
                                    api_name: 'linkage.linkage_area'
                                }
                               
                                request({
                                    url: url,
                                    method: "POST",
                                    json: true,
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: requestData
                                }, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        let result = false;
                                        let area_code;
                                        for (index of body.response) {
                                            let area = index.name;
                                            // console.log('数据', area)
                                            if (area == provider_area) {
                                                result = true;
                                                area_code = index.code;
                                            }
                                        }
                                        if (result == true) {
                                            callback2(null, {
                                                data,
                                                area_code
                                            })
                                        } else {
                                            res.send({
                                                error_msg: ErrInfo.error_10031,
                                                api_name: "SupplierModel.SupplierModel_import",
                                                err_index: `第${i}条数据`
                                            })
                                            return;
                                        }
                                    }
                                })
                            }

                        },
                        (data, callback2) => {
                            let provider_region = `${provider_country}${provider_province}${provider_city}${provider_area}${provider_address}`;
                          
                            let url = `http://restapi.amap.com/v3/geocode/geo?key=96538813cf6ed27bfa368eefbdb6f49d&address=${provider_region}`;
                            var uriec = encodeURI(url);
                            request(uriec, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    body = JSON.parse(body);
                                    if (body.geocodes.length == 0) {
                                        res.send({
                                            api_name: 'ComponentModel.ComponentModel_add',
                                            error_msg: ErrInfo.error_10026,
                                            err_index: `第${i}条数据`
                                        })
                                        return;
                                    }
                                    let longitude = body.geocodes[0].location.split(',')[0]
                                    let latitude = body.geocodes[0].location.split(',')[1]
                                    // let formatted_address = body.geocodes[0].formatted_address;
                                    // let adcode = body.geocodes[0].adcode;
                                    // let citycode = body.geocodes[0].citycode;
                                    // let province = body.geocodes[0].province;
                                    // let city = body.geocodes[0].city;
                                    // let district = body.geocodes[0].district;
                                    obj__.provider_region = {
                                        longitude: longitude,
                                        latitude: latitude,
                                        provider_country: {
                                            code: 'CHN',
                                            name: provider_country
                                        }, // 供应商所在国家
                                        provider_province: {
                                            code: data.data.province_code,
                                            name: provider_province
                                        }, // 供应商所在省
                                        provider_city: {
                                            code: data.data.city_code,
                                            name: provider_city
                                        }, // 供应商所在城市
                                        provider_area: {
                                            code: data.area_code,
                                            name: provider_area
                                        },// 供应商所在区
                                        provider_address: provider_address, // 供应商地区
                                    };
                                    obj__.company_id = company_id;
                                    obj__.provider_id = uuid.v1();
                                    obj__.create_time = new Date().getTime();
                                    obj__.provider_number = provider_number;
                                    obj__.provider_name = provider_name;
                                    obj__.provider_remark = provider_remark;
                                    obj__.provider_defined = '';
                                    obj__.provider_state = {
                                        state_name: '启用',
                                        state_value: '1'
                                    }
                                    obj__.provider_contact = provider_contact
                                    obj__.provider_public_defined = '';
                                    i = i + 1
                                    callback2(null, obj__)
                                }
                            })
                        }
                    ], callback1)
                }, (err, result) => {
                    if (err) {
                        callback(null, err)
                        return;
                    }
                    callback(null, result)
                })
            },
            (data, callback) => {
                SupplierModel.create(data, (err, result) => {
                    if (err) {
                        callback(null, err)
                        return;
                    }
                    callback(null, result);
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10011,
                    api_name: "SupplierModel.SupplierModel_import",
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
                api_name: "SupplierModel.SupplierModel_import"
            })
        })
    }
}
module.exports = new SupplierController();
