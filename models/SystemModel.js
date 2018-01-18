module.exports = (function SystemSchema() {
    const mongoose = require('../common/db').mongoose;
    const connect = require('../common/db').material_db;
    const schema = {
        xlsx_templates: {
            part_xlsx: { type: String, required: false }, // 配件导入模板
            warehouse_xlsx: { type: String, required: false }, // 仓库导入模板
            provider_xlsx: { type: String, required: false }, // 供应商导入模板
        }
    };
    const collectionName = 'Systems';
    const SystemSchema = mongoose.Schema(schema);
    const System = connect.model(collectionName, SystemSchema);

    return System;
})();