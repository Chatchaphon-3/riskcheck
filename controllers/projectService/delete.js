const Project = require('../../models/Project');
const Unit = require('../../models/Unit');
const Risk = require('../../models/Risk');
const { default: mongoose, model } = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
//Delete Project user and Admin Only  (600)
// path : DELETE /api/v1/project/:id
exports.deleteProject = async (req,res,next)=>{
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        // console.log('start');
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400, message : 'ข้อมูล ID ที่ส่งมาทาง params ไม่ถูกต้องตาม  Format'};
        const project = await Project.findById(req.params.id).session(session);
        if(!project) throw { code : 550 , status : 404 , message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ'};
        if(req.user.id !== project.userID.toString() && req.user.role !== 'admin') throw {code : 550 , status : 403 , message : 'คุณไม่สามรถลบโครงการที่ไม่ใช่ของคุณได้'};
        //deleteMany Unit & Risk
        await Risk.deleteOne({projectID : req.params.id}).session(session);
        await Unit.deleteOne({projectID : req.params.id}).session(session);
        await project.deleteOne({session});
        await session.commitTransaction();
        // console.log('deletion success');
        return res.status(200).json({success : true , message : 'ลบข้อมูลโครงการ และ ข้อมูลยูนิตกับข้อมูลความเสี่ยงที่เกี่ยวข้องกับโครงการทั้งหมดเสร็จสิ้น', data : {}});

    }catch(error){
        await session.abortTransaction();
        if([550 ,550].includes(error.code)){
            return res.status(error.status).json({success : false , message : error.message});
        }
        console.log(error);
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางด้านเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
    // เหลือ logic ลบทุก unit = มีแล้วจร้า
};