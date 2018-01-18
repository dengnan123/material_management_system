module.exports = (function ApplicationSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id: { type: String, required: false },
        Application_id: { type: String, required: false }, //领用申请单ID
        order_id: { type: String, required: false }, //工单ID
        Application_number: { type: String, required: false }, //领用申请单编号
        warehouse_id: { type: String, required: false },  ///仓库表ID
        warehouse_info: { type: mongoose.Schema.Types.ObjectId, ref: 'Storages' }, //ref关联仓库表
        user_id: { type: String, required: false }, //申请人ID
        user_name: { type: String, required: false }, //申请人名字
        user_info: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' }, //ref关联申请人
        application_time: { type: String, required: false },   //申请时间
        create_time: { type: String, required: false }, //创建时间
        work_order_number: { type: String, required: false }, // 工单号
        state:{
            state_name: { type: String, required: false},  //状态名称
            state_value: { type: String, required: false}  //状态值  0 已经发货 1未发货 2部分发货 3已关闭
        },
        shipment_number:[
            {type: String, required: false}, // 发货单号
        ],
        parts_list: [{
            part_id: { type: String, required: false }, //配件ID
            part_number: { type: String, required: false },  //配件编号
            part_name: { type: String, required: false },  //配件名称
            part_type: { type: String, required: false },  //配件型号
            part_unit: { type: String, required: false }, //配件单位
            remark: { type: String, required: false },   //入库备注
            application_quantity: { type: Number, required: false },   //申请数量
            shipments_quantity:{ type: Number, required: false ,default:0},   //发货数量
            outgoing_quantity:{ type: Number, required: false },   //待发数量
            in_price: { type: String, required: false }, //入库单价成本
            in_total_price: { type: String, required: false }, //入库总价成本
        }]
    };
    const collectionName = 'Applications';
    const ApplicationSchema = mongoose.Schema(schema);
    const Application = connect.model(collectionName, ApplicationSchema);
    return Application;
})();