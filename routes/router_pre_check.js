const express = require('express');
const router = express.Router();
const index_router = require('./index');

// 权限检查
const check_auth = (req, res, next) => {
    console.log('验证通过')
    next()
}


// 应用路由级中间件
router.use('/', check_auth, index_router);

module.exports = router;