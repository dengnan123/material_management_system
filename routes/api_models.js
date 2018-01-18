/**
 * 所有业务模块的
 */
const ComponentModel = require('../controllers/ComponentController');
const IntableModel = require('../controllers/IntableController');
const SupplierModel= require('../controllers/SupplierController');
const StorageModel = require('../controllers/StorageController');
const OutTableModel = require('../controllers/OuttableController');
const BasicinfoModel = require('../controllers/BasicinfoController');
const ApplicationModel = require('../controllers/ApplicationController');
const YBPartInit = require('../controllers/YBPartInitController');
module.exports = {
    IntableModel,
    ComponentModel,
    SupplierModel,
    StorageModel,
    OutTableModel,
    BasicinfoModel,
    ApplicationModel,
    YBPartInit
}