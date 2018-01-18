module.exports = (function InTableSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id:{type: String, required: false},
        Intable_id:{type: String, required: false}, //入库单ID
        Intable_number: {type: String, required: false}, //入库单号
        warehouse_id: {type: String, required: false},  ///仓库表ID
        warehouse_info: {type: mongoose.Schema.Types.ObjectId, ref: 'Storages'}, //ref关联仓库表
        provider_id: {type: String, required: false}, //供应商表ID
        provider_info: {type: mongoose.Schema.Types.ObjectId, ref: 'Suppliers'}, //ref关联供应商表
        in_type: {
            type_name: {type: String, required: false},  //入库类型名字
            type_id: {type: String, required: false}  //入库类型ID
        },
        user_id:{type: String, required: false},// 登录配件的人
        //user_info:{type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
        in_time:{type: String, required: false},    //入库时间
        create_time:{type: String, required: false}, //创建时间
        parts_list: [{
            part_id: {type: String, required: false}, //配件ID
            part_number: {type: String, required: false},  //配件编号
            part_name: {type: String, required: false},  //配件名称
            part_type: {type: String, required: false},  //配件型号
            in_quantity: {type: Number, required: false},   //入库数量
            in_price: {type: String, required: false}, //入库单价成本
            in_total_price:{type: String, required: false}, //入库总价成本
            remark: {type: String, required: false},   //入库备注
        }],
        InObj:{type: Object, required: false}
    };

    const collectionName = 'InTables';
    const InTableSchema = mongoose.Schema(schema);
    const InTable = connect.model(collectionName, InTableSchema);

    return InTable;
})();