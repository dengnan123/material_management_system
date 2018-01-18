/**
 * 出库表模块
 */
function OutTable() {
    const ComponontModel = require('../models/ComponentModel')
    const OutTableModel = require('../models/OuttableModel');
    const StorageModel = require('../models/StorageModel');
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
    const moment = require('moment');
    const _ = require('lodash');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
    /**出库检索条件
     * 负责人：MC_Z
     * company_id@公司ID
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

    this.WareOutNeed = (req, res) => {
        const { company_id } = req.body;
        async.auto({
            WarehouseList: (callback) => {
                StorageModel.find({ company_id: company_id }, { 'warehouse_id': 1, 'warehouse_name': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            },
            OutType: (callback) => {
                BasicinfoModel.findOne({ company_id: company_id }, { 'outstock_type': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result.outstock_type)
                    }
                })
            },
            OutUser: (callback) => {
                callback(null, [])
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "OutTableModel.WareOutNeed"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "OutTableModel.WareOutNeed"
                })
            }
        })
    };

    /**获取配件批次和序列号
     * 负责人:MC_Z
     * part_id@配件ID
     * warehouse_id@仓库ID
     * company_id@公司ID
     * pn_id@批次ID
     * 说明：如果只需要获取出库批次号，POST 参数：part_id,warehouse_id,company_id
     *  如果需要获取出库序列号，POST参数 ：part_id,pn_id,company_id
     */
    this.PnAndSerialGet = (req, res) => {
        const { part_id, warehouse_id, company_id, pn_id } = req.body;
        async.auto({
            Pns: (callback) => {
                if (!pn_id) {
                    BatchModel.find({
                        part_id: part_id,
                        warehouse_id: warehouse_id,
                        company_id: company_id,
                        'pn_in_quantity': { $gt: 0 }
                    }, (err, result) => {
                        if (err) {
                            callback(ErrInfo.error_10001, err)
                        } else {
                            callback(null, result)
                        }
                    })
                } else {
                    callback(null, [])
                }
            },
            Serial: (callback) => {
                if (pn_id) {
                    SerialModel.find({
                        part_id: part_id,
                        pn_id: pn_id,
                        company_id: company_id,
                        'serial_state.state_value': 1
                    }, (err, result) => {
                        if (err) {
                            callback(ErrInfo.error_10001, err)
                        } else {
                            callback(null, result)
                        }
                    })
                } else {
                    callback(null, [])
                }
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "OutTableModel.PnAndSerialGet"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "OutTableModel.PnAndSerialGet"
                })
            }
        })
    };

    /**出库操作
     * 负责人:MC_Z
     * company_id@公司ID
     * warehouse_id@仓库ID
     * warehouse_name@仓库名字
     * user_id@领料人ID
     * user_name@领料人名字
     * out_time@出库时间
     * parts_list@出库配件数组
     * create_time@出库单创建时间
     * Application_number@领用申请单号
     */
    this.WareOutPut = (req, res) => {
        const { company_id, Application_number, warehouse_id, type_name, type_id, operator_user_id, operator_user_name, picking_user_id, picking_user_name, out_time, parts_list, out_Pn, out_Serial, OutObj } = req.body;

        async.auto({
            //配件处理
            PartDeal: (callback) => {
                parts_list.forEach((item) => {
                    ComponontModel.findOne({ part_id: item.part_id }, {
                        warehouse_list: 1,
                        'safe_state.state_name': 1,
                        'safe_state.state_value': 1,
                        'is_set_safe.is_on': 1
                    }, (err, result) => {
                        let safe_state = result.is_set_safe.safe_state;
                        let warehouse_list = result.warehouse_list;
                        let is_on = result.is_set_safe.is_on;
                        let unsafe = [];
                        //找到仓库
                        for (index of warehouse_list) {
                            if (index.warehouse_id == warehouse_id) {
                                index.stock = index.stock - Number(item.out_quantity);
                            }
                        }
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
                        ComponontModel.update({ part_id: item.part_id }, {
                            $inc: { part_quantity: -Number(item.out_quantity) },
                            safe_state: safe_state,
                            warehouse_list: warehouse_list
                        }, (err, result) => {
                            console.log(result)
                        })
                    })
                })
                callback(null, 'ok')
            },
            //ref处理
            RefDeal: (callback) => {
                StorageModel.findOne({ 'warehouse_id': warehouse_id }, { '_id': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result._id)
                    }
                })
            },
            //生成出库表单
            OutForm: ['RefDeal', (data, callback) => {
                console.log('picking_user_id', picking_user_id);
                console.log('picking_user_id', picking_user_name);

                let option = {
                    company_id: company_id,
                    Application_number: Application_number,
                    outtable_id: uuid.v1(),
                    outtable_number: orderNumber(),
                    warehouse_id: warehouse_id,
                    warehouse_info: data.RefDeal,
                    operator: {
                        user_id: operator_user_id,  //操作人
                        user_name: operator_user_name
                    },
                    picking: {
                        user_id: picking_user_id, //领料人
                        user_name: picking_user_name
                    },
                    out_time: out_time,
                    out_type: {
                        type_name: type_name,  //出库类型名字
                        type_id: type_id  //出库类型ID
                    },
                    create_time: new Date().getTime(),
                    parts_list: parts_list,
                    OutObj: OutObj
                };
                OutTableModel.create(option, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {

                        // res.send(result);
                        // return;

                        callback(null, result.outtable_number)
                    }
                })
            }],
            //改变申请单里面的发货数量
            Quantity_state: ['OutForm', (data, callback) => {
                console.log('11111')
                if (Application_number) {
                    let query = {
                        Application_number
                    };
                    async.concatSeries(parts_list, (index, callback1) => {
                        let part_id = index.part_id;
                        let out_quantity = index.out_quantity;
                        ApplicationModel.update({ 'Application_number': Application_number, 'parts_list.part_id': part_id }, { $inc: { 'parts_list.$.shipments_quantity': out_quantity, 'parts_list.$.outgoing_quantity': `-${out_quantity}` } }, (err, result) => {
                            if (err) {
                                callback1(ErrInfo.error_10010, err);
                                return;
                            }
                            console.log('data2222')
                            callback1(null, result)
                        })
                    }, (err, result) => {
                        if (err) {
                            callback(ErrInfo.error_10010, err);
                            return;
                        }
                        callback(null, result);
                    })
                } else {
                    callback(null, 'ok')
                }
            }],
            //改变申请领用单里面的发货状态
            //BY Dany
            Change_state: ['Quantity_state', (data, callback) => {
                if (Application_number) {
                    let query = {
                        Application_number
                    };
                    ApplicationModel.findOne(query, (err, result) => {
                        if (err) {
                            callback(ErrInfo.error_10010, err);
                            return;
                        }
                        let list = result.parts_list;
                        let application_quantity_ = 0;
                        let out_quantity = 0;
                        let arr = [];
                        let arr4 = [];
                        let arr5 = [];
                        for (index of parts_list) {
                            let part_id = index.part_id;
                            arr4.push(part_id);
                            for (item of list) {
                                application_quantity_ = application_quantity_ + item.application_quantity;
                                let part_id_ = item.part_id;
                                arr5.push(part_id_);
                                if (part_id == part_id_) {
                                    out_quantity = out_quantity + index.out_quantity;
                                }
                            }
                        }
                        // 用lodash处理 出库配件里面有没有申请单里面的配件，没有的话arr4数组不会变
                        let result1 = _.difference(arr4, arr5);

                        for (index of list) {
                            let outgoing_quantity = index.outgoing_quantity;
                            let application_quantity = index.application_quantity;
                            console.log('outgoing_quantity', outgoing_quantity)
                            if (outgoing_quantity <= 0) {
                                arr.push(1);
                            }
                        }
                        if (arr.length == list.length) {
                            ApplicationModel.update(query, { 'state.state_name': '发货完成', 'state.state_value': '0', "$addToSet": { "shipment_number": data.OutForm } }, (err, data) => {
                                if (err) {
                                    callback(ErrInfo.error_10010, err);
                                    return;
                                }
                                console.log('4')
                                callback(null, list);
                            })
                        }
                        else if (out_quantity !== application_quantity_ || arr4.length == result1.length) {
                            ApplicationModel.update(query, { 'state.state_name': '部分发货', 'state.state_value': '2', "$addToSet": { "shipment_number": data.OutForm } }, (err, data) => {
                                if (err) {
                                    callback(ErrInfo.error_10010, err);
                                    return;
                                }
                                console.log('6')
                                callback(null, list);
                            })
                        }
                        else {
                            ApplicationModel.update(query, { 'state.state_name': '未发货', 'state.state_value': '1', "$addToSet": { "shipment_number": data.OutForm } }, (err, data) => {
                                if (err) {
                                    callback(ErrInfo.error_10010, err);
                                    return;
                                }
                                console.log('6')
                                callback(null, list);
                            })
                        }
                    })
                } else {
                    callback(null, 'ok')
                }
            }],
            //批次号处理
            Pn_deal: (callback) => {
                if (out_Pn.length > 0) {
                    out_Pn.forEach((item) => {
                        BatchModel.update({
                            'part_id': item.part_id,
                            'warehouse_id': item.warehouse_id,
                            'pn_id': item.pn_id
                        }, { $inc: { 'pn_in_quantity': -item.pn_out_quantity } }, (err, result) => {
                            if (err) {
                                callback(null, err);
                                return
                            }
                        })
                    });
                    callback(null, 'ok')
                } else {
                    callback(null, 'ok')
                }
            },
            //序列号处理
            Serial: (callback) => {
                if (out_Serial.length > 0) {
                    out_Serial.forEach((item) => {
                        SerialModel.update({ 'serial_id': item.serial_id }, {
                            'serial_state.state_value': 2,
                            'serial_state.state_name': '删除'
                        }, (err, result) => {
                            if (err) {
                                callback(null, err);
                                return
                            }
                            console.log(result)
                        })
                    })
                    callback(null, 'ok')
                } else {
                    callback(null, 'ok')
                }
            }
        }, (err, result) => {
            if (err) {

                res.send({
                    error_msg: err,
                    api_name: "OutTableModel.WareOutPut"
                })
            } else {
                console.log(result)
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "OutTableModel.WareOutPut"
                })
            }
        })
    };


    /**出库列表
     * company_id@公司ID
     * warehouse_id@仓库ID
     * type_id@出库类型ID
     * user_id@领料人ID
     * currentPage@页数
     * pageSize@一页多少
     */
    this.OutList = (req, res) => {
        let { warehouse_id, type_id, user_id, currentPage, pageSize, company_id, outtable_number } = req.body;
        let condition = {};
        async.auto({
            //查询条件
            condition: (callback) => {
                condition['company_id'] = company_id;
                warehouse_id ? condition['warehouse_id'] = warehouse_id : false;
                type_id ? condition['out_type.type_id'] = type_id : false;
                user_id ? condition['picking.user_id'] = user_id : false;
                outtable_number ? condition['outtable_number'] = { $regex: outtable_number } : false;
                callback(null, 'OK')
            },
            list: (callback) => {
                let skipnum = (currentPage - 1) * pageSize; //跳过数
                let sort = { '_id': -1 };
                let info = {};
                OutTableModel.count(condition, (err, result) => {
                    let count_pages = Math.ceil((result) / pageSize);
                    info.count_pages = count_pages;
                    info.all_count = result;
                    OutTableModel.find(condition, {
                        'outtable_number': 1,
                        'operator.user_name': 1,
                        'picking.user_name': 1,
                        'out_type.type_name': 1,
                        'out_time': 1,
                        'warehouse_info': 1,
                        'create_time': 1,
                        'outtable_id': 1,
                        'OutObj': 1
                    }).populate({ path: 'warehouse_info', select: 'warehouse_name' }).skip(skipnum).limit(pageSize).sort(sort).exec((err, result) => {
                        if (err) {
                            callback(ErrInfo.error_10001, err)
                        } else {
                            info.data = result;
                            callback(null, info)
                        }
                    })
                });
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "OutTableModel.OutList"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result.list,
                    api_name: "OutTableModel.OutList"
                })
            }
        })
    };


    /**出库详情查询
     * warehouse_id@公司ID
     * type_id@出库类型ID
     * user_id@领料人ID
     */
    this.OuttableModel_find = (req, res) => {
        let { company_id, warehouse_id, type_id, user_id, outtable_number, page_size = 8, current_page = 1 } = req.body;
        let query = {};
        query['company_id'] = company_id;
        if (outtable_number) {
            query['outtable_number'] = { $regex: outtable_number };
        }
        if (warehouse_id) {
            query['warehouse_id'] = warehouse_id;
        }
        if (type_id) {
            query['out_type.type_id'] = type_id;
        }
        if (user_id) {
            query['picking.user_id'] = user_id;
        }
        let skipnum = (current_page - 1) * page_size;
        let field = 'out_time out_type.type_name create_time outtable_number warehouse_info outtable_id picking.user_name OutObj'
        async.waterfall([
            (callback) => {
                OutTableModel.count(query, (err, count) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, count);
                });
            },
            (count, callback) => {
                OutTableModel.find(query, field).populate('warehouse_info', 'warehouse_name').skip(skipnum).limit(page_size).sort({ '_id': -1 }).exec((err, result) => {
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
                    api_name: 'OutTableModel.OuttableModel_find',
                    error_msg: ErrInfo.error_10001
                });
                return;
            }
            res.send({
                api_name: 'OutTableModel.OuttableModel_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'current_page': current_page,
                    'page_size': page_size,
                    'data': result
                }
            })
        })
    };

    /**出入库配件筛选
     * page_size@一页的页数
     * part_name@配件名字
     * warehouse_id@仓库ID
     * category_ids@分类ID数组
     * current_page@当前的页数
     */
    this.ComponontModel_init_find = (req, res) => {
        let { company_id, category_ids, page_size = 5, part_name, warehouse_id } = req.body;
        console.log('3333333', category_ids)
        let current_page = req.body.current_page || 1;
        let skipnum = (current_page - 1) * page_size;
        let query = {};
        if (company_id) {
            query['company_id'] = company_id;
        };
        if (category_ids) {
            if (category_ids[0] !== "-1") {
                query['category_id'] = { $in: category_ids };
            }
        }
        if (warehouse_id) {
            query['warehouse_list.warehouse_id'] = warehouse_id;
        }
        if (part_name) {
            query['$or'] = [
                { 'part_name': { '$regex': part_name, $options: '$i' } },
                { 'part_number': { '$regex': part_name, $options: '$i' } }
            ]
        }
        async.waterfall([
            (callback) => {
                ComponontModel.count(query).exec((err, count) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    callback(null, count)
                })
            },
            (data, callback) => {
                ComponontModel.find(query).skip(skipnum).limit(page_size).sort({ '_id': -1 }).exec((err, result) => {
                    if (err) {
                        callback(null, err)
                        return
                    }
                    callback(null, {
                        count: data,
                        result: result
                    })
                })
            }
        ], (err, result) => {
            if (err) {
                res.send({
                    api_name: 'OutTableModel.ComponontModel_init_find',
                    error_msg: ErrInfo.error_10010,
                })
                return;
            }
            // 把每个仓库里面的配件库存拿出来，不显示配件的总库存
            let result_ = JSON.parse(JSON.stringify(result.result))

            for (let i = 0; i < result_.length; i++) {
                let warehouse_list = result_[i].warehouse_list;
                for (let j = 0; j < warehouse_list.length; j++) {
                    let warehouse_id_ = warehouse_list[j].warehouse_id;
                    console.log('warehouse_id_', warehouse_id_);
                    if (warehouse_id_ == warehouse_id) {
                        let stock_ = warehouse_list[j].stock;
                        result_[i].warehouse_quantity = stock_;
                    }
                }

            }
            console.log('result.count', result.count);
            console.log('result.result', result.result);
            console.log('result', result)
            res.send({
                api_name: 'OutTableModel.ComponontModel_init_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'page_size': page_size,
                    'current_page': current_page,
                    "count": result.count,
                    'data': result_
                }
            })
        })
    }

    /**进入出库表 的初始化查询
     *
     */
    this.OuttableModel_init_find = (req, res) => {
        async.waterfall([
            (callback) => {
                StorageModel.find({ 'company_id': company_id }, 'warehouse_name warehouse_id').then((data) => {
                    callback(null, data);
                })
            },
            (data, callback) => {
                let arr = [];
                for (let i = 0; i < data.length; i++) {
                    let _id = data[i].warehouse_id
                    arr.push(_id);
                }
                let query = {
                    'warehouse_list.warehouse_id': { $in: arr }
                };
                ComponontModel.find(query, 'warehouse_list.warehouse_id part_id', (err, result) => {
                    callback(null, result)
                })
            }
        ], (err, data) => {
            if (err) {
                res.send({
                    api_name: 'OutTableModel.OuttableModel_init_find',
                    error_msg: ErrInfo.error_10010
                })
                return;
            }
            res.send({
                api_name: 'OutTableModel.OuttableModel_init_find',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': data
                }
            })
        })
    }
    /**
     * 出库单个查看详情
     * company_id@公司ID
     * outtable_id@出库单ID
     *
     */
    this.OuttableModel_details = (req, res) => {
        let { company_id, outtable_id } = req.body;
        let query = {
            company_id,
            outtable_id
        };
        let field = 'out_time out_type.type_name create_time outtable_number warehouse_info outtable_id picking.user_name OutObj'
        OutTableModel.findOne(query, field).populate('warehouse_info', 'warehouse_name').exec((err, result) => {
            if (err) {
                res.send({
                    api_name: 'OutTableModel.OuttableModel_details',
                    error_msg: ErrInfo.error_10010,
                    code: '1'
                })
                return;
            }
            res.send({
                api_name: 'OutTableModel.OuttableModel_details',
                error_msg: 'ok',
                response: {
                    'data': result
                },
                code: '0'
            })
        })
    }
    /**
    * BY Dany
    * 出库订单导出
    * warehouse_id@公司ID
    * type_id@入库类型
    * user_id@领料人ID
    * company_id@公司ID
    * outtable_number@入库编号
    * 
    */
    this.OuttableModel_export = (req, res) => {
        let { warehouse_id, type_id, user_id, company_id, outtable_number } = req.body;
        let condition = {};
        condition['company_id'] = company_id;
        warehouse_id ? condition['warehouse_id'] = warehouse_id : false;
        type_id ? condition['out_type.type_id'] = type_id : false;
        user_id ? condition['user_id'] = user_id : false;
        outtable_number ? condition['outtable_number'] = { $regex: outtable_number } : false;
        async.waterfall([
            (callback) => {
                OutTableModel.find(condition, {
                    'outtable_number': 1,
                    'operator.user_name': 1,
                    'out_type.type_name': 1,
                    'out_time': 1,
                    'warehouse_info': 1,
                    'create_time': 1
                }).populate('warehouse_info', 'warehouse_name').sort({ '_id': -1 }).exec((err, result) => {
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
                            let data = [['单号', '出库仓库', '出库类型', '出库时间', '创建人', '创建时间']];
                            let arr__ = [];
                            let now_time = orderNumber();
                            let file_name = `出库信息导出(${skipnum} - ${skipnum + item1.length})${now_time}`;
                            for (let i = 0; i < item1.length; i++) {
                                let arr_ = [];
                                let item = item1[i];
                                let outtable_number = item.outtable_number;
                                let warehouse_info = item.warehouse_info.warehouse_name;
                                let out_type = item.out_type.type_name;
                                let out_time = moment(item.out_time / 1000, 'X').format('YYYY-MM-DD');
                                let operator = item.operator.user_name;
                                let create_time = moment(item.create_time / 1000, 'X').format('YYYY-MM-DD');
                                arr_.push(outtable_number, warehouse_info, out_type, out_time, operator, create_time);
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
                    api_name: 'OutTableModel.OuttableModel_export',
                    error_msg: ErrInfo.error_10022
                })
                return;
            }
            res.send({
                api_name: 'OutTableModel.OuttableModel_export',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            })
        })
    }
}

module.exports = new OutTable();
