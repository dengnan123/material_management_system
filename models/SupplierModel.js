module.exports = (function SupplierSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id:{type: String, required: true},
        provider_id:{type: String, required: true},  //供应商ID
        provider_state: {
            state_name: { type: String, required: false,default:'启用'},  //状态名称
            state_value: { type: String, required: false,default:'1'}  //状态值  1启用  -1 禁用
        },
        provider_number: {type: String, required: false}, //供应商编号
        provider_name: {type: String, required: false}, //供应商名称
        provider_contact:{type: String, required: false}, //供应商联系方式
        provider_remark:{type: String, required: false}, //供应商备注
        provider_region:{
            longitude: {type: String, required: false}, //供应商经度
            latitude: {type: String, required: false}, //供应商纬度
            provider_country: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            }, // 供应商所在国家
            provider_province: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            }, // 供应商所在省
            provider_city: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            }, // 供应商所在城市
            provider_area: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            },// 供应商所在区
            provider_address: {type: String, required: false}, // 供应商地区
        },
        provider_defined:{type:Object,require:false},  //供应商自定义字段
        provider_general:{type:Object,require:false},  //供应商通用字段
        create_time:{type: String, required: false} //创建时间
    };

    const collectionName = 'Suppliers';
    const SupplierSchema = mongoose.Schema(schema);
    const Supplier = connect.model(collectionName, SupplierSchema);
    return Supplier;
})();

