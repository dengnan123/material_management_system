/**
 * 入库表模块
 */
function IntableController() {
    const IntableModel = require('../models/IntableModel');
    const StorageModel = require('../models/StorageModel');
    const ComponontModel = require('../models/ComponentModel');
    const SupplierModel = require('../models/SupplierModel');
    const BasicinfoModel = require('../models/BasicinfoModel');
    const BatchModel = require('../models/BatchlModel');
    const SerialModel = require('../models/SerialModel');
    const uuid = require('uuid');
    const async = require('async');
    const ErrInfo = require('../config/error_msg.json');
    const xlsx = require('node-xlsx');
    const fs = require('fs');
    const path = require('path');
    const qiniu = require('node-qiniu');
    const formidable = require("formidable");
    const moment = require('moment');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
    /**入库
     * 负责人：MC_Z
     * @param req
     * @param res
     * @constructor
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
    this.WareInput = (req, res) => {
        const { company_id, warehouse_id, warehouse_name, provider_id, type_name, type_id, user_id, in_time, unit_price, parts_list, in_Pn, serial_in_number, InObj } = req.body;
        if (serial_in_number.length > 0) {
            for (let i = 0; i < serial_in_number.length; i++) {
                let part_id = serial_in_number[i].part_id;
                for (let j = i + 1; j < serial_in_number.length; j++) {
                    let part_id_ = serial_in_number[j].part_id;
                    if (part_id == part_id_) {
                        let serial_number = serial_in_number[i].serial_number;
                        let serial_number_ = serial_in_number[j].serial_number;
                        console.log('pn_in_Number', serial_number)
                        console.log('pn_in_Number_', serial_number_)
                        if (serial_number == serial_number_) {
                            res.send({
                                error_msg: ErrInfo.error_10020,
                                api_name: "IntableModel.WareInput"
                            })
                            return;
                        }
                    }
                }
            }
        }
        async.auto({
            //配件信息更新
            part_update: (callback) => {
                parts_list.forEach((item) => {
                    ComponontModel.findOne({ part_id: item.part_id }, {
                        warehouse_list: 1,
                        'is_set_safe.safe_state.state_name': 1,
                        'is_set_safe.safe_state.state_value': 1,
                        'is_set_safe.is_on': 1
                    }, (err, result) => {
                        let safe_state = result.is_set_safe.safe_state;
                        console.log(safe_state);
                        let warehouse_list = result.warehouse_list;
                        let is_on = result.is_set_safe.is_on;
                        let unsafe = [];
                        let ishas = [];
                        //找到仓库
                        for (index of warehouse_list) {
                            if (index.warehouse_id == warehouse_id) {
                                index.stock = index.stock + Number(item.in_quantity);
                                ishas.push(index)
                            }
                        }
                        //如果不是新仓库进来
                        if (ishas.length > 0) {
                            //如果开启安全设置
                            if (is_on == '1') {
                                //处理仓库预警状态
                                for (index of warehouse_list) {
                                    //如果安全库存大于库存，则预警
                                    if (index.safe_stock > index.stock) {
                                        unsafe.push(index);
                                    }
                                }
                                let unsafeLen = unsafe.length;
                                if (unsafeLen == '0') {
                                    safe_state.state_name = '安全';
                                    safe_state.state_value = '1';
                                }
                                if (unsafeLen == warehouse_list.length) {
                                    safe_state.state_name = '库存不足';
                                    safe_state.state_value = '3';
                                }
                                if (unsafeLen < warehouse_list.length) {
                                    safe_state.state_name = '部分不足';
                                    safe_state.state_value = '2';
                                }
                            }
                        } else {
                            //如果新仓库进来
                            warehouse_list.push({
                                warehouse_id: warehouse_id,  //仓库ID
                                warehouse_name: warehouse_name, //仓库名称
                                stock: item.in_quantity, //配件库存
                                safe_stock: 0//安全库存
                            });
                            //如果开启安全设置并且之前状态是库存不足
                            if (is_on == '1' && safe_state.state_value == '3') {
                                safe_state.state_name = '部分不足';
                                safe_state.state_value = '2';
                            }
                        }
                        ComponontModel.update({ part_id: item.part_id }, {
                            $inc: { part_quantity: Number(item.in_quantity) },
                            'is_set_safe.safe_state': safe_state,
                            warehouse_list: warehouse_list
                        }, (err, result) => {
                            console.log(result)
                        })
                    })
                })
                callback(null, 'part_update')
            },
            //ref关联
            ref_need: (callback) => {
                let Id = {};
                StorageModel.findOne({
                    company_id: company_id,
                    warehouse_id: warehouse_id
                }, { '_id': 1 }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    Id.warehouse_info = result._id;
                    if (provider_id) {
                        SupplierModel.findOne({
                            company_id: company_id,
                            provider_id: provider_id
                        }, { '_id': 1 }, (err, result) => {
                            if (err) {
                                callback(null, err);
                                return;
                            }
                            Id.provider_info = result._id;
                            callback(null, Id)
                        })
                    } else {
                        callback(null, Id)
                    }
                })
            },
            //入库记录
            In_warehouse: ['ref_need', (data, callback) => {
                let option = {
                    company_id: company_id,
                    Intable_id: uuid.v1(),
                    Intable_number: orderNumber(),
                    warehouse_id: warehouse_id,
                    provider_id: provider_id,
                    warehouse_info: data.ref_need.warehouse_info,
                    provider_info: data.ref_need.provider_info,
                    in_type: {
                        type_name: type_name,  //入库类型名字
                        type_id: type_id  //入库类型ID
                    },
                    user_id: user_id,
                    in_time: in_time,
                    create_time: new Date().getTime(),
                    unit_price: unit_price,
                    parts_list: parts_list,
                    InObj: InObj
                };
                console.log('1111111111111111', option)
                IntableModel.create(option, (err, result) => {
                    if (err) {
                        callback(null, err)
                    } else {
                        callback(null, 'ok')
                    }
                })
            }],
            //创建批次号
            PnCreate: (callback) => {
                if (in_Pn.length > 0) {
                    BatchModel.create(in_Pn, (err, result) => {
                        if (err) {
                            callback(null, err)
                        } else {
                            callback(null, 'OK')
                        }
                    })
                } else {
                    callback(null, 'OK')
                }
            },
            //创建序列号
            Serial: (callback) => {
                if (serial_in_number.length > 0) {
                    SerialModel.create(serial_in_number, (err, result) => {
                        if (err) {
                            callback(null, err)
                        } else {
                            callback(null, 'OK')
                        }
                    })
                } else {
                    callback(null, 'ok')
                }
            }
        }, function (err, result) {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "IntableModel.WareInput"
                })
            } else {
                console.log(result);
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "IntableModel.WareInput"
                })
            }
        })
    };
    /**入库详情
     * 负责人:MC_Z
     * Intable_id@入库表ID
     */
    this.InPutInfo = (req, res) => {
        const { Intable_id } = req.body;
        IntableModel.findOne({ 'intable_id': Intable_id }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "IntableModel.InPutInfo"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "IntableModel.InPutInfo"
                })
            }
        })
    };
    // 入库表查询
    /**
    /**入库表查询
     * BY Dany
     * warehouse_id@仓库ID
     * provider_id@供应商ID
     * type_id@入库类型ID
     * page_size@一页的页数
     * current_page@当前页数
     */
    this.IntableModel_find = (req, res) => {
        let { warehouse_id, type_id, provider_id, page_size = 4, company_id, part_id, current_page = 1, Intable_number } = req.body;
        let query = {};
        query['company_id'] = company_id;
        if (Intable_number) {
            query['Intable_number'] = { $regex: Intable_number };
        }
        if (warehouse_id) {
            query['warehouse_id'] = warehouse_id;
        }
        if (provider_id) {
            query['provider_id'] = provider_id;
        }
        if (type_id) {
            query['in_type.type_id'] = type_id;
        }
        let field = 'in_time in_type.type_name create_time Intable_number warehouse_info provider_info Intable_id'
        let skipnum = (current_page - 1) * page_size;
        async.waterfall([
            (callback) => {
                IntableModel.count(query, (err, count) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, count);
                });
            },
            (count, callback) => {
                IntableModel.find(query, field).populate('warehouse_info', 'warehouse_name').populate('provider_info', 'provider_name').skip(skipnum).limit(page_size).sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, {
                        count: count,
                        result: result
                    })
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'IntableModel.IntableModel_find',
                    error_msg: ErrInfo.error_10001,
                    code: '1'
                });
                return;
            }
            res.send({
                api_name: 'IntableModel.IntableModel_find',
                error_msg: 'ok',
                response: {
                    'current_page': current_page,
                    'page_size': page_size,
                    'data': result
                },
                code: '0'
            })
        })
    };
    /**进入入库表页面的查询
     * BY Dany
     */
    this.IntableModel_init_find = (req, res) => {
        const { company_id } = req.body;
        async.parallel({
            storage_find: (callback) => {
                StorageModel.find({ company_id: company_id }, { 'warehouse_name': 1, 'warehouse_id': 1 }).then((data) => {
                    callback(null, data);
                })
            },
            instock_type_find: (callback) => {
                BasicinfoModel.find({ company_id: company_id }, { 'instock_type': 1, 'type_id': 1 }).then((data) => {
                    callback(null, data)
                })
            },
            supplier_find: (callback) => {
                SupplierModel.find({ company_id: company_id }, { 'provider_name': 1, 'provider_id': 1 }).then((data) => {
                    callback(null, data)
                })
            }
        }, (err, data) => {
            if (err) {
                res.send({
                    api_name: 'IntableModel.Intable_init_find',
                    error_msg: '查询失败',
                    code: '1'
                })
            }
            res.send({
                api_name: 'IntableModel.Intable_init_find',
                error_msg: 'ok',
                response: data,
                code: '0'
            });
        })
    };
    /**
     * BY Dany
     * 分类搜索配件的分页查询
     * part_number@配件编号
     * part_name@配件名称
     * part_type@配件型号
     * page_size@每页数据条数
     * current_page@当前页数
     * category_ids@分类ID数组
     */
    this.category_init_find = (req, res) => {
        let { category_ids, page_size, part_name } = req.body;
        let current_page = req.body.current_page || 1;
        let skipnum = (current_page - 1) * page_size;
        category_ids = (category_ids.length !== 0) ? { $in: category_ids } : undefined;
        let query = {};
        if (category_ids == undefined) {
            query = {};
        }
        if (part_name) {
            query['part_name'] = { $regex: part_name };
        }
        if (category_ids) {
            query['category_id'] = category_ids;
        }
        console.log('query.....', query)
        ComponontModel.count(query).then((count) => {
            ComponontModel.find(query).skip(skipnum).limit(page_size).sort({ '_id': -1 }).then((result) => {
                res.send({
                    api_name: 'IntableModel.category_init_find',
                    error_msg: 'ok',
                    response: {
                        'page_size': page_size,
                        'current_page': current_page,
                        "count": count,
                        'data': result
                    },
                    code: '0'
                })
            })
        })
    };
    /**
     * 通过单号查看详情
     */
    this.IntableModel_details = (req, res) => {
        let { company_id, Intable_id } = req.body;
        let query = {
            company_id,
            Intable_id
        };
        let field = 'in_time in_type.type_name create_time Intable_number warehouse_info provider_info Intable_id InObj'
        IntableModel.findOne(query, field).populate('warehouse_info', 'warehouse_name').populate('provider_info', 'provider_name').exec((err, result) => {
            if (err) {
                res.send({
                    api_name: 'IntableModel.Intable_init_find',
                    error_msg: '查询失败',
                    code: '1'
                })
                return;
            }
            res.send({
                api_name: 'IntableModel.Intable_init_find',
                error_msg: 'ok',
                response: result,
                code: '0'
            })
        })
    }
    /**
     * BY Dany
     * 同一个物料，批次号不能重复
     * part_id@配件ID
     * pn_in_Number@批次号
     * company_id@公司ID
     */
    this.Pns_find = (req, res) => {
        let { part_id, pn_in_Number, company_id } = req.body;
        let query = {
            part_id,
            pn_in_Number: { $in: pn_in_Number },
            company_id
        };
        BatchModel.findOne(query, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "IntableModel.Pns_find"
                })
                return;
            }
            if (result) {
                res.send({
                    error_msg: ErrInfo.error_10017,
                    api_name: "IntableModel.Pns_find"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                api_name: "IntableModel.Pns_find",
                response: {
                    'data': result
                }
            })
        })
    }
    /**
     * BY Dany
   * 同一个物料，序列号不能重复
   * part_id@配件ID
   * serial_number@序列号
   * company_id@公司ID
   */
    this.Serials_find = (req, res) => {
        let { part_id, serial_number, company_id } = req.body;
        let query = {
            part_id,
            serial_number: { $in: serial_number },
            company_id
        };
        SerialModel.findOne(query, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "IntableModel.Serials_find"
                })
                return;
            }
            if (result) {
                res.send({
                    error_msg: ErrInfo.error_10018,
                    api_name: "IntableModel.Serials_find"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                api_name: "IntableModel.Serials_find",
                response: {
                    'data': result
                }
            })
        })
    }
    /**
     * BY Dany
     * 入库订单导出
     * warehouse_id@公司ID
     * type_id@入库类型
     * provider_id@供应商ID
     * company_id@公司ID
     * Intable_number@入库编号
     * 
     */
    this.IntableModel_export = (req, res) => {
        let { warehouse_id, type_id, provider_id, company_id, Intable_number } = req.body;
        let query = {};
        query['company_id'] = company_id;
        if (Intable_number) {
            query['Intable_number'] = { $regex: Intable_number };
        }
        if (warehouse_id) {
            query['warehouse_id'] = warehouse_id;
        }
        if (provider_id) {
            query['provider_id'] = provider_id;
        }
        if (type_id) {
            query['in_type.type_id'] = type_id;
        }
        let field = 'in_time in_type.type_name create_time Intable_number warehouse_info provider_info Intable_id'
        async.waterfall([
            (callback) => {
                IntableModel.find(query, field).populate('warehouse_info', 'warehouse_name').populate('provider_info', 'provider_name').sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, result)
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

                            let data = [['单号', '入库仓库', '入库类型', '入库时间', '配件供应商', '创建时间']];
                            let arr__ = [];
                            let now_time = orderNumber();
                            let file_name = `入库信息导出(${skipnum} - ${skipnum + item1.length})${now_time}`;
                            for (let i = 0; i < item1.length; i++) {
                                let arr_ = [];
                                let item = item1[i];
                                let Intable_number = item.Intable_number;
                                let warehouse_info = item.warehouse_info.warehouse_name;
                                let in_type = item.in_type.type_name;
                                let in_time = moment(item.in_time / 1000, 'X').format('YYYY-MM-DD');
                                let provider_info;
                                if (item.provider_info == undefined) {
                                    provider_info = '';
                                }
                                if (item.provider_info !== undefined) {
                                    provider_info = item.provider_info.provider_name;
                                }
                                let create_time = moment(item.create_time / 1000, 'X').format('YYYY-MM-DD');
                                arr_.push(Intable_number, warehouse_info, in_type, in_time, provider_info, create_time);
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
                                    callback1(null, {
                                        data: data,
                                        response: `${config_qiniu.address}${data.name}`,
                                    })
                                })
                        }
                    ], (callback))
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
                    api_name: 'IntableModel.IntableModel_export',
                    error_msg: ErrInfo.error_10022
                })
                return;
            }
            res.send({
                api_name: 'IntableModel.IntableModel_export',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            })
        })
    }
}

module.exports = new IntableController();