const User = require('../../models/User');
const Project = require('../../models/Project');
const Risk = require('../../models/Risk');
const Unit = require('../../models/Unit');
// const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize'); // protect NoSQL injection 
const { default: mongoose } = require('mongoose');
//path : api/v1/auth/dl/:id 
//ทำเพิ่มมาเวลา eva ที่โดนลบมีงานที่เขากำลังตรวจ
exports.deleteAccount = async (req,res,next)=> {
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        req.params.id = mongoSanitize.sanitize(req.params.id);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ในparamsผิดแบบฟอร์มระบบ'};
        //check user existed
        let userExisted = await User.findById(req.params.id).session(session);
        if(!userExisted) throw {code : 550 , status : 404 , message : 'ไม่พบผู้ใช้ดังกล่าว'};
        if((userExisted.id !== req.user.id ) && req.user.role !== 'admin'){
            // console.log(userExisted.id !== req.user.id);
            // console.log(req.user);
            throw { code : 550 , status : 400 , message : 'ไม่สามารถลบบัญชีของผู้ใช้ท่านอื่นได้'};
        }
        if(userExisted.role === 'evaluator'){
            let projectExisted = await Project.find({evaluatorID : userExisted._id}).session(session);
            projectExisted = projectExisted.filter(p=>p.projectStatus !== 'Completed');
            // let projectExisted = allProject.filter(p=>p.projectStatus !== 'Completed');
            console.log('total project hold' , projectExisted.length);
            if(projectExisted.length > 0) {
                // ดึง evaluator ทุกคนในเขต, role, และเรียงตาม workState (index ช่วย)
                let evaData = await User.find({ district : userExisted.district , role : 'evaluator'}).sort({workState : 1}).session(session);
                // กรอง evaluator ที่จะถูกลบออก
                evaData = evaData.filter(p=>p.id !== req.params.id);
                if(evaData.length === 0) 
                    throw {code : 550 , status : 400 , message : 'ไม่สามารถลบบัญชีได้ในตอนนี้ , ยังไม่มีผู้ตรวจคนอื่นในเขตนี้ที่สามารถรับงานต่อได้'};
                let temp = 0;
                let all = evaData.length;
                // Prepare bulkPrject
                const bulkProject = projectExisted.map(project=>{
                    const assignedEva = evaData[temp%all].id;
                    ++temp;
                    return {
                        updateOne : {
                            filter : { _id : project._id} , 
                            update : {evaluatorID : assignedEva}
                        }
                    };
                });
                temp = 0;
                //Prepare bulk user(eva)
                const bulkEva = projectExisted.map(project=>{
                    const eva = evaData[temp%all].id;
                    ++temp;
                    return {
                        updateOne : {
                            filter : {_id : eva} , 
                            update : {workState : new Date()}
                        }
                    };
                });
                await Project.bulkWrite(bulkProject , {session});
                await User.bulkWrite(bulkEva , {session});
                // for(let i = 0; i < projectExisted.length; ++i){
                //     await Project.updateOne({_id :projectExisted[i]._id} , {evaluatorID : evaData[(temp)%all].id} , {session});
                //     await User.findByIdAndUpdate(evaData[(temp++)%all].id , {workState : new Date()} , {session});
                // }
            }
        }
        let deledtedUser  = await User.findByIdAndDelete(req.params.id , {session});  // ลบตรงนี้
        // let project = Project.find({req.params.id})
        //ลบ user แล้วต้องลบทุกอย่างที่เกี่ยวข้องกับคนนั้นด้วย 
        if(deledtedUser.role === 'user'){
            // console.log('Hit!');
            let targetProject = await Project.find({userID : deledtedUser.id}).session(session);
            if(targetProject.length > 0){
                let pID;
                for(let i = 0; i < targetProject.length; ++i){
                    pID = targetProject[i].id;
                    await Unit.findOneAndDelete({projectID : pID} , {session});
                    await Risk.findOneAndDelete({projectID : pID} , {session});
                }
                await Project.deleteMany({userID : deledtedUser.id} , {session});
            }
        }
        await session.commitTransaction();
        return res.status(200).json({success : true , message : 'ลบบัญชีผู้ใช้เสร็จสมบูรณ์'});
    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
}