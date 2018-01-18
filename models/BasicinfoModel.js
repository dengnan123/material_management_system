module.exports = (function BasicInfoSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        company_id: { type: String, required: false }, //公司ID
        accessories_category: [{ //配件类别
            category_icon: { type: String, required: false }, // 分类图标
            category_id: { type: String, required: false }, // 分类ID
            category_name: { type: String, required: false }, // 分类名称
            category_pid: { type: String, required: false }, // 分类PID
            product_category_state: {
                state_name: { type: String, required: false, default: '启用' }, // 状态名称
                state_value: { type: String, required: false, default: '1' } // 状态值
            }
        }],
        instock_type: [{ //入库类型
            type_state: {
                state_value: { type: String, required: false },
                state_name: { type: String, required: false }
            },
            type_color_mark: { type: String, required: false },
            type_name: { type: String, required: false },
            type_id: { type: String, required: false }
        }],
        outstock_type: [{ //出库类型
            type_state: {
                state_value: { type: String, required: false },
                state_name: { type: String, required: false }
            },
            type_color_mark: { type: String, required: false },
            type_name: { type: String, required: false },
            type_id: { type: String, required: false }
        }],
        warning_state: [{ //预警状态
            state: {
                state_value: { type: String, required: false },
                state_name: { type: String, required: false }
            },
            state_color_mark: { type: String, required: false },
            state_name: { type: String, required: false },
            state_id: { type: String, required: false }
        }],
        part_xlsx: { type: String, required: false }, // 配件导入模板
        warehouse_xlsx: { type: String, required: false }, // 仓库导入模板
        provider_xlsx: { type: String, required: false }, // 供应商导入模板
    };
    const collectionName = 'BasicInfos';
    const BasicInfoSchema = mongoose.Schema(schema);
    const BasicInfo = connect.model(collectionName, BasicInfoSchema);

    return BasicInfo;
})();