const config = require('../config/config');
const JLSend = require('./JLSend');
const material_db = require('./db').material_db;

global.config = config;
global.JLSend = JLSend;
global.material_db = material_db;