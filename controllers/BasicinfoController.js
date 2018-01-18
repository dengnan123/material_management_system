function BasicInfo() {
    const BasicinfoModel = require('../models/BasicinfoModel');
    const ComponentModel = require('../models/ComponentModel');
    const SystemModel = require('../models/SystemModel');
    const ErrInfo = require('../config/error_msg.json');
    const uuidv1 = require('uuid/v1');
    const async = require('async');
    const config = global.config;
    const config_qiniu = config.qiniu; // 七牛云的配置文件
    // 初始化接口
    this.BasicinfoModel_init = (req, res) => {
        let company_id = req.body.company_id;  //公司ID
        let query = {};
        if (company_id) {
            query['company_id'] = company_id;
        };
        BasicinfoModel.findOne(query).then((data) => {
            // 就初始化一次
            if (data == null) {
                async.series({
                    one: (callbalk) => {
                        BasicinfoModel.create(query).then((data) => {
                            callbalk(null, data)
                        })
                    },
                    two: (callbalk) => {
                        let category_name = '所有分类';
                        let category_icon = '';
                        let category_id = '-1';
                        let category_pid = ''
                        BasicinfoModel.update({ 'company_id': company_id }, {
                            $addToSet: {
                                'accessories_category': {
                                    'category_name': category_name,
                                    'category_icon': category_icon,
                                    'category_id': category_id,
                                    'category_pid': category_pid
                                }
                            }
                        }).then((data) => {
                            callbalk(null, data)
                        })
                    },
                    three: (callbalk) => {
                        category_name = '默认分类一11';
                        category_icon = '';
                        category_id = uuidv1();
                        category_pid = '-1'
                        BasicinfoModel.update({ 'company_id': company_id }, {
                            $addToSet: {
                                'accessories_category': {
                                    'category_name': category_name,
                                    'category_icon': category_icon,
                                    'category_id': category_id,
                                    'category_pid': category_pid
                                }
                            }
                        }).then((data) => {
                            callbalk(null, data)
                        })
                    },
                    four: (callbalk) => {
                        BasicinfoModel.findOne({ 'company_id': company_id }, 'accessories_category').then((data) => {
                            callbalk(null, data)
                        })
                    }
                }, (err, result) => {
                    if (err) {
                        res.send({
                            api_name: 'BasicInfoModel.BasicinfoModel_init',
                            error_msg: '未找到相应的信息',
                            code: '1'
                        })
                    }
                    res.send({
                        api_name: 'BasicInfoModel.BasicinfoModel_init',
                        error_msg: 'ok',
                        response: {
                            'data': result.four
                        },
                        code: '0'
                    })
                })
            } else {
                // 分类具体信息展现
                BasicinfoModel.findOne(query, 'accessories_category').then((data) => {
                    res.send({
                        api_name: 'BasicInfoModel.BasicinfoModel_init',
                        error_msg: 'ok',
                        response: data,
                        code: '0'
                    })
                }).catch((err) => {
                    res.send({
                        api_name: 'BasicInfoModel.BasicinfoModel_init',
                        error_msg: '未找到相应的信息',
                        code: '1'
                    })
                })
            }
        }).catch((err) => {
            res.send({
                api_name: 'BasicInfoModel.BasicinfoModel_init',
                error_msg: '初始化失败',
                code: '1'
            })
        })
    };

    //更新分类表里面的信息
    this.BasicinfoModel_update = (req, res) => {
        let accessories_category = req.body.accessories_category;  //配件分类
        let company_id = req.body.company_id; // 公司ID
        if (accessories_category) {
            let category_name = (accessories_category.category_name !== undefined) ? accessories_category.category_name : '';
            let category_icon = (accessories_category.category_icon !== undefined) ? accessories_category.category_icon : '';
            let category_pid = (accessories_category.category_pid !== undefined) ? accessories_category.category_pid : '';
            let category_id = uuidv1();
            BasicinfoModel.update({ 'company_id': company_id }, {
                $addToSet: {
                    'accessories_category': {
                        'category_name': category_name,
                        'category_icon': category_icon,
                        'category_id': category_id,
                        'category_pid': category_pid
                    }
                }
            }).then((data) => {
                res.send({
                    api_name: 'BasicinfoModel.BasicinfoModel_update',
                    error_msg: 'ok',
                    response: {
                        'data': data,
                        'category_id': category_id
                    },
                    code: '0'
                })
            }).catch((err) => {
                res.send({
                    api_name: 'BasicinfoModel.BasicinfoModel_update',
                    error_msg: '更新失败',
                    code: '1'
                })
            })
        }
    };
    // 更新入库类型
    this.BasicinfoModel_Intable_update = (req, res) => {
        let instock_type = req.body.instock_type;
        let company_id = req.body.company_id;
        console.log('instock_type/////', instock_type)
        let type_color_mark = (instock_type.type_color_mark !== undefined) ? instock_type.type_color_mark : '';
        let type_name = (instock_type.type_name !== undefined) ? instock_type.type_name : '';
        let type_id = (instock_type.type_id !== undefined) ? instock_type.type_id : '';
        console.log('type_name', type_name)
        console.log('type_id', type_id)
        console.log('type_color_mark', type_color_mark)
        BasicinfoModel.update({ 'company_id': company_id }, {
            $addToSet: {
                'instock_type': {
                    'type_name': type_name,
                    "type_color_mark": type_color_mark,
                    "type_id": type_id,
                    "type_state": {
                        "state_value": "1",
                        "state_name": "启用"
                    }
                }
            }
        }).then((data) => {
            res.send({
                api_name: 'BasicinfoModel.BasicinfoModel_Intable_update',
                error_msg: 'ok',
                response: data,
                code: '0'
            })
        }).catch((err) => {
            res.send({
                api_name: 'BasicinfoModel.BasicinfoModel_Intable_update',
                error_msg: '未找到相应的信息',
                code: '1'
            })
        })
    };

    //更新出库类型
    this.BasicinfoModel_Outtable_update = (req, res) => {
        let outstock_type = req.body.outstock_type;
        let company_id = req.body.company_id;
        let type_color_mark = (outstock_type.type_color_mark !== undefined) ? outstock_type.type_color_mark : '';
        let type_name = (outstock_type.type_name !== undefined) ? outstock_type.type_name : '';
        let type_id = (outstock_type.type_id !== undefined) ? outstock_type.type_id : ''
        console.log('type_name', type_name);
        console.log('type_id', type_id)
        BasicinfoModel.update({ 'company_id': company_id }, {
            $addToSet: {
                'outstock_type': {
                    'type_name': type_name,
                    "type_color_mark": type_color_mark,
                    "type_id": type_id,
                    "type_state": {
                        "state_value": "1",
                        "state_name": "启用"
                    }
                }
            }
        }).then((data) => {
            res.send({
                api_name: 'BasicInfoModel.BasicinfoModel_Outtable_update',
                error_msg: 'ok',
                response: data,
                code: '0'
            })
        }).catch((err) => {
            res.send({
                api_name: 'BasicInfoModel.BasicinfoModel_Outtable_update',
                error_msg: '更新失败',
                code: '1'
            })
        })
    };
    /**
     * BY Dany
     * 分类删除
     * 
     */
    this.category_remove = (req, res) => {
        let { company_id, category_id, category_pid } = req.body;
        let query = {
            company_id,
            category_id
        };
        async.auto({
            one: (callbalk) => {
                ComponentModel.find(query, 'category_id', (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    console.log('789456123', result)
                    if (result.length > 0) {
                        callbalk(ErrInfo.error_10019, err)
                        return;
                    } else {
                        callbalk(null, result);
                    }
                })
            },
            three: (callback) => {
                BasicinfoModel.find({ company_id: company_id }, { accessories_category: { $elemMatch: { category_pid: category_id } } }, (err, result) => {
                    if (err) {
                        callback(null, err);
                        return;
                    }
                    console.log('three147', result)
                    if (result[0].accessories_category.length > 0) {
                        callback(ErrInfo.error_10021, err)
                        return;
                    } else {
                        callback(null, result);
                    }
                })
            },
            two: ['one', 'three', (data, callback) => {
                if (data.one.length == 0 && data.three[0].accessories_category.length == 0) {
                    BasicinfoModel.update({ 'company_id': company_id }, { $pull: { accessories_category: { 'category_id': category_id } } }, (err, result) => {
                        if (err) {
                            callback(null, err);
                            return;
                        }
                        console.log('777777777', result)
                        callback(null, result)
                    })
                } else {
                    callback(null, 'ok')
                }
            }]
        }, (err, result) => {
            if (err) {
                console.log('错误处理', err)
                res.send({
                    error_msg: err,
                    api_name: "BasicinfoModel.category_remove"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result
                },
                api_name: "BasicinfoModel.category_remove",
            })
        })
    };
    /**
     * 配件导入模板下载
     */
    this.part_xlsx_find = (req, res) => {
        // let { company_id } = req.body;
        SystemModel.findOne({}, 'xlsx_templates.part_xlsx', (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10,
                    api_name: "BasicinfoModel.part_xlsx_find"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result.xlsx_templates.part_xlsx
                },
                api_name: "BasicinfoModel.part_xlsx_find",
            })
        })
    }
     /**
     * 仓库导入模板下载
     */
    this.warehouse_xlsx_find = (req, res) => {
        // let { company_id } = req.body;
        SystemModel.findOne({}, 'xlsx_templates.warehouse_xlsx', (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10,
                    api_name: "BasicinfoModel.warehouse_xlsx_find"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result.xlsx_templates.warehouse_xlsx
                },
                api_name: "BasicinfoModel.warehouse_xlsx_find",
            })
        })
    }
    /**
     * 供应商导入模板下载
     */
    this.provider_xlsx_find = (req, res) => {
        // let { company_id } = req.body;
        SystemModel.findOne({}, 'xlsx_templates.provider_xlsx', (err, result) => {
            if (err) {
                res.send({
                    error_msg: ErrInfo.error_10,
                    api_name: "BasicinfoModel.provider_xlsx_find"
                })
                return;
            }
            res.send({
                error_msg: ErrInfo.error_0,
                response: {
                    'data': result.xlsx_templates.provider_xlsx
                },
                api_name: "BasicinfoModel.provider_xlsx_find",
            })
        })
    }
}
module.exports = new BasicInfo()





