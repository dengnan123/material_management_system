function Application() {
    const IntableModel = require('../models/IntableModel');
    const StorageModel = require('../models/StorageModel');
    const ComponontModel = require('../models/ComponentModel');
    const SupplierModel = require('../models/SupplierModel');
    const BasicinfoModel = require('../models/BasicinfoModel');
    const BatchModel = require('../models/BatchlModel');
    const SerialModel = require('../models/SerialModel');
    const ApplicationModel = require('../models/ApplicationModel');
    const uuid = require('uuid');
    const async = require('async');
    const ErrInfo = require('../config/error_msg.json');
    const xlsx = require('node-xlsx');
    const fs = require('fs');
    const path = require('path');
    const qiniu = require('node-qiniu');
    const formidable = require("formidable");
    const request = require('request');
    const moment = require('moment');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
    /**
     * BY Dany
     * 领用申请表新增
     * company_id@公司ID2
     * Application_id@领用单号ID
     * warehouse_id@仓库ID
     * user_id@用户ID
     * application_time@申请领用时间ß
     * work_order_number@工单号
     * parts_list@配件列表
     * Application_number@领用单号
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


    this.ApplicationModel_add = (req, res) => {
        let { warehouse_id, company_id, order_id, user_id, user_name, application_time = new Date().getTime(), work_order_number, parts_list } = req.body;
        let Application_id = uuid.v1();
        let Application_number = orderNumber();
        let shipment_number = [];
        let query = {
            company_id,
            Application_id,
            shipment_number,
            warehouse_id,
            application_time,
            parts_list,
            Application_number,
            state: {
                state_name: '未发货',
                state_value: '1'
            },
            order_id,
            user_id,
            user_name,
            work_order_number,
        }
        async.waterfall([
            (callback) => {
                StorageModel.findOne({ 'warehouse_id': warehouse_id }, '_id', (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result);
                })
            },
            //ref 关联仓库表
            (data, callback) => {
                query['warehouse_info'] = data._id
                ApplicationModel.create(query, (err, result) => {
                    if (err) {
                        callback(null, err)
                        return;
                    }
                    callback(null, result)
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'ApplicationModel.ApplicationModel_add',
                    error_msg: ErrInfo.error_10011,
                })
                return;
            }
            res.send({
                api_name: 'ApplicationModel.ApplicationModel_add',
                error_msg: ErrInfo.error_0,
                response: {
                    data: result
                }
            })
        })

    }
    /**
     * BY Dany
     * 进入领用申请页面的初始化查询
     * company_i@公司ID
     */
    this.ApplicationModel_init_find = (req, res) => {
        let { company_id } = req.body;
        async.parallel({
            storage_find: (callback) => {
                StorageModel.find({ company_id: company_id }, { 'warehouse_name': 1, 'warehouse_id': 1 }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    };
                    callback(null, result)
                })
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    api_name: 'ApplicationModel.ApplicationModel_init_find',
                    error_msg: ErrInfo.error_10010,
                });
                return;
            };
            res.send({
                api_name: 'ApplicationModel.ApplicationModel_init_find',
                error_msg: ErrInfo.error_0,
                response: {
                    data: result
                }
            })
        })
    }
    /**
     * BY Dany
     * 领用申请搜索页面列表
     * warehouse_id@仓库ID
     * user_id@用户ID
     * work_order_number@工单号
     * from_time@搜索开始日期
     * to_time@搜索截止日期
     * page_size@每页页数
     * current_page@当前页数
     * application_time@领用单创建时间
     */
    this.ApplicationModel_find = (req, res) => {
        let { company_id, warehouse_id, user_name, work_order_number, from_time, to_time, page_size = 10, current_page = 1 } = req.body;
        let query = {};
        query['company_id'] = company_id;
        if (warehouse_id) {
            query['warehouse_id'] = warehouse_id;
        }
        if (user_name) {
            query['user_name'] = user_name;
        }
        if (from_time && to_time) {
            query['application_time'] = { $gte: from_time, $lte: to_time }
        }
        if (work_order_number) {
            query['work_order_number'] = work_order_number;
        }
        console.log('query...', query)
        //过滤字段
        let field = 'Application_number warehouse_info user_name application_time state Application_id shipment_number';
        let skipnum = (current_page - 1) * page_size;
        async.waterfall([
            (callback) => {
                ApplicationModel.count(query, (err, count) => {
                    if (err) {
                        callback(null, err);
                        return;
                    };
                    callback(null, count);
                });
            },
            (count, callback) => {
                ApplicationModel.find(query, field).populate('warehouse_info', 'warehouse_name').skip(skipnum).limit(page_size).sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    };
                    callback(null, {
                        count: count,
                        result: result
                    })
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'ApplicationModel.ApplicationModel_find',
                    error_msg: ErrInfo.error_10010,
                })
                return;
            }
            res.send({
                api_name: 'ApplicationModel.ApplicationModel_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'current_page': current_page,
                    'page_size': page_size,
                    'data': result
                },
            })
        })
    }
    /**
     * 领用申请详情查看
     * _id@申请领用单ID
     * company_id@公司ID
     */
    this.ApplicationModel_details_find = (req, res) => {
        let { Application_id, company_id, order_id } = req.body;
        let query = {
            company_id
        }
        if (Application_id) {
            query['Application_id'] = Application_id;
        }
        if (order_id) {
            query['order_id'] = order_id;
        }
        console.log('query', query)
        ApplicationModel.findOne(query).populate('warehouse_info', 'warehouse_name').exec((err, result) => {
            if (err) {
                res.send({
                    api_name: 'ApplicationModel.ApplicationModel_details_find',
                    error_msg: ErrInfo.error_10010,
                })
                return;
            }
            console.log('result', result);
            res.send({
                api_name: 'ApplicationModel.ApplicationModel_details_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
            })
        })
    }
    /**
     * 查出申请单里面配件详细信息
     */
    this.Application_part_find = (req, res) => {
        let { Application_number, company_id } = req.body;
        let query = {
            company_id,
            Application_number
        }
        async.waterfall([
            (callback) => {
                ApplicationModel.findOne(query, 'parts_list warehouse_id user_name user_id', (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10010, err);
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                warehouse_id = data.warehouse_id;
                user_name = data.user_name;
                user_id = data.user_id;
                data = data.parts_list;
                console.log('1', user_name);
                let arr = [];
                for (index of data) {
                    arr.push(index.part_id)
                }
                ComponontModel.find({ 'part_id': { $in: arr } }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10010, err);
                        return;
                    }
                    let result_ = JSON.parse(JSON.stringify(result))
                    for (index of result_) {
                        for (item of data) {
                            if (item.part_id == index.part_id) {
                                console.log('1111', item.outgoing_quantity)
                                index.outgoing_quantity = item.outgoing_quantity;
                            }
                        }
                    }
                    callback(null, {
                        result_,
                        warehouse_id,
                        user_name,
                        user_id
                    });
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'ApplicationModel.Application_part_find',
                    error_msg: ErrInfo.error_10010,
                })
                return;
            }
            res.send({
                api_name: 'ApplicationModel.Application_part_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result.result_,
                    'warehouse_id': result.warehouse_id,
                    'user_id': result.user_id,
                    'user_name': result.user_name,
                },
            })
        })

    }

    /**
     * 
     * 领用申请单关闭
     * Application_id@申请单号ID
     * company_id@公司ID
     */
    this.ApplicationModel_close = (req, res) => {
        let { Application_id, company_id } = req.body;
        let query = {
            Application_id,
            company_id
        };
        console.log('1111', query)
        ApplicationModel.update(query, { 'state.state_name': '已关闭', 'state.state_value': '3' }, (err, result) => {
            if (err) {
                res.send({
                    api_name: 'ApplicationModel.ApplicationModel_close',
                    error_msg: ErrInfo.error_10010,
                })
                return;
            }
            res.send({
                api_name: 'ApplicationModel.ApplicationModel_close',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
            })
        })
    }
    /**
     * 领用申请单导出
     */
    this.ApplicationModel_export = (req, res) => {
        let { company_id, warehouse_id, user_name, work_order_number, from_time, to_time } = req.body;
        let query = {};
        query['company_id'] = company_id;
        if (warehouse_id) {
            query['warehouse_id'] = warehouse_id;
        }
        if (user_name) {
            query['user_name'] = user_name;
        }
        if (from_time && to_time) {
            query['application_time'] = { $gte: from_time, $lte: to_time }
        }
        if (work_order_number) {
            query['work_order_number'] = work_order_number;
        }
        let field = 'Application_number warehouse_info user_name application_time state Application_id shipment_number';
        async.waterfall([
            (callback) => {
                ApplicationModel.find(query, field).populate('warehouse_info', 'warehouse_name').sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    };
                    callback(null, result)
                })
            },
            (data1, callback) => {
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
                console.log('147258', newArr)
                let skipnum = 1;
                if (newArr.length == 0) {
                    res.send({
                        api_name: 'ApplicationModel.ApplicationModel_export',
                        error_msg: ErrInfo.error_10034
                    })
                    return;
                }
                async.concatSeries(newArr, (item1, callback) => {
                    async.waterfall([
                        (callback1) => {
                            let data = [['领用单号', '申请仓库', '状态', '申请人', '申请时间', '发货单号']];
                            let arr__ = [];
                            let now_time = orderNumber();
                            let file_name = `领用申请信息导出(${skipnum} - ${skipnum + item1.length})${now_time}`;
                            for (let i = 0; i < item1.length; i++) {
                                let arr_ = [];
                                let item = item1[i];
                                let Application_number = item.Application_number;
                                let user_name = item.user_name;
                                let application_time = moment(item.application_time / 1000, 'X').format('YYYY-MM-DD');
                                let warehouse_name = item.warehouse_info.warehouse_name;
                                let state = item.state.state_name;
                                let shipment_number = item.shipment_number;
                                arr_.push(Application_number, warehouse_name, state, user_name, application_time, shipment_number);
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
                    api_name: 'ApplicationModel.ApplicationModel_export',
                    error_msg: ErrInfo.error_10022
                })
                return;
            }
            res.send({
                api_name: 'ApplicationModel.ApplicationModel_export',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            })
        })

    }
}
module.exports = new Application()