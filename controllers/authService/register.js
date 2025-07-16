const User = require('../../models/User');
const validator = require('validator')
const xss = require('xss');
const mongoSanitize = require('express-mongo-sanitize'); // protect NoSQL injection 
const { default: mongoose } = require('mongoose');
exports.register = async (req,res,next) =>{
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        // console.log(req.user.role);
        req.body = mongoSanitize.sanitize(req.body);
        let {username , email , password}  = req.body;
        // let role;
        //ป้องกัน xss
        // กัน username โล่ง
        
        //Protection พวก input
        if(!username || username.trim() === '') throw { code : 550 , status : 400 , message : 'กรุญากรอกชื่อผู้ใช้'};
        if(validator.escape(username) !== username) throw { code : 550 , status : 400 , message : 'ชื่อผู้ใช้ไม่สามารถมีอักขระอันตรายได้'};
        username = validator.escape(xss(username.trim()));
        //กัน email ผิด format 
        if(!validator.isEmail(email)) throw { code : 550 , status : 400 , message : 'กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบของอีเมล'};
        email = validator.normalizeEmail(email.trim());

        if (!password || typeof password !== 'string' || password.trim().length < 8) {
            throw { code : 550 , status : 400 , message : 'รหัสผ่านควรมีจำนวนขั้นต่ำ 8 ตัวอักษร / ประเภทข้อมูลรหัสผ่านไม่ถูกต้อง / ไม่พบรหัสผ่าน'};
        }
        password = password.trim();

        //เช็ค email ซ้ำ   มี required : true
        const existingEmail = await User.findOne({email}).session(session);
        if(existingEmail){
            
            throw { code : 550 , status : 400 , message : 'อีเมลนี้ถูกใช้แล้วในระบบ'};
        }

        const user = await User.create([{
            username,
            email,
            password,
            role : 'user'
        }], {session});
    
        // logger.info('User registered successfully' , { username , email , role : 'user' });
        await session.commitTransaction();
        return res.status(201).json({success : true , data : user[0]});
        // sendTokenResponse(user,201,res);

    }catch(err){
        await session.abortTransaction();
        console.log(err);
        if(err.code === 550) {
            return res.status(err.status).json({success : false , message : err.message});
        }else if(err.name === 'ValidationError'){
            const errors = Object.values(err.errors).map((err)=>({
                field : err.properties.path, 
                message : err.properties.message,
                // type : err.properties.type,
            }));
            return res.status(400).json({success : false , message : errors[0].message});
        }
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์'});
        
    }finally{
        session.endSession();
    }
}
