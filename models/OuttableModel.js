module.exports = (function OutTableSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id: {type: String, required: true},
        Application_number:{type: String, required: false}, //领用申请单单号
        outtable_id: {type: String, required: false}, //出库单ID
        outtable_number: {type: String, required: false}, //出库单号
        warehouse_id: {type: String, required: false},  //仓库ID
        warehouse_info: {type: mongoose.Schema.Types.ObjectId, ref: 'Storages'}, //ref关联仓库表
        operator: {
            user_id: {type: String, required: false},  //操作人
            user_name: {type: String, required: false}
        },
        picking: {
            user_id: {type: String, required: false}, //领料人
            user_name: {type: String, required: false}
        },
        out_type: {
            type_name: {type: String, required: false},  //出库类型名字
            type_id: {type: String, required: false}  //出库类型ID
        },
        out_time: {type: String, required: false},    //出库时间
        create_time: {type: String, required: false},    //创建时间
        parts_list: [{
            part_id: {type: String, required: false}, //配件ID
            part_number: {type: String, required: false},  //配件编号
            part_name: {type: String, required: false},  //配件名称
            part_type: {type: String, required: false},  //配件型号
            out_quantity: {type: Number, required: false},   //出库数量
            remark: {type: String, required: false},   //出库备注
        }],
        OutObj:{type: Object, required: false}
    };

    const collectionName = 'OutTables';
    const OutTableSchema = mongoose.Schema(schema);
    const OutTable = connect.model(collectionName, OutTableSchema);

    return OutTable;
})();