const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
//mongoose.set('debug',true);  开启debug模式
const Config=require('../config/config');
const Part=Config.Part;
const Node_Api=Config.Node_Api;

//内网 10.28.89.21
const material_db=mongoose.connect(Part.path,{
    useMongoClient:true
});
material_db.on('error', function() {
    console.log('error occured from Part');
});

material_db.once('open', function dbOpen() {
    console.log('successfully opened the Part');
});


exports.material_db = material_db;
exports.mongoose = mongoose;