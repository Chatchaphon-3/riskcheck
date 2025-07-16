const User = require('../../models/User');
const validator = require('validator')
// const validator = require('validator');
exports.login = async (req,res,next)=>{
 
    try{
           let { email , password }  = req.body;
    // check email or password are exist in body
    if(!email || !password || (email.trim() === '') || (password.trim() === '')){
       throw {code : 550 , status : 400 , message : 'กรุณากรอกข้อมูลอีเมลหรือรหัสผ่านให้ครบถ้วน'};
    }
    //Protect XSS 
    if(!validator.isEmail(email)) throw {code : 550 , status : 400 , message : 'รูปแบบอีเมลที่กรอกไม่ถูกต้อง'}
    email = validator.normalizeEmail(email.trim());
    
    //check email exist in db 
        const user = await User.findOne({email}).select('+password');
            if(!user){
                throw {code : 550 , status : 404 , message : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'};
            }

            //Check password 
            const isMatch = await user.checkPassword(password);
            if(!isMatch){
                throw {code : 550 , status : 400 , message : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'};
            }
            
            sendTokenResponse(user,200,res);
    }catch(error){
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์'});
    }
}
const sendTokenResponse =  (user,statusCode,res)=>{    // return status code + stored token 
    try{
        const token = user.jwtToken();
    const options = {
        expires : new Date(Date.now()+process.env.JWT_COOKIE_EXPIRE*24*60*60*1000) , 
        httpOnly : true  
    };
    if(process.env.NODE_ENV === 'production'){
        options.secure = true;
    }
    return res.status(statusCode).set("Authorization", `Bearer ${token}`).cookie('token',token,options).json({success : true ,
        user : {
            _id : user.id , 
            username : user.username , 
            email : user.email ,
            role : user.role
        }
    });
    }catch(error){
        console.log(error);
        return res.status(500).json({success : false , message : 'fail'});
    }
}