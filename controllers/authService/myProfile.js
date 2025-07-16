const User = require('../../models/User');
// const validator = require('validator');
const { default: mongoose } = require('mongoose');
exports.MyProfile =  async (req,res,next)=>{
    try{
        if(!req.user || !req.user.id) throw {code : 550 , status : 401 , message : 'กรุณาเข้าสู่ระบบก่อนการดำเนินการ'};
        if(!mongoose.Types.ObjectId.isValid(req.user.id)) throw {code : 550 , status : 400 , message : 'รูปแบบไอดีที่ส่งเข้ามาในระบบ ไม่ถูกต้อง'};
        let query = User.findById(req.user.id);
        query = query.select('-workState'); // hidden 
        if(req.user.role !== 'evaluator'){
            query = query.select('-district'); //hidden
        }

        const user = await query;

        return res.status(200).json({success : true , message : 'ข้อมูลบัญชี' , data : user});
    }catch(error){
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
};