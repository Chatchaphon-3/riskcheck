const jwt = require('jsonwebtoken');
const User = require('../models/User');


//Protect Routes : ต้องเป็นผู้ที่เกี่ยวข้องกับระบบ public เข้าไม่ได้ // Bearer token จัดการตรงนี้
exports.protect = async(req,res,next)=>{

    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){   //token based , postman เป็นคนดึงมา
        token = req.headers.authorization.split(' ')[1];
    }
    // else if(req.cookies && req.cookies.token) {    //cookie based
    //      token = req.cookies.token;
    // }
    //Make Sure Token is Existed in req.header. (...)
    // console.log(token);
    if(!token || token === '{{TOKEN}}'){ 
        return res.status(401).json({success : false , message : 'กรุณาเข้าสู้ระบบ หรือ สร้างบัญชีผู้ใช้ก่อนการใช้งานในระบบ'});
    }

    try{
        //verify Token 
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    }catch(err){
        console.log(err);
        res.status(500).json({success : false , message : 'Server Error'});
    }
};


// Verify Role 
exports.authorize = (...role)=>{
    return (req,res,next)=>{
        if(!role.includes(req.user.role)){
            return res.status(403).json({success : false , message : 'Your Role cannot access this route'});
        }
        next();
    }
}