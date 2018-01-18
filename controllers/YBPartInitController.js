/**
 * 激活配件基础信息
 */
const BasicinfoModel = require('../models/BasicinfoModel'); //基础信息Model
const StorageModel = require('../models/StorageModel'); //仓库Model
const async = require('async');
const node_uuid = require('uuid');

function YBPartInitController() {
    /**
     * 负责人: 祁俊
     * 接口说明: 闪电豹点击配件插件时调用 没有信息即初始化 有不做操作
     * 参数 company_id
     */
    this.init_part = (req, res, next) => {
        const reqBody = req.body;

        async.auto({
            findBasic: (callback) => {
                BasicinfoModel.findOne({
                    'company_id': reqBody.company_id
                }, {
                    'company_id': 1,
                }, (error, response) => {
                    callback(error, response);
                })
            },
            runStep1: ['findBasic', (oneArg, callback) => {
                if (!oneArg.findBasic) {
                    async.parallel({
                        createBasic: (callback) => {
                            BasicinfoModel.create({
                                company_id: reqBody.company_id,
                                accessories_category: [
                                    {
                                        "product_category_state": {
                                            "state_name": "启用",
                                            "state_value": "1"
                                        },
                                        "category_icon": "",
                                        "category_id": "-1",
                                        "category_name": "所有分类",
                                        "category_pid": "",
                                    },
                                ],
                                instock_type: [
                                    {
                                        "type_id": "1",
                                        "type_color_mark": "",
                                        "type_name": "采购入库",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    },
                                    {
                                        "type_id": "2",
                                        "type_color_mark": "",
                                        "type_name": "坏件入库",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    },
                                    {
                                        "type_id": "3",
                                        "type_color_mark": "",
                                        "type_name": "杂项入库",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    },
                                    {
                                        "type_id": "4",
                                        "type_color_mark": "",
                                        "type_name": "期初入库",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    }
                                ],
                                outstock_type: [
                                    {
                                        "type_id": "1",
                                        "type_color_mark": "",
                                        "type_name": "售后领用",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    },
                                    {
                                        "type_id": "2",
                                        "type_color_mark": "",
                                        "type_name": "销售出库",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    },
                                    {
                                        "type_id": "3",
                                        "type_color_mark": "",
                                        "type_name": "杂项出库",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    },
                                    {
                                        "type_id": "4",
                                        "type_color_mark": "",
                                        "type_name": "坏件报废",
                                        "type_state": {
                                            "state_value": "1",
                                            "state_name": "启用"
                                        },
                                    }
                                ],
                                warning_state: [],
                            }, (error, response) => {
                                callback(error, response);
                            })
                        },
                        createStorage: (callback) => {
                            StorageModel.create({
                                company_id: reqBody.company_id,
                                warehouse_id: node_uuid.v1(),
                                warehouse_state: {
                                    state_name: '启用',
                                    state_value: '1',
                                },
                                warehouse_number: 'a01',
                                warehouse_name: '默认仓库',
                                warehouse_remark: '',
                                warehouse_region: {
                                    longitude: '',
                                    latitude: '',
                                    warehouse_country: {
                                        code: '',
                                        name: '',
                                    },
                                    warehouse_province: {
                                        code: '',
                                        name: '',
                                    },
                                    warehouse_city: {
                                        code: '',
                                        name: '',
                                    },
                                    warehouse_area: {
                                        code: '',
                                        name: '',
                                    },
                                    warehouse_address: '',
                                },
                                warehouse_defined: '',
                                warehouse_public_defined: '',
                                create_time: Math.round(new Date().getTime()),
                                parts_list: []
                            }, (error, response) => {
                                callback(error, response);
                            })
                        }
                    }, (error, createResults) => {
                        if (error) {
                            callback(error, null);
                            return;
                        }
                        if (createResults.createBasic.company_id) {
                            callback(error, 'Y');
                        }
                    });
                } else {
                    callback(null, 'Y');
                }

            }]
        }, (error, results) => {
            if (error) {
                res.send({
                    code: '10001',
                    error_msg: error,
                    api_name: reqBody.api_name
                });
                return;
            }

            res.send({
                code: '0',
                error_msg: 'ok',
                response: {
                    data: results.runStep1
                },
                api_name: reqBody.api_name
            });
        })
    }
}

module.exports = new YBPartInitController();
