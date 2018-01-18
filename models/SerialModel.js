module.exports = (function InTableSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id: {type: String, required: false},
        serial_id:{type: String, required: false},
        pn_id:{type: String, required: false},
        Intable_id:{type: String, required: false}, //入库单ID
        part_id: {type: String, required: false},   //配件批
        warehouse_id:{type: String, required: false}, //仓库ID
        pn_in_Number: {type: String, required: false},   //批次号
        pn_in_remark:{type: String, required: false},   //批次备注
        serial_number:{type: String, required: false}, //序列号
        serial_remark:{type: String, required: false},  //序列号备注
        serial_state:{
            state_value:{type: String, required: false},   //1,启用 2,删除
            state_name:{type: String, required: false}    //启用  删除
        }
    };
    const collectionName = 'Serial';
    const SerialSchema = mongoose.Schema(schema);
    const Serial = connect.model(collectionName, SerialSchema);
    return Serial;
})();