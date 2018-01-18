module.exports = (function StorageSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id:{type: String, required: true},
        safe_stock :{type: Number, required: false,default:100},// 安全库存
        warehouse_id: {type: String, required: true},//仓库ID
        warehouse_state: {
            state_name: {type: String, required: false},  //状态名称
            state_value: {type: String, required: false}  //状态值  1启用  -1 禁用
        },
        warehouse_number: {type: String, required: false}, //仓库编号
        warehouse_name: {type: String, required: false}, //仓库名称
        warehouse_remark: {type: String, required: false}, //仓库备注
        warehouse_region: {
            longitude: {type: String, required: false}, //仓库经度
            latitude: {type: String, required: false}, //仓库纬度
            warehouse_country: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            }, // 仓库所在国家
            warehouse_province: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            }, // 仓库所在省
            warehouse_city: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            }, // 仓库所在城市
            warehouse_area: {
                code: {type: String, required: false},
                name: {type: String, required: false}
            },// 仓库所在区
            warehouse_address: {type: String, required: false}, // 仓库地区
        },
        warehouse_defined: {type: Object, required: false}, //仓库自定义字段,
        warehouse_public_defined:{type: Object, required: false},
        create_time: {type: String, required: false},//仓库创建时间
        parts_list: [{
            part_id: {type: String, required: false},  //配件ID
        }]
    };

    const collectionName = 'Storages';
    const StorageSchema = mongoose.Schema(schema);
    const Storage = connect.model(collectionName, StorageSchema);

    return Storage;
})();