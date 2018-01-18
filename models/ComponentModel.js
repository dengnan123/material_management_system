module.exports = (function ComponentSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id:{type: String, required: true},
        part_id: { type: String, required: true },   //配件ID
        part_number: { type: String, required: false }, //配件编号
        part_name: { type: String, required: false }, //配件名称
        category_id: { type: String, required: false },  //分类ID,
        BelongToProduct:{ type: String, required: false },  //所属产品分类
        management_method: [{
            value: { type: String, required: false },
            name: { type: String, required: false }
        }],
        part_class: { type: String, required: false },   //所属分类
        part_type: { type: String, required: false },  //配件型号
        part_unit: { type: String, required: false }, //配件单位
        part_remark: { type: String, required: false }, //配件备注
        part_defined: { type: Object, required: false }, //配件自定义字段
        part_state: {
            state_name: { type: String, required: false},  //状态名称
            state_value: { type: String, required: false}  //状态值  1启用  -1 禁用
        },
        part_quantity: { type: Number, required:false}, //配件数量
        create_time: { type: String, required: false},   //创建时间
        is_set_safe:{
            is_on:{type: String, required: false}, //是否启用
            safe_state:{
                state_name:{ type: String, required: false},   //1.安全，2，部分不足 3，库存不足
                state_value:{ type: String, required: false},
            },
        },
        warehouse_list: [{
            warehouse_id: { type: String, required: false},  //仓库ID
            warehouse_name: { type: String, required: false }, //仓库名称
            stock: { type: Number, required: false }, //配件库存
            safe_stock: { type: Number, required: false },//安全库存
            warehouse_position:{ type: String, required: false }, //存在仓库位置
        }],
    };
    const collectionName = 'Components';
    const ComponentSchema = mongoose.Schema(schema);
    const Components = connect.model(collectionName, ComponentSchema);

    return Components;
})();