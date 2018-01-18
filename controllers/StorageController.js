//by  Dany
/**
 * 仓库操作
 */
function StorageController() {
    const StorageModel = require('../models/StorageModel');
    const uuid = require('uuid');
    const ErrInfo = require('../config/error_msg.json');
    const async = require('async');
    const xlsx = require('node-xlsx');
    const fs = require('fs');
    const path = require('path');
    const qiniu = require('node-qiniu');
    // var Config = require('../common/config');
    const formidable = require("formidable");
    const request = require('request');
    // const Config = require('../common/config');
    // const common = require('../common/YBCommons');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
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
    this.StorageModel_find = (req, res) => {
        let { warehouse_name, warehouse_region, company_id } = req.body;
        let query = {};
        if (warehouse_name) {
            query['warehouse_name'] = { $regex: warehouse_name, $options: '$i' };
        }
        if (company_id) {
            query['company_id'] = company_id;
        }
        let country;
        let province;
        let city;
        let area;
        let xxx;
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code !== '' && warehouse_region.warehouse_city.code !== '' && warehouse_region.warehouse_area.code !== '') {
            area = warehouse_region.warehouse_area.code;
            xxx = 'warehouse_region.warehouse_area.code';
        }
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code !== '' && warehouse_region.warehouse_city.code !== '' && warehouse_region.warehouse_area.code == '') {
            city = warehouse_region.warehouse_city.code;
            xxx = 'warehouse_region.warehouse_city.code';
        }
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code !== '' && warehouse_region.warehouse_city.code == '' && warehouse_region.warehouse_area.code == '') {
            province = warehouse_region.warehouse_province.code;
            xxx = 'warehouse_region.warehouse_province.code';
        }
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code == '' && warehouse_region.warehouse_city.code == '' && warehouse_region.warehouse_area.code == '') {
            country = warehouse_region.warehouse_country.code;
            xxx = 'warehouse_region.warehouse_country.code';
        }
        if (area || city || province || country) {
            query[xxx] = area || city || province || country;
        }
        let page_size = req.body.page_size;
        let current_page = req.body.current_page || 1;
        let skipnum = (current_page - 1) * page_size;
        async.waterfall([
            (callback) => {
                StorageModel.count(query, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                StorageModel.find(query).skip(skipnum).limit(page_size).sort({ '_id': -1 }).exec((err, result) => {
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
                    api_name: 'StorageModel.StorageModel_find',
                    error_msg: ErrInfo.error_10010
                })
                return;
            }
            res.send({
                api_name: 'StorageModel.StorageModel_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result.result,
                    'count': result.count,
                    'page_size': page_size,
                    'current_page': current_page
                }
            })
        })
    };

    /**创建仓库
     * company_id@公司ID
     * warehouse_number@仓库编号
     * warehouse_name@仓库名称
     * warehouse_region@仓库地址
     * warehouse_defined@仓库自定义
     * warehouse_public_defined@仓库公共自定义
     * warehouse_remark@仓库备注
     */

    this.StorageModel_add = (req, res) => {
        const { company_id, warehouse_number, warehouse_name, warehouse_region, warehouse_defined, warehouse_remark } = req.body;
        const warehouse_id = uuid.v1();
        const create_time = new Date().getTime();
        if (warehouse_number == undefined || warehouse_number == '') {
            res.send({
                api_name: 'StorageModel.StorageModel_add',
                error_msg: ErrInfo.error_10016
            })
            return
        }
        if (warehouse_name == undefined || warehouse_number == '') {
            res.send({
                api_name: 'StorageModel.StorageModel_add',
                error_msg: ErrInfo.error_10015
            })
            return
        }
        let option = {
            company_id,
            warehouse_id,
            warehouse_state: {
                state_name: '启用',
                state_value: '1'
            },
            warehouse_remark,
            warehouse_number,
            warehouse_name,
            warehouse_region,
            warehouse_defined,
            create_time,
        };
        async.waterfall([
            (callback) => {
                StorageModel.findOne({ 'warehouse_number': warehouse_number, 'company_id': company_id }, (err, result) => {
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
                StorageModel.findOne({ 'warehouse_name': warehouse_name, 'company_id': company_id }, (err, result) => {
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
                StorageModel.create(option, (err, result) => {
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
                    api_name: "StorageModel.StorageModel_add"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
                api_name: "StorageModel.StorageModel_add",
            })
        })

    };


    /**仓库展示信息
     * warehouse_id@仓库ID
     */

    this.StorageModel_info = (req, res) => {
        const { warehouse_id, company_id } = req.body;
        StorageModel.findOne({ 'warehouse_id': warehouse_id, 'company_id': company_id }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "StorageModel.StorageModel_info"
                })
                return;
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: {
                        'data': result
                    },
                    api_name: "StorageModel.StorageModel_info"
                })
            }
        })
    };



    /**仓库编辑
     * company_id@公司ID
     * warehouse_id@仓库号码
     * warehouse_number@仓库编号
     * warehouse_name@仓库名称
     * warehouse_region@仓库地址
     * warehouse_defined@仓库自定义
     * warehouse_public_defined@仓库公共自定义
     * warehouse_remark@仓库备注
     */
    this.StorageUpdate = (req, res) => {
        const { company_id, warehouse_id, warehouse_number, warehouse_name, warehouse_region, warehouse_defined, warehouse_state, warehouse_remark } = req.body;
        async.waterfall([
            (callback) => {
                StorageModel.findOne({ 'warehouse_number': warehouse_number, 'company_id': company_id, 'warehouse_id': { $nin: [warehouse_id] } }, (err, result) => {
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
                StorageModel.findOne({ 'warehouse_name': warehouse_name, 'company_id': company_id, 'warehouse_id': { $nin: [warehouse_id] } }, (err, result) => {
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
                StorageModel.update({ warehouse_id: warehouse_id, 'company_id': company_id }, {
                    warehouse_number: warehouse_number,
                    warehouse_name: warehouse_name,
                    warehouse_region: warehouse_region,
                    warehouse_defined: warehouse_defined,
                    warehouse_remark: warehouse_remark,
                    warehouse_state: warehouse_state
                }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    } else {
                        callback(null, result);
                    }
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "StorageModel.StorageUpdate"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: {
                        'data': result
                    },
                    api_name: "StorageModel.StorageUpdate"
                })
            }
        })
    }
    /**
     * 仓库导出
     * warehouse_name@仓库名字
     * warehouse_region@仓库地址
     */
    this.StorageModel_export = (req, res) => {
        let { warehouse_name, warehouse_region, company_id } = req.body;
        let query = {};
        if (warehouse_name) {
            query['warehouse_name'] = { $regex: warehouse_name, $options: '$i' };
        }
        if (company_id) {
            query['company_id'] = company_id;
        }
        let country;
        let province;
        let city;
        let area;
        let xxx;
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code !== '' && warehouse_region.warehouse_city.code !== '' && warehouse_region.warehouse_area.code !== '') {
            area = warehouse_region.warehouse_area.code;
            xxx = 'warehouse_region.warehouse_area.code';
        }
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code !== '' && warehouse_region.warehouse_city.code !== '' && warehouse_region.warehouse_area.code == '') {
            city = warehouse_region.warehouse_city.code;
            xxx = 'warehouse_region.warehouse_city.code';
        }
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code !== '' && warehouse_region.warehouse_city.code == '' && warehouse_region.warehouse_area.code == '') {
            province = warehouse_region.warehouse_province.code;
            xxx = 'warehouse_region.warehouse_province.code';
        }
        if (warehouse_region.warehouse_country.code !== '' && warehouse_region.warehouse_province.code == '' && warehouse_region.warehouse_city.code == '' && warehouse_region.warehouse_area.code == '') {
            country = warehouse_region.warehouse_country.code;
            xxx = 'warehouse_region.warehouse_country.code';
        }
        if (area || city || province || country) {
            query[xxx] = area || city || province || country;
        }
        async.waterfall([
            (callback) => {
                StorageModel.find(query, {
                    "warehouse_state": 1,
                    "warehouse_number": 1,
                    "warehouse_name": 1,
                    "warehouse_region": 1
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
                if (newArr.length == 0) {
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
                            let data = [['状态', '仓库编码', '仓库名', '仓库地址', '详细地址']];
                            let arr__ = [];
                            let now_time = orderNumber();
                            let file_name = `仓库信息导出(${skipnum} - ${skipnum + item1.length - 1})${now_time}`;
                            for (let i = 0; i < item1.length; i++) {
                                let arr_ = [];
                                let item = item1[i];
                                let warehouse_state = item.warehouse_state.state_name;
                                let warehouse_number = item.warehouse_number;
                                let warehouse_name = item.warehouse_name;
                                let warehouse_region = `${item.warehouse_region.warehouse_country.name}${item.warehouse_region.warehouse_province.name}${item.warehouse_region.warehouse_city.name}${item.warehouse_region.warehouse_area.name}`;
                                let warehouse_address = item.warehouse_region.warehouse_address;
                                arr_.push(warehouse_state, warehouse_number, warehouse_name, warehouse_region, warehouse_address);
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
                                    length_: item1.length
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
                    api_name: 'StorageModel.StorageModel_export',
                    error_msg: ErrInfo.error_10022
                })
                return;
            }
            res.send({
                api_name: 'StorageModel.StorageModel_export',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            })
        })
    }
    /**
     * 仓库导入
     * 
     */
    this.StorageModel_import = (req, res, path1, company_id) => {
        let path_ = path.resolve(path1);
        let path2 = path_.split(".")
        if (path2[1] !== 'xlsx') {
            res.send({
                error_msg: ErrInfo.error_10033,
                api_name: "StorageModel.StorageModel_import",
            })
            return;
        }
        let url = config.development_version;
        var obj = xlsx.parse(path_);
        let data_ = obj[0];
        let warehouse_region_arr = [];
        for (let i = 1; i < data_.data.length; i++) {
            let index = data_.data[i];
            let warehouse_number = index[0];
            let warehouse_name = index[1];
            let warehouse_region = index[2];
            warehouse_region_arr.push(warehouse_region);
            if (warehouse_name == undefined || warehouse_name == '') {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_import',
                    error_msg: ErrInfo.error_10015,
                })
                return;
            }
            if (warehouse_number == undefined || warehouse_number == '') {
                res.send({
                    api_name: 'SupplierModel.SupplierModel_import',
                    error_msg: ErrInfo.error_10016,
                })
                return;
            }
            for (let j = i + 1; j < data_.data.length; j++) {
                let item = data_.data[j];
                let warehouse_number_ = item[0];
                let warehouse_name_ = item[1];
                if (warehouse_number == warehouse_number_) {
                    res.send({
                        api_name: 'SupplierModel.SupplierModel_import',
                        error_msg: ErrInfo.error_10013,
                    })
                    return;
                }
                if (warehouse_name == warehouse_name_) {
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
                StorageModel.find({ company_id: company_id }, 'warehouse_number warehouse_name', (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    let warehouse_name_arr = [];
                    let warehouse_number_arr = [];
                    for (let i = 0; i < result.length; i++) {
                        let index = result[i];
                        warehouse_name_arr.push(index.warehouse_name);
                        warehouse_number_arr.push(index.warehouse_number);
                    }
                    callback(null, {
                        warehouse_name_arr: warehouse_name_arr,
                        warehouse_number_arr: warehouse_number_arr
                    })
                })
            },
            (data, callback) => {
                let warehouse_name_arr = data.warehouse_name_arr;
                let warehouse_number_arr = data.warehouse_number_arr;
                for (let i = 1; i < data_.data.length; i++) {
                    let index = data_.data[i];
                    let warehouse_number = index[0];
                    let warehouse_name = index[1];
                    if (warehouse_name_arr.contains(warehouse_name)) {
                        res.send({
                            api_name: 'ComponentModel.ComponentModel_add',
                            error_msg: ErrInfo.error_10023,
                            err_index: `第${i}行`
                        })
                        return;
                    }
                    if (warehouse_number_arr.contains(warehouse_number)) {
                        res.send({
                            api_name: 'ComponentModel.ComponentModel_add',
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
                    let warehouse_number = index[0];
                    let warehouse_name = index[1];
                    if (index[4] !== undefined && index[3] == undefined) {
                        res.send({
                            api_name: 'ComponentModel.ComponentModel_add',
                            error_msg: ErrInfo.error_10027,
                            err_index: `第${i}条数据`
                        })
                        return;
                    }
                    if (index[5] !== undefined && (index[3] == undefined || index[4] == undefined)) {
                        res.send({
                            api_name: 'ComponentModel.ComponentModel_add',
                            error_msg: ErrInfo.error_10028,
                            err_index: `第${i}条数据`
                        })
                        return;
                    }
                    let warehouse_country = (index[2] !== undefined) ? index[2] : '';
                    let warehouse_province = (index[3] !== undefined) ? index[3] : '';
                    let warehouse_city = (index[4] !== undefined) ? index[4] : '';
                    let warehouse_area = (index[5] !== undefined) ? index[5] : '';
                    let warehouse_address = (index[6] !== undefined) ? index[6] : '';
                    let warehouse_remark = (index[7] !== undefined) ? index[7] : '';
                    async.waterfall([
                        (callback2) => {
                            if (!warehouse_province) {
                                let province_code = '';
                                callback2(null, province_code)
                            } else {
                                let requestData = {
                                    api_name: 'linkage.linkage_province'
                                }
                                // let url = config.development_version;
                                // // var url = 'http://192.168.198.202:4002'
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
                                        console.log('2')
                                        let result = false
                                        let province_code;
                                        for (index of body.response) {
                                            let province = index.name;
                                            province = province.substring(0, 2)
                                            if (province == warehouse_province) {
                                                result = true;
                                                province_code = index.code;
                                            }
                                        }
                                        if (result == true) {
                                            callback2(null, province_code)
                                        } else {
                                            res.send({
                                                error_msg: ErrInfo.error_10029,
                                                api_name: "StorageModel.StorageModel_import",
                                                err_index: `第${i}条数据`
                                            })
                                            return;
                                        }
                                    }
                                })
                            }
                        },
                        (province_code, callback2) => {
                            if (!warehouse_city) {
                                let city_code = '';
                                callback2(null, {
                                    city_code,
                                    province_code
                                })
                            } else {
                                let requestData = {
                                    api_name: 'linkage.linkage_city'
                                }
                                // var url = 'http://192.168.198.202:4002'
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

                                            if (city == warehouse_city) {
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
                                                api_name: "StorageModel.StorageModel_import",
                                                err_index: `第${i}条数据`
                                            })
                                            return;
                                        }
                                    }
                                })
                            }

                        },
                        (data, callback2) => {
                            if (!warehouse_area) {
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
                                            if (area == warehouse_area) {
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
                                                api_name: "StorageModel.StorageModel_import",
                                                err_index: `第${i}条数据`
                                            })
                                            return;
                                        }
                                    }
                                })
                            }

                        },
                        (data, callback2) => {
                            let warehouse_region = `${warehouse_country}${warehouse_province}${warehouse_city}${warehouse_area}${warehouse_address}`;
                            let url = `http://restapi.amap.com/v3/geocode/geo?key=96538813cf6ed27bfa368eefbdb6f49d&address=${warehouse_region}`;
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
                                    obj__.warehouse_region = {
                                        longitude: longitude,
                                        latitude: latitude,
                                        warehouse_country: {
                                            code: 'CHN',
                                            name: warehouse_country
                                        }, // 供应商所在国家
                                        warehouse_province: {
                                            code: data.data.province_code,
                                            name: warehouse_province
                                        }, // 供应商所在省
                                        warehouse_city: {
                                            code: data.data.city_code,
                                            name: warehouse_city
                                        }, // 供应商所在城市
                                        warehouse_area: {
                                            code: data.area_code,
                                            name: warehouse_area
                                        },// 供应商所在区
                                        warehouse_address: warehouse_address, // 供应商地区
                                    };
                                    obj__.company_id = company_id;
                                    obj__.warehouse_id = uuid.v1();
                                    obj__.create_time = new Date().getTime();
                                    obj__.warehouse_number = warehouse_number;
                                    obj__.warehouse_name = warehouse_name;
                                    obj__.warehouse_remark = warehouse_remark;
                                    obj__.warehouse_defined = '';
                                    obj__.warehouse_state = {
                                        state_name: '启用',
                                        state_value: '1'
                                    }
                                    obj__.warehouse_public_defined = '';
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
                StorageModel.create(data, (err, result) => {
                    if (err) {
                        callback(null, err)
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                fs.unlink(path_, (err, result) => {
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
                    api_name: "ComponentModel.ComponentModel_add",
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
                api_name: "ComponentModel.ComponentModel_add"
            })
        })
    }
}

module.exports = new StorageController()