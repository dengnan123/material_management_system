/**
 * 配件模块
 */
function Component() {
    const ComponentModel = require('../models/ComponentModel');
    const StorageModel = require('../models/StorageModel');
    const BasicModel = require('../models/BasicinfoModel');
    const IntableModel = require('../models/IntableModel');
    const OutTableModel = require('../models/OuttableModel');
    const BatchModel = require('../models/BatchlModel');
    const SerialModel = require('../models/SerialModel');
    const ErrInfo = require('../config/error_msg.json');
    const uuid = require('uuid');
    const async = require('async');
    const xlsx = require('node-xlsx');
    const fs = require('fs');
    const path = require('path');
    const qiniu = require('node-qiniu');
    const formidable = require("formidable");
    const request = require('request');
    const images = require('images');
    const watermark = require('text-watermark');
    const moment = require('moment');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
    // const canvas = require('canvas')
    // 搜索配件


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
    /**负责人:MC_Z
     * 寻找子节点
     * @returns {Array}
     */
    FindChildren = (id, arr) => {
        let child = {};
        for (index of arr) {
            child[index.category_id] = index.category_pid;
        }
        let bmid = id;
        let pids = new Set([bmid]);
        let len
        do {
            len = pids.size;
            for (let id in child) {
                if (pids.has(child[id])) {
                    pids.add(id);
                    delete child[id];
                }
            }
        } while (pids.size > len);
        return Array.from(pids)
    };
    //数组包涵方法
    Array.prototype.contains = function (needle) {
        for (i in this) {
            if (this[i] == needle) return true;
        }
        return false;
    }

    /**负责人:Dany
     * 新建配件
     * @param req
     * @param res
     * @constructor
     */
    this.ComponentModel_add = (req, res) => {
        const { company_id, part_number, part_name, part_type, part_remark, part_defined, part_unit, management_method, category_id } = req.body;
        const part_id = uuid.v1();
        const create_time = new Date().getTime(); // 时间戳
        if (part_name == undefined || part_name == '') {
            res.send({
                api_name: 'ComponentModel.ComponentModel_add',
                error_msg: ErrInfo.error_10015
            })
            return
        }
        if (part_number == undefined || part_number == '') {
            res.send({
                api_name: 'ComponentModel.ComponentModel_add',
                error_msg: ErrInfo.error_10016
            })
            return
        }
        let warehouse_list = [];
        let query = {
            company_id,
            part_id,
            create_time,
            part_state: {
                state_name: '启用',
                state_value: '1'
            },
            part_number,
            part_name,
            part_type,
            part_remark,
            part_defined,
            part_quantity: 0,
            part_unit,
            management_method,
            category_id,
            warehouse_list,
            is_set_safe: {
                is_on: '-1', //是否启用
                safe_state: {
                    state_name: '安全',   //1.安全，2，部分不足 3，库存不足
                    state_value: '1',
                },
            }
        };
        async.waterfall([
            (callback) => {
                ComponentModel.findOne({ 'part_number': part_number, 'company_id': company_id }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10013,
                            api_name: "ComponentModel.ComponentModel_add",
                        })
                        return;
                    }
                    callback(null, result)
                })
            },
            (data, callback) => {
                ComponentModel.findOne({ 'part_name': part_name, 'company_id': company_id }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10014,
                            api_name: "ComponentModel.ComponentModel_add",
                        })
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                ComponentModel.create(query, (err, result) => {
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
    };

    /**负责人:MC_Z
     * 配件列表
     * company_id@公司ID
     * category_id@分类数组
     * BelongToProduct@所属产品
     * safe_state@配件状态
     * part_type@配件型号
     * part_name@配件名称
     * part_number@配件编号
     * pageSize@一页多少条
     * currentPage@当前第几页
     */
    this.ComponentModel_list = (req, res) => {
        const { company_id, part_number, part_name, part_type, safe_state, BelongToProduct, category_id, currentPage } = req.body;
        let pageSize = req.body.pageSize || 15;
        let condition = {};
        async.auto({
            condition: (callback) => {
                condition['company_id'] = company_id;
                condition['part_state.state_value'] = '1';
                part_name ? condition['part_name'] = { $regex: part_name, $options: '$i' } : false;
                part_number ? condition['part_number'] = { $regex: part_number, $options: '$i' } : false;
                part_type ? condition['part_type'] = { $regex: part_type, $options: '$i' } : false;
                safe_state ? condition['is_set_safe.safe_state.state_value'] = safe_state : false;
                BelongToProduct ? condition['BelongToProduct'] = BelongToProduct : false;
                category_id.length > 0 ? condition['category_id'] = { $in: category_id } : false;
                callback(null, 'OK')
            },
            list: ['condition', (option, callback) => {
                let skipnum = (currentPage - 1) * pageSize; //跳过数
                let sort = { '_id': -1 };
                let info = {};
                ComponentModel.count(condition, (err, result) => {
                    let count_pages = Math.ceil((result) / pageSize);
                    info.count_pages = count_pages;
                    info.all_count = result;
                    ComponentModel.find(condition, {
                        'warehouse_list': 0,
                        'part_defined': 0
                    }).skip(skipnum).limit(pageSize).sort(sort).exec((err, result) => {
                        info.data = result;
                        callback(null, info)
                    })
                })

            }]
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "ComponentModel.ComponentModel_list"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result.list,
                    api_name: "ComponentModel.ComponentModel_list"
                })
            }
        })
    };

    /**库存明细
     * 负责人：MC_Z
     * company_id@公司ID
     * part_id@配件ID
     */
    this.PartInfo = (req, res) => {
        const { part_id, company_id } = req.body;
        async.auto({
            WareList: (callback) => {
                ComponentModel.findOne({
                    'company_id': company_id,
                    'part_id': part_id,
                }, { 'warehouse_list': 1, 'part_name': 1, 'management_method': 1, '_id': 0 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.PartInfo"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.PartInfo"
                })
            }
        })

    };
    /**批次明细 库存明细->批次明细
     * 负责人：MC_Z
     * warehouse_id@仓库ID
     * part_id@配件ID
     * company_id@公司ID
     */
    this.PnDetail = (req, res) => {
        const { warehouse_id, part_id, company_id } = req.body;
        async.auto({
            pn: (callback) => {
                BatchModel.find({ 'part_id': part_id, 'warehouse_id': warehouse_id, 'company_id': company_id }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            },
            BaseInfo: (callback) => {
                ComponentModel.findOne({ 'part_id': part_id, 'company_id': company_id }, { 'warehouse_list': 1, 'management_method': 1, 'part_name': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        let warehouse = result.warehouse_list;
                        let WarehouseName;
                        for (item of warehouse) {
                            if (item.warehouse_id == warehouse_id) {
                                WarehouseName = item.warehouse_name;
                            }
                        }
                        callback(null, { WarehouseName: WarehouseName, PartName: result.part_name, management_method: result.management_method })
                    }
                })
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.PnDetail"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.PnDetail"
                })
            }
        });
    };

    /**序列号明细 库存明细->序列号明细
     * 负责人：MC_Z
     * warehouse_id@仓库ID
     * part_id@配件ID
     * company_id@公司ID
     * need 配件名称  仓库名称
     */
    this.stock_SerialDetail = (req, res) => {
        const { warehouse_id, part_id, company_id, pn_id } = req.body;
        async.auto({
            serial: (callback) => {
                SerialModel.find({ 'part_id': part_id, 'warehouse_id': warehouse_id, 'company_id': company_id, 'serial_state.state_value': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            },
            BaseInfo: (callback) => {
                ComponentModel.findOne({ 'part_id': part_id, 'company_id': company_id }, { 'warehouse_list': 1, 'part_name': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        let warehouse = result.warehouse_list;
                        let WarehouseName;
                        for (item of warehouse) {
                            if (item.warehouse_id == warehouse_id) {
                                WarehouseName = item.warehouse_name;
                            }
                        }
                        callback(null, { WarehouseName: WarehouseName, PartName: result.part_name })
                    }
                })
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.stock_SerialDetail"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.stock_SerialDetail"
                })
            }
        });
    };

    /**序列号明细 批次明细->序列号明细
     * 负责人：MC_Z
     * part_id@配件ID
     * company_id@公司ID
     * pn_id@批次ID
     */
    this.Pn_SerialDetail = (req, res) => {
        const { pn_id, part_id, company_id, warehouse_id } = req.body;
        async.auto({
            serial: (callback) => {
                SerialModel.find({ 'pn_id': pn_id, 'part_id': part_id, 'company_id': company_id, 'serial_state.state_value': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            },
            BaseInfo: (callback) => {
                ComponentModel.findOne({ 'part_id': part_id, 'company_id': company_id }, { 'warehouse_list': 1, 'part_name': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        let warehouse = result.warehouse_list;
                        let WarehouseName;
                        for (item of warehouse) {
                            if (item.warehouse_id == warehouse_id) {
                                WarehouseName = item.warehouse_name;
                            }
                        }
                        callback(null, { WarehouseName: WarehouseName, PartName: result.part_name })
                    }
                })
            }
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.Pn_SerialDetail"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.Pn_SerialDetail"
                })
            }
        });
    };


    /**配件仓库设置
     * 负责人：MC_Z
     * company_id@公司ID
     * warehouse_id@仓库ID
     * part_id@配件ID
     * safe_stock@安全库存
     * warehouse_position@仓库位置
     */
    this.PartSet = (req, res) => {
        const { company_id, warehouse_id, part_id, safe_stock, warehouse_position } = req.body;
        async.auto({
            Find: (callback) => {
                ComponentModel.findOne({ part_id: part_id, company_id: company_id }, { 'warehouse_list': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        let warehouse_list = result.warehouse_list;

                        for (item of warehouse_list) {
                            if (item.warehouse_id == warehouse_id) {
                                item.safe_stock = safe_stock;
                                item.warehouse_position = warehouse_position;
                            }
                        }
                        callback(null, warehouse_list)
                    }
                })
            },
            Set: ['Find', (data, callback) => {
                let safe = [];
                let WarehouseList = data.Find;
                let is_set_safe = {
                    is_on: 1,
                    safe_state: {
                        state_value: 1,
                        state_name: '安全'
                    }
                };
                //如果安全库存大于当前库存
                for (item of WarehouseList) {
                    if (item.safe_stock > item.stock) {
                        safe.push(item)
                    }
                }
                if (0 < safe.length && safe.length < WarehouseList.length) {
                    is_set_safe.safe_state.state_name = '部分不足';
                    is_set_safe.safe_state.state_value = '2';
                }
                if (safe.length == WarehouseList.length) {
                    is_set_safe.safe_state.state_name = '库存不足';
                    is_set_safe.safe_state.state_value = '3';
                }
                ComponentModel.update({ part_id: part_id, company_id: company_id }, { 'warehouse_list': data.Find, 'is_set_safe': is_set_safe }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            }]
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.PartSet"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.PartSet"
                })
            }
        })
    };


    /**负责人:MC_Z
     * 添加配件标签
     *company_id@公司ID
     *category_icon@配件图标
     *category_name@标签名字
     *category_pid@配件PID
     */
    this.category_add = (req, res) => {
        const { company_id, category_icon, category_name, category_pid } = req.body;
        let category_id = uuid.v1();
        let category = {
            category_icon: category_icon, // 分类图标
            category_id: category_id, // 分类ID
            category_name: category_name, // 分类名称
            category_pid: category_pid, // 分类PID
            product_category_state: {
                state_name: '启用',
                state_value: '1'
            }
        };
        BasicModel.update({ company_id: company_id }, { $push: { 'accessories_category': category } }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10001,
                    api_name: "ComponentModel.category_add"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: category_id,
                    api_name: "ComponentModel.category_add"
                })
            }
        })
    };

    /**负责人:MC_Z
     * 配件标签修改
     * company_id@公司ID
     * category_icon@配件图标
     * category_name@标签名字
     * category_pid@配件PID
     */
    this.category_edit = (req, res) => {
        const { company_id, category_id, category_pid, category_name, category_icon, state_name, state_value } = req.body;
        console.log('14789563')
        console.log('category_name', category_name)
        BasicModel.findOne({ company_id: company_id }, { '_id': 0, 'accessories_category': 1 }, (err, result) => {
            if (err) {
                res.send({
                    err_msg: ErrInfo.error_10001,
                    api_name: "ComponentModel.category_list"
                })
            } else {
                let accessories_category = result.accessories_category;
                let ids = FindChildren(category_id, accessories_category);
                for (item of accessories_category) {
                    if (item.category_id == category_id) {
                        item.category_pid = category_pid;
                        item.category_name = category_name;
                        item.category_icon = category_icon;
                        item.product_category_state.state_name = state_name;
                        item.product_category_state.state_value = state_value;
                    }
                }
                //递归
                if (state_value == '2') {
                    for (item of accessories_category) {
                        for (item2 of ids) {
                            if (item.category_id == item2) {
                                item.product_category_state.state_name = state_name;
                                item.product_category_state.state_value = state_value;
                            }
                        }
                    }
                }
                BasicModel.update({ company_id: company_id }, { accessories_category: accessories_category }, (err, result) => {
                    if (err) {
                        res.send({
                            error_msg: ErrInfo.error_10001,
                            api_name: "ComponentModel.category_edit"
                        })
                    } else {
                        res.send({
                            error_msg: ErrInfo.error_0,
                            response: result,
                            api_name: "ComponentModel.category_edit"
                        })
                    }
                })
            }
        })
    };

    /**配件标签列表
     * company_id@公司ID
     */
    this.category_list = (req, res) => {
        const { company_id } = req.body;
        async.auto({
            judge: (callback) => {
                BasicModel.findOne({ company_id: company_id }, { '_id': 0, 'accessories_category': 1 }, (err, result) => {
                    if (err) {
                        callback(ErrInfo.error_10001, err)
                    } else {
                        callback(null, result)
                    }
                })
            },
            final: ['judge', (result, callback) => {
                if (result.judge) {
                    callback(null, result.judge.accessories_category)
                } else {
                    let option = {
                        company_id: company_id,
                        accessories_category: [{
                            category_icon: '',
                            category_id: '-1',
                            category_name: '所有分类',
                            category_pid: '',
                            product_category_state: {
                                state_name: '启用',
                                state_value: '1'
                            }
                        }],
                        instock_type: [],
                        outstock_type: [],
                        warning_state: []
                    };
                    BasicModel.create(option, (err, result) => {
                        if (err) {
                            callback(ErrInfo.error_10001, err)
                        } else {
                            callback(null, result.accessories_category)
                        }
                    })
                }
            }],
        }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.category_list"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result.final,
                    api_name: "ComponentModel.category_list"
                })
            }
        })
    };
    //配件信息展示
    this.ComponentModel_info = (req, res) => {
        const { part_id, company_id } = req.body;
        ComponentModel.findOne({ part_id: part_id, 'company_id': company_id }, (err, result) => {
            if (err) {
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.ComponentModel_info"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.ComponentModel_info"
                })
            }
        })
    };

    //编辑后保存
    this.ComponentModel_save = (req, res) => {
        let { part_id, _id, company_id, part_state, part_number, part_name, management_method, category_id, part_type, part_unit, part_remark, part_defined } = req.body;
        if (part_name == undefined || part_name == '') {
            res.send({
                api_name: 'ComponentModel.ComponentModel_add',
                error_msg: ErrInfo.error_10015
            })
            return
        }
        if (part_number == undefined || part_number == '') {
            res.send({
                api_name: 'ComponentModel.ComponentModel_add',
                error_msg: ErrInfo.error_10016
            })
            return
        }
        async.waterfall([
            (callback) => {
                ComponentModel.findOne({ 'part_number': part_number, 'company_id': company_id, 'part_id': { $nin: [part_id] } }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10013,
                            api_name: "ComponentModel.ComponentModel_add",
                        })
                        return;
                    }
                    callback(null, result)
                })
            },
            (data, callback) => {
                ComponentModel.findOne({ 'part_name': part_name, 'company_id': company_id, 'part_id': { $nin: [part_id] } }, (err, result) => {
                    console.log('.........0000')
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    if (result) {
                        res.send({
                            error_msg: ErrInfo.error_10014,
                            api_name: "ComponentModel.ComponentModel_add",
                        })
                        return;
                    }
                    callback(null, result);
                })
            },
            (data, callback) => {
                ComponentModel.update({ part_id: part_id, 'company_id': company_id }, {
                    'part_number': part_number,
                    'part_name': part_name,
                    'management_method': management_method,
                    'category_id': category_id,
                    'part_type': part_type,
                    'part_unit': part_unit,
                    'part_remark': part_remark,
                    'part_defined': part_defined,
                    'part_state': part_state
                }, (err, result) => {
                    console.log('.........1111')
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
                console.log('2222222222')
                res.send({
                    error_msg: err,
                    api_name: "ComponentModel.ComponentModel_save"
                })
            } else {
                res.send({
                    error_msg: ErrInfo.error_0,
                    response: result,
                    api_name: "ComponentModel.ComponentModel_save"
                })
            }
        })
    };
    // 库存详情
    this.ComponentModel_details = (req, res) => {
        let { part_id, company_id } = req.body;
        let query = {};
        if (part_id) {
            query['part_id'] = part_id;
        }
        if (company_id) {
            query['company_id'] = company_id;
        }
        async.waterfall([
            (callback) => {
                ComponentModel.findOne(query, 'warehouse_list').then((info) => {
                    let result = info.warehouse_list;
                    let arr = [];
                    for (let i = 0; i < result.length; i++) {
                        let warehouse_id = result[i].warehouse_id
                        console.log('let warehouse_id', warehouse_id)
                        arr.push(warehouse_id)
                    }
                    callback(null, {
                        arr: arr,
                        result: result
                    })
                })
            },
            (result, callback) => {
                StorageModel.find({
                    "warehouse_id": { $in: result.arr }
                }, 'warehouse_details warehouse_id').then((resultx) => {
                    callback(null, {
                        resultx: resultx,
                        result: result.result
                    })
                })
            }
        ], (err, data) => {
            if (err) {
                res.send({
                    api_name: 'ComponentModel.ComponentModel_details',
                    error_msg: ErrInfo.error_10010,
                })
                return;
            }
            let resultx = JSON.parse(JSON.stringify(data.resultx));
            let result = JSON.parse(JSON.stringify(data.result));
            for (let item of result) {
                item.warehouse_details = '';
                for (let itemx of resultx) {
                    if (item.warehouse_id == itemx.warehouse_id) {
                        item.warehouse_details = itemx.warehouse_details;
                        break;
                    }
                }
            }
            res.send({
                api_name: 'ComponentModel.ComponentModel_details',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            });
        });
    };

    // 编辑安全库存
    this.StorageModel_safe_edit = (req, res) => {
        let { part_id, warehouse_id } = req.body;
        console.log('part_id.....0', part_id)
        console.log('warehouse_id.....', warehouse_id)
        let field = 'warehouse_list'
        ComponentModel.findOne({
            'part_id': part_id
        }, field).then((result) => {
            let warehouse_list = result.warehouse_list
            for (let i = 0; i < warehouse_list.length; i++) {
                if (warehouse_list[i].warehouse_id == warehouse_id) {
                    let warehouse_position = warehouse_list[i].warehouse_position;
                    let safe_stock = warehouse_list[i].safe_stock;
                    res.send({
                        err_msg: ErrInfo.error_0,
                        response: {
                            'data': {
                                warehouse_position,
                                safe_stock
                            }
                        },
                        api_name: "ComponentModel.StorageModel_safe_edit"
                    })
                }
            }
        }).catch((err) => {
            res.send({
                err_msg: ErrInfo.error_10001,
                api_name: "ComponentModel.StorageModel_safe_edit"
            })
        })
    };
    //编辑后保存
    this.StorageModel_safe_save = (req, res) => {
        let { safe_stock, warehouse_position, part_id, warehouse_id } = req.body;
        let query = {
            'warehouse_list.$.safe_stock': safe_stock,
            'warehouse_list.$.warehouse_position': warehouse_position,
        }
        ComponentModel.update({
            'part_id': part_id,
            "warehouse_list.warehouse_id": warehouse_id
        }, { $set: query }).then((data) => {
            res.send({
                api_name: 'ComponentModel.StorageModel_safe_save',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': data
                }
            })
        }).catch((err) => {
            res.send({
                api_name: 'ComponentModel.StorageModel_safe_save',
                error_msg: ErrInfo.error_10012
            })
        })
    };
    /**负责人:Dany
  * 导出功能
  * company_id@公司ID
  * category_id@分类数组
  * BelongToProduct@所属产品
  * safe_state@配件状态
  * part_type@配件型号
  * part_name@配件名称
  * part_number@配件编号
  * pageSize@一页多少条
  * currentPage@当前第几页
  * 
  */
    this.ComponentModel_export = (req, res) => {
        const { company_id, part_number, part_name, part_type, safe_state, BelongToProduct, category_id } = req.body;
        let condition = {};
        condition['company_id'] = company_id;
        condition['part_state.state_value'] = '1';
        part_name ? condition['part_name'] = { $regex: part_name, $options: '$i' } : false;
        part_number ? condition['part_number'] = { $regex: part_number, $options: '$i' } : false;
        part_type ? condition['part_type'] = { $regex: part_type, $options: '$i' } : false;
        safe_state ? condition['is_set_safe.safe_state.state_value'] = safe_state : false;
        BelongToProduct ? condition['BelongToProduct'] = BelongToProduct : false;
        category_id.length > 0 ? condition['category_id'] = { $in: category_id } : false;
        async.waterfall([
            (callback) => {
                ComponentModel.find(condition, {
                    'warehouse_list': 0,
                    'part_defined': 0
                }).exec((err, result) => {
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
                            let data = [['预警状态', '编号', '名称', '型号', '单位', '总库存', '备注']];
                            let arr__ = [];
                            let now_time = orderNumber();
                            let file_name = `配件信息导出(${skipnum} - ${skipnum + item1.length})${now_time}`;
                            for (let i = 0; i < item1.length; i++) {
                                let arr_ = [];
                                let item = item1[i];
                                let is_set_safe = item.is_set_safe.safe_state.state_name;
                                let part_number = item.part_number;
                                let part_name = item.part_name;
                                let part_type = item.part_type;
                                let part_unit = item.part_unit;
                                let part_quantity = item.part_quantity;
                                let part_remark = item.part_remark;
                                arr_.push(is_set_safe, part_number, part_name, part_type, part_unit, part_quantity, part_remark);
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
                                    callback(null, err);
                                    return;
                                })
                                .on('end', (reply) => {
                                    skipnum = skipnum + data.length_;
                                    callback(null, {
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
                    api_name: 'ComponentModel.ComponentModel_export',
                    error_msg: ErrInfo.error_10022
                })
                return;
            }
            res.send({
                api_name: 'ComponentModel.StorageModel_safe_save',
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                }
            })
        })
    }
    /**
     * 负责人:Dany
     * 导入功能
     * 
     */
    this.ComponentModel_import = (req, res, path1, company_id) => {
        let path_ = path.resolve(path1);
        let path2 = path_.split(".")
        if (path2[1] !== 'xlsx') {
            res.send({
                error_msg: ErrInfo.error_10033,
                api_name: "ComponentModel.ComponentModel_import",
            })
            return;
        }
        var obj = xlsx.parse(path_);
        let data_ = obj[0]
        for (let i = 1; i < data_.data.length; i++) {
            let index = data_.data[i];
            let part_number = index[0];
            let part_name = index[0];
            let part_type = index[0];
            let part_unit = index[0];
            let part_remark = index[0];
            let category_id = index[0];
            let management_method = index[0];
            if (part_name == undefined || part_name == '') {
                res.send({
                    api_name: 'ComponentModel.ComponentModel_import',
                    error_msg: ErrInfo.error_10015,
                })
                return;
            }
            if (part_number == undefined || part_number == '') {
                res.send({
                    api_name: 'ComponentModel.ComponentModel_import',
                    error_msg: ErrInfo.error_10016,
                })
                return;
            }
        }
        async.waterfall([
            //拿全部名字和编号数据
            (callback) => {
                ComponentModel.find({ company_id: company_id }, 'part_name part_number', (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    let part_name_arr = [];
                    let part_number_arr = [];
                    for (let i = 0; i < result.length; i++) {
                        let index = result[i];
                        part_name_arr.push(index.part_name);
                        part_number_arr.push(index.part_number);
                    }
                    callback(null, {
                        part_name_arr: part_name_arr,
                        part_number_arr: part_number_arr
                    })
                })
            },
            //拿全部分类数据
            (data, callback) => {
                BasicModel.findOne({ company_id: company_id }, 'accessories_category.category_name accessories_category.category_id', (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    let category = [];
                    let category_id_ = result.accessories_category;
                    for (let i = 0; i < result.accessories_category.length; i++) {
                        let index = result.accessories_category[i];
                        category.push(index.category_name);
                    }
                    callback(null, {
                        data: data,
                        category: category,
                        category_id_: category_id_
                    });
                })
            },
            (data, callback) => {
                let part_name_arr = data.data.part_name_arr;
                let part_number_arr = data.data.part_number_arr;
                let category = data.category;
                for (let i = 1; i < data_.data.length; i++) {

                    let index = data_.data[i];
                    // if (index.length !== 7) {
                    //     res.send({
                    //         api_name: 'ComponentModel.ComponentModel_import',
                    //         error_msg: ErrInfo.error_10032,
                    //         err_index: `第${i}行`
                    //     })
                    //     return;
                    // }
                    let part_number = index[0];
                    let part_name = index[1];
                    let part_type = index[2];
                    let part_unit = index[3];
                    let part_remark = index[4];
                    let category_id = index[5];
                    let management_method = index[6];
                    if (part_name_arr.contains(part_name)) {
                        res.send({
                            api_name: 'ComponentModel.ComponentModel_import',
                            error_msg: ErrInfo.error_10023,
                            err_index: `第${i}行`
                        })
                        return;
                    }
                    if (part_number_arr.contains(part_number)) {
                        res.send({
                            api_name: 'ComponentModel.ComponentModel_import',
                            error_msg: ErrInfo.error_10024,
                            err_index: `第${i}行`
                        })
                        return;
                    }
                    if (category_id == undefined) {
                        category_id = '所有分类'
                        if (category.indexOf(category_id) == -1) {
                            res.send({
                                api_name: 'ComponentModel.ComponentModel_import',
                                error_msg: ErrInfo.error_10025,
                                err_index: `第${i}行`
                            })
                            return;
                        }
                    }
                }
                callback(null, data)
            },
            (data, callback) => {
                category_id_ = data.category_id_
                let arr_ = [];
                for (let i = 1; i < data_.data.length; i++) {
                    let obj__ = {};
                    let index = data_.data[i];
                    let part_number = index[0];
                    let part_name = index[1];
                    let part_type = index[2];
                    let part_unit = index[3];
                    let part_remark = index[4];
                    let category_id = index[5];
                    let management_method = index[6];
                    if (category_id == undefined) {
                        category_id == '所有分类'
                    }
                    for (index of category_id_) {
                        if (category_id == index.category_name) {
                            category_id = index.category_id;
                        }
                    }
                    if (management_method == 1) {
                        management_method = [
                            {
                                'name': '批次',
                                'value': '1'
                            }
                        ]
                    }
                    else if (management_method == 2) {
                        management_method = [
                            {
                                'name': '批次',
                                'value': '1'
                            },
                            {
                                'name': '序列号',
                                'value': '2'
                            }
                        ]
                    } else {
                        management_method =
                            [
                            ]
                    }
                    if (category_id == undefined) {
                        category_id = '-1'
                    }
                    obj__.company_id = company_id;
                    obj__.part_id = uuid.v1();
            
                    obj__.create_time = new Date().getTime();
                    obj__.part_number = part_number;
                    obj__.part_name = part_name;
                    obj__.part_type = part_type;
                    obj__.part_remark = part_remark;
                    obj__.part_defined = '';
                    obj__.part_quantity = 0;
                    obj__.part_unit = part_number;
                    obj__.category_id = category_id;
                    obj__.warehouse_list = [];
                    obj__.is_set_safe = {
                        is_on: '-1', //是否启用
                        safe_state: {
                            state_name: '安全',   //1.安全，2，部分不足 3，库存不足
                            state_value: '1',
                        },
                    }
                    obj__.part_state = {
                        state_name: '启用',
                        state_value: '1'
                    }
                    obj__.management_method = management_method;
                    arr_.push(obj__);
                }
                callback(null, arr_);
            },
            (data, callback) => {
                ComponentModel.create(data, (err, result) => {
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
                    api_name: "ComponentModel.ComponentModel_import",
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
                api_name: "ComponentModel.ComponentModel_import"
            })
        })
    }
    /**************************************以下是APP端的接口******************************/
    /**
     * 配件申请
     */
}

module.exports = new Component();
