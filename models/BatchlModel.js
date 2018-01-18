module.exports = (function InTableSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id: {type: String, required: false},
        pn_id:{type: String, required: false},
        Intable_id:{type: String, required: false}, //入库单ID
        part_id: {type: String, required: false},   //配件批
        warehouse_id:{type: String, required: false}, //仓库ID
        pn_in_quantity: {type: Number, required: false},  //批次数量
        pn_in_Number: {type: String, required: false},   //批次号
        pn_in_remark: {type: String, required: false},    //批次备注
    };
    const collectionName = 'Pn';
    const PnSchema = mongoose.Schema(schema);
    const Pn = connect.model(collectionName, PnSchema);

    return Pn;
})();