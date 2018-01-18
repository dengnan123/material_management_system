const error_msg_code = require('../config/error_msg.json');

/**
 * 输出给前端的格式
 * error_code:错误代码
 * api_name:api_name
 * res
 * response:当有返回response的时候可以填写，没有的时候可以不填
 */
exports.ressend = (error_code, api_name, res, response) => {
    if (typeof response == undefined) {
        res.send({
            api_name: api_name,
            error_info: error_msg_code['error_' + error_code]
        })
    } else {
        res.send({
            api_name: api_name,
            error_info: error_msg_code['error_' + error_code],
            response: response
        })
    }
}

/**
 * 系统错误的返回
 */
exports.ressend_sys_error = (error, api_name, res) => {
    res.send({
        error_info: {
            code: "10001",
            error_msg: error
        },
        api_name: api_name
    })
}