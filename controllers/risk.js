const Project = require('../models/Project');
const Risk = require('../models/Risk');
const validator = require('validator')
const xss = require('xss');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize'); // protect NoSQL injection



 //function for validate obj
    const validateObj = (phase)=>{
        for ( const rcp of  ['rcp2_6', 'rcp4_5', 'rcp6_0']){
            if(!phase[rcp]) throw new Error(`Missing data of phase ${phase} : rcp ${rcp}`);
            // validate ข้อมูล    
            phase[rcp].data = Number(phase[rcp].data);
            phase[rcp].freq = Number(phase[rcp].freq);
            
            if(isNaN( phase[rcp].data) ||  phase[rcp].data < 0) throw new Error('invalid data');
            if(isNaN( phase[rcp].freq) ||  phase[rcp].freq < 0) throw new Error('invalid data');
        }
        return phase;
    }
// path : /api/v1/project/:id/risk
exports.createRisk = async (req,res, next)=>{
    return res.status(404).json({success : false , message : 'This operation is not avaliable right now'});
    // try{
    //     req.params = mongoSanitize.sanitize(req.params);  // กัน NoSQL injection 
    //     req.body = mongoSanitize.sanitize(req.body);
    //     //validate params.id
    //     if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success : false , message : 'invalid id format'});
    //     const project = await Project.findById(req.params.id);
    //     if(!project) return res.status(404).json({success : false , message : 'cannot find project'});

    //     if(req.user.id !== project.userID.toString()){
    //         return res.status(403).json({success : false , message : 'you cannot make risk detail on other\'s project'});
    //     }

    //     const riskExisted = await Risk.findOne({projectID : req.params.id});   //ถ้ารู้ว่ามีอันเดียวก็ใช้ FindOne ไปเลย
    //     console.log(riskExisted);
    //     if(riskExisted){
    //         return res.status(400).json({success : false , message : 'This project already has risk data'});
    //     }

    //     req.body.projectID = project.id;
    //     let {projectID , floodRisk , windRisk , modelRef} =  req.body;
    //     // //validate floodRisk
    //     if(!floodRisk || !floodRisk.phaseOne || !floodRisk.phaseTwo) return res.status(400).json({success : false , message : 'missing floodrisk data '});
    //     floodRisk.phaseOne = validateObj(floodRisk.phaseOne || {});
    //     floodRisk.phaseTwo = validateObj(floodRisk.phaseTwo || {});
    //     //validate windRisk
    //     if(!windRisk || !windRisk.phaseOne || !windRisk.phaseTwo) return res.status(400).json({success : false , message : 'missing windrisk data'});
    //     windRisk.phaseOne = validateObj(windRisk.phaseOne || {});
    //     windRisk.phaseTwo = validateObj(windRisk.phaseTwo || {});
    //     //validate modelRef
    //     if(!modelRef || modelRef.trim() === '') return res.status(400).json({success : false , message : 'required model reference name for risk data'});
    //     modelRef = validator.escape(xss(modelRef.trim()));
        


    //     const riskData = await Risk.create({
    //         projectID , 
    //         floodRisk, 
    //         windRisk , 
    //         modelRef
    //     })
    //     return res.status(201).json({success : true , message : 'risk detail created' , data : riskData});
    // }catch(error){
    //     console.log(error);
    //     return res.status(500).json({success : false , message : 'cannot create risk '});
    // }
};
// protection = 1 
// throw error = no need bc this api doesn't use transaction
exports.getRisk = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    try{
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success : false , message : 'รูปแบบ ID ใน URL ไม่ถูกต้อง'});
        const project = await Project.findById(req.params.id);
        if(!project) return res.status(404).json({success : false , message : 'ไม่พบช้อมูลของโครงการดังกล่าว'});
        if(req.user.role === 'evaluator' && (req.user.district !== project.district || req.user.id !== project.evaluatorID.toString())){
            return res.status(400).json({success : false , message : 'คุณไม่สามารถเข้าถึงข้อมูลของโครงการที่ไม่ได้อยู่ในเขตเดียวกับคุณได้'});
        }  
        if(req.user.role === 'user' && req.user.id !== project.userID.toString()){
            return res.status(403).json({success : false , message : 'คุณไม่สามารถเข้าถึงข้อมูลของโครงการที่ไม่ใช่ของคุณได้'});
        }

        const riskData = await Risk.findOne({projectID : project.id.toString()});
        if(riskData) return res.status(200).json({success : true , data : riskData});
        return res.status(404).json({success : false , message : 'โครงการนี้ยังไม่มีข้อมูลควมเสี่ยง'});

    }catch(error){
        console.log(error);
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดในฝั่งเซิร์ฟเวอร์'});
    }
}

 // this apis is optional not the main operation anymore
exports.editRiskDetail = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'This operation is not avaliable right now'});
    // try{
    //     //check project + validate id format 
    //     req.params = mongoSanitize.sanitize(req.params);
    //     if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success : false , message : 'รูปแบบ ID ใน URL ไม่ถูกต้อง'});
    //     const project = await Project.findById(req.params.id);
    //     if(!project) return res.status(404).json({success : false , message : 'ไม่พบข้อมูลของโครงการดังกล่าว'});

    //     const risk = await Risk.findOne({projectID : req.params.id});
    //     //check risk
    //     if(!risk) return res.status(404).json({success : false , message : 'โครงการนี้ยังไม่มีข้อมูลควมเสี่ยง'});
    //     //check authentication 
    //     if(project.userID.toString() !== req.user.id) return res.status(403).json({success : false , message : 'คุณไม่สามารถเข้าถึงข้อมูลของโครงการที่ไม่ใช่ของคุณได้'});

    //     let {floodRisk , windRisk , modelRef} =  req.body;
    //     // //validate floodRisk
    //     if(!floodRisk || !floodRisk.phaseOne || !floodRisk.phaseTwo) return res.status(400).json({success : false , message : 'ขาดข้อมูลความเสี่ยงทางด้านน้ำ'});
    //     floodRisk.phaseOne = validateObj(floodRisk.phaseOne || {});
    //     floodRisk.phaseTwo = validateObj(floodRisk.phaseTwo || {});
    //     //validate windRisk
    //     if(!windRisk || !windRisk.phaseOne || !windRisk.phaseTwo) return res.status(400).json({success : false , message : 'ขาดข้อมูลความเสี่ยงทางด้านลม'});
    //     windRisk.phaseOne = validateObj(windRisk.phaseOne || {});
    //     windRisk.phaseTwo = validateObj(windRisk.phaseTwo || {});
    //     //validate modelRef
    //     if(!modelRef || modelRef.trim() === '') return res.status(400).json({success : false , message : 'จำเป็นต้องกรอกข้อมูลของโมเดลที่ใช้อ้างอิงเกี่ยวกับข้อมูลความเสี่ยง'});
    //     modelRef = validator.escape(xss(modelRef.trim()));

    //     const updatedRisk = await Risk.findOneAndUpdate({_id : risk._id},{floodRisk , windRisk , modelRef},{runValidators : false});

    //     return res.status(200).json({success : true , message : 'แก้ไขข้อมูลความเสี่ยงสำเร็จ' , data : updatedRisk});
    // }catch(error){
    //     console.log(error);
    //     return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดทางฝั่งเซิร์ฟเวอร์'})
    // }
}

//path :DELETE  api/v1/project/:id/risk
exports.deleteRisk = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400 , message : 'ID ที่ส่งเข้ามาใน params ผิดรูปแบบ format ObjectID'}
        const project = await Project.findById(req.params.id).session(session);
        if(!project) throw { code : 550 , status : 404  , message : 'ไม่พบข้อมูลโครงการดังกล่าว'};
        const riskData = await Risk.findOne({projectID : project._id}).session(session); 
        if(!riskData) throw { code : 550 , status : 404 , message : 'ไม่พบข้อมูลความเสี่ยงในโครงการนี้'};
        // console.log(riskData); debug
        await Risk.findOneAndDelete({projectID : project._id} ,{session});
        await session.commitTransaction();
        return res.status(200).json({success : true , message : 'ลบข้อมูลความเสี่ยงทั้งหมดสำเร็จ'}); 
    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดฝั่ง server'});
    }finally{
        session.endSession();
    }
}
// // path : api/v1/project/:id/riskDetail
// exports.getRiskDetail = async (req,res,next)=>{
//     try{
//         req.params = mongoSanitize.sanitize(req.params);
//         let risk = await Risk.findOne({projectID : req.params.id});
//         if(!risk) return res.status(400).json({success : false , message : 'ไม่พบข้อมูลความเสี่ยง'});
//         //floodrisk_phase1_rcp2_6 and 
//         let phase1_rcp2_6 = assessRisk(risk.floodRisk.phaseOne.rcp2_6.data , risk.floodRisk.phaseOne.rcp2_6.freq , risk.windRisk.phaseOne.rcp2_6.data , risk.windRisk.phaseOne.rcp2_6.freq);
//         let phase2_rcp2_6 = assessRisk(risk.floodRisk.phaseTwo.rcp2_6.data , risk.floodRisk.phaseTwo.rcp2_6.freq , risk.windRisk.phaseTwo.rcp2_6.data , risk.windRisk.phaseTwo.rcp2_6.freq);
//         // console.log(floodrisk_phase1_rcp2_6);
//         let phase1_rcp4_5 = assessRisk(risk.floodRisk.phaseOne.rcp4_5.data , risk.floodRisk.phaseOne.rcp4_5.freq , risk.windRisk.phaseOne.rcp4_5.data , risk.windRisk.phaseOne.rcp4_5.freq);
//         let phase2_rcp4_5 = assessRisk(risk.floodRisk.phaseTwo.rcp4_5.data , risk.floodRisk.phaseTwo.rcp4_5.freq , risk.windRisk.phaseTwo.rcp4_5.data , risk.windRisk.phaseTwo.rcp4_5.freq);
//         let phase1_rcp6_0 = assessRisk(risk.floodRisk.phaseOne.rcp6_0.data , risk.floodRisk.phaseOne.rcp6_0.freq , risk.windRisk.phaseOne.rcp6_0.data , risk.windRisk.phaseOne.rcp6_0.freq);
//         let phase2_rcp6_0 = assessRisk(risk.floodRisk.phaseTwo.rcp6_0.data , risk.floodRisk.phaseTwo.rcp6_0.freq , risk.windRisk.phaseTwo.rcp6_0.data , risk.windRisk.phaseTwo.rcp6_0.freq);
//         console.log('here');
//         console.log(phase1_rcp2_6);
//         console.log(risk.floodRisk.phaseOne.rcp2_6.data);
//         return res.status(200).json({success : true , "RCP 2.6" : {"phase1" : phase1_rcp2_6 , "phase2" : phase2_rcp2_6},
//             "RCP 4.5" : {"phase1" : phase1_rcp4_5 , "phase2" : phase2_rcp4_5} ,
//             "RCP 6.0" : {"phase1" : phase1_rcp6_0 , "phase2" : phase2_rcp6_0} 
//         });

//     }catch(error){
//         console.log(error);
//         return res.status(500).json({success : false , message : 'ojgjvebjpeb'});
//     }
// }








// // helping function



