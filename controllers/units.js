const Project = require('../models/Project');
const Unit = require('../models/Unit');
const xss = require('xss');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize'); // protect NoSQL injection
const validator = require('validator');

 // path : POST api/v1/project/:id/unit 
exports.createUnit = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    try{
        let targetProject = await Project.findById(req.params.id);
        if(!targetProject) return res.status(404).json({success : false , message : 'ไม่พบข้อมูลโครงการดังกล่าว'});
        let pID = targetProject._id;    
        // building ไอ่สาาาาาาส
        let unitExisted = await Unit.findOne({projectID : pID});
        if(unitExisted) return res.status(400).json({success : false , message : 'โครงการนี้มีข้อมูลยูนิตแล้ว ไม่สามารถสร้างข้อมูลยูนิตใหม่ได้'});
        let {projectID , totalUnit , units} = req.body;
        projectID = pID;
        if(totalUnit !== units.length) return res.status(400).json({success : false , message : 'จำนวนโครงการที่ระบุกับจำนวนข้อมูลโครงการไม่สอดคล้องกัน'});
        let unitData = await Unit.create({
            projectID , totalUnit , units
        });
        return res.status(201).json({success : true , message : 'สร้างข้อมูลยูนิตสำเร็จ' , data : unitData});
    }catch(error){
        console.log(error);
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
}
// protection -> 1
//error -> 1
//Transaction - > no need
exports.getAllUnits = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    req.params = mongoSanitize.sanitize(req.params);
    try{
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400 , message : 'ข้อมูล ID ที่ params ส่งมาผิดรูปแบบ format'}
        let UnitData = await Unit.findOne({projectID : req.params.id});
        if(!UnitData) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลยูนิตที่เกี่ยวข้องกับโครงการนี้'};
        return res.status(200).json({success : true , data : UnitData});
    }catch(error){
        console.log(error);
        if(error.code === 550) {
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
}
// path : api/v1/project/:id/unit/:uID
exports.getUnit = async  (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    req.params = mongoSanitize.sanitize(req.params);
    try{
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400 , message : 'ข้อมูล ID ที่ params ส่งมาผิดรูปแบบ format'};
        let unitData= await Unit.findOne({projectID : req.params.id});
        if(!unitData) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลยูนิตที่เกี่ยวข้องกับโครงการนี้'};
        let unit = unitData.units.id(req.params.uID);
        if(!unit) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลยูนิตดังกล่าว'};
        return res.status(200).json({success : true , data : unit});


    }catch(error){
        console.log(error);
        if(error.code === 550){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
}

// ไม่ต้องใช้อีกต่อไปเพราะใช้ edit project ทีเดียว
exports.editUnitDetail = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    try{
        let UnitsData = await Unit.findOne({projectID : req.params.id});
        if(!UnitsData) return res.status(404).json({success : false , message : 'ไม่พบข้อมูลยูนิตที่เกี่ยวข้องกับโครงการนี้'});
        let singleUnit = UnitsData.units.id(req.params.uID);
        console.log(singleUnit);
        if(!singleUnit) return res.status(404).json({success : false , message : 'ไม่พบข้อมูลยูนิตดังกล่าว'});
        let {buildingType , buildingDetail} = req.body;
        singleUnit.buildingDetail = buildingDetail || singleUnit.buildingDetail;
        singleUnit.buildingType = buildingType || singleUnit.buildingType;
        // save ยังไง
        await UnitsData.save();
        return res.status(200).json({success : true , message : 'แก้ไขข้อมูลยูนิตสำเร็จ' , data : singleUnit});
    }catch(error){
        console.log(error);
    return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
}
// path : PATCH  api/v1/project/:id/unit/:action (p,n) : เอาไว้เพิ่ม unit object เข้าไปเพิ่มหรือลบ unit ที่ไม่ต้องการออก 
//ยังจำเป็นอยู่
exports.manageTotalUnits = async(req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        req.params = mongoSanitize.sanitize(req.params);
        req.body = mongoSanitize.sanitize(req.body);
        const {id , action } = req.params;
        const {newUnit , deleteUnit} = req.body;
        //Protection 
        if(!mongoose.Types.ObjectId.isValid(id)) throw {code : 550 , status : 400 , message : 'ID ที่ส่งมาใน params ผิด format ObjectID'};
        let unitData = await Unit.findOne({projectID : id}).session(session);
        if(!unitData) throw { code : 550 , status : 404 , message :'ไม่พบข้อมูลยูนิตที่เกี่ยวข้องกับโครงการนี้'};
        if(action === 'p'){
            if(!newUnit || !Array.isArray(newUnit) || newUnit.length === 0) throw { code : 550 , status : 400 , message :'ข้อมูลของยูนิตที่ต้องการเพิ่มอยู่ในรูปแบบที่ไม่ถูกต้อง / ไม่พบข้อมูลยูนิตที่ต้องการเพิ่ม'};
            newUnit.forEach((unit)=>{
                const {buildingType , buildingDetail} = unit;
                if(!buildingType || !buildingDetail) throw {code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ขาดหายไป'};
                unitData.units.push({buildingDetail , buildingType});
            });

            unitData.totalUnit += newUnit.length;

        }else if( action === 'n'){
            if(!deleteUnit || !Array.isArray(deleteUnit) || deleteUnit.length === 0) throw { code : 550 , status : 400 , message : 'ข้อมูลของยูนิตที่ต้องการลบอยู่ในรูปแบบที่ไม่ถูกต้อง / ไม่พบข้อมูลยูนิตที่ต้องการลบ'};
            const filteredUnit = unitData.units.filter(unit=>
                !deleteUnit.includes(unit._id.toString())
            );
            //filterUnit เป็น array ใหม่ที่กรอก unit ที่ถูกลบออกแล้ว เหลือแต่อันที่ต้องการ
            if(filteredUnit.length === unitData.length) throw { code : 550 , status : 404 , message : 'ไม่พบข้อมูลของบางยูนิตที่ต้องการลบ'};
            unitData.units = filteredUnit;
            unitData.totalUnit = filteredUnit.length;
        }else{
            throw { code : 550 , status : 404 , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'};
            // return res.status(404).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
        }

        await unitData.save({session});
        await session.commitTransaction();
        return res.status(200).json({success : true , data : unitData});
    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 550) return res.status(error.status).json({success : false , message : error.message});
       else if(error.name === 'ValidationError'){    //แยก error เองตามข้อความผ่าน Console 
            const errors = Object.values(error.errors).map((err)=>({
                field : err.properties.path, 
                message : err.properties.message,
                // type : err.properties.type,
            }));
            return res.status(400).json({success : false , message : errors[0].message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
}

// path /api/v1/project/:id/unit
exports.deleteUnits = async (req,res,next)=>{
    return res.status(404).json({success : false , message : 'this operation is not avaliable right now'});
    req.params = mongoSanitize.sanitize(req.params);
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success : false , message : 'ID ที่ส่งมาใน params ผิด format ObjectID'});
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        let unitExisted = await Unit.findOne({projectID : req.params.id}).session(session);
        if(!unitExisted) throw { code : 550 , status : 404 , message : 'ไม่พบข้อมูลยูนิตที่เกี่ยวข้องกับโครงการนี้'};
        await Unit.findOneAndDelete({projectID : req.params.id} , { session});
        await session.commitTransaction();
        return res.status(200).json({success : 'true' , message : 'ลบข้อมูลยูนิตสำเร็จ'})
    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 550) return res.status(error.status).json({success : false , message : error.message});
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
}