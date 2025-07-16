const Project = require('../models/Project');
const Unit = require('../models/Unit');
const Risk = require('../models/Risk');
const User = require('../models/User');
const districtData = require('../info/district_sub.json');
const multer = require('multer');
const {PutObjectCommand ,GetObjectCommand , ListObjectsV2Command , HeadObjectCommand} = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');
const {s3 } = require('../middleware/uploadConfig');
const genNum = require('../utils/generateNumber');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sanitizeFileName = require('../utils/sanitizeFileName');
const { default: mongoose, model } = require('mongoose');
const xss = require('xss');
const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize');
const { type } = require('os');
const puppeteer = require('puppeteer');
// const {makeCertificate} = require('../utils/buildCertificate');
// Create Project === 700 (เหลือกัน xss)
// path : POST /api/v1/project
exports.createProject = async(req , res , next)=>{
    const session = await mongoose.startSession(); // เริ่ม Session สำหรับ Transaction
    try{
        session.startTransaction(); // เริ่ม Transaction
        req.body = mongoSanitize.sanitize(req.body);
        req.body.userID = req.user.id;  //เอา user._id มายัดใส่ใน body (จะมีข้อมูล req.user.id ได้ API เส้นนั้นต้องผ่่าน route protect)
        let {userID ,evaluatorID, projectName , projectNum ,district,subDistrict, projectStatus , latitude , longtitude}  = req.body;
        //Protection----------------------------------------||
        // userID , evaluatorID , projectNum , projectStatus ของพวกนี้ไม่จำเป็นต้อง มี protection เพราะส่วนใหญ่เป็นการดึงมาจากที่อื่น หรือ มาจากการคำนวณ
        if((!projectName || projectName.trim() === '') || (validator.escape(projectName) !== projectName)) throw {code : 550 , status : 400 , message : 'ชื่อโครงการไม่สามารถมีอักขระพิเศษหรือ ไม่สามารถถูกเว้นว่างได้'};
        if((!district || district.trim() === '') || (validator.escape(district) !== district)) throw {code : 550 , status : 400 , message : 'ชื่อเขตไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถถูกเว้นว่างได้'};
        if((!subDistrict || subDistrict.trim() === '') || (validator.escape(subDistrict) !== subDistrict)) throw {code : 550 , status : 400 , message : 'ชื่อแขวงไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถถูกเว้นว่างได้'};
        if((typeof latitude !== 'number') || (typeof longtitude !== 'number')) throw {code : 550 , status : 400 , message : 'ข้อมูลละติจูด / ลองจิจูด ต้องเป็นข้อมูลประเภทตัวเลข'};
        // random เลขโครงการในระบบเรา 
        if(!projectNum){
            projectNum = await genNum();
        }
        const targetDistrict = district;

        //LOGIC แจกจ่ายงาน
        let evaData = await User.find({role : 'evaluator' , district : targetDistrict}).sort({createdAt : 1}).session(session);
        // console.log(evaData);
        if(!evaData || evaData.length === 0) throw {code : 550 , status : 400 , message : 'ยังไม่สามารถสร้างโครงการได้ในขณะนี้ ระบบยังไม่มีผู้ตรวจสอบโครงการในเขตดังกล่าว ขออภัยในความไม่สะดวก'};
     
        let targetID;
        let thisState;
        // console.log(evaData.length);
        // console.log(evaData);
        // const allProjectInDistrict = projects.filter(p=>p.district === districtName);
        let caseOne = evaData.filter(p=>p.workState === true);
        // let caseOne2 = evaData.filter(p=>p.workState === false);
        if(((caseOne.length === evaData.length) || (caseOne.length === 0))){
            //caseOne 
            // console.log('case1');
            targetID = evaData[0]._id;
            thisState = evaData[0].workState;
            
        }else{
            // console.log('Case two , we implementing');
            // console.log('case2');
            for(let i = 0; i < evaData.length; ++i){
                if(i === 0) continue;
                let thisEva = evaData[i];
                let BeforeEva = evaData[i-1];
                if(thisEva.workState !== BeforeEva.workState){
                    targetID = thisEva._id;
                    thisState = thisEva.workState;
                    break;
                }
            }
        }

        const project = await Project.create([{
            userID ,
            evaluatorID : targetID,  
            projectName ,
            projectNum, 
            district,
            subDistrict,
            latitude,
            longtitude,
            projectStatus , //ไม่จำเป็น 
            comment : null ,
            document : []
        }], {session});
        await User.findByIdAndUpdate(targetID , {workState : !thisState} , {session});
        //สร้าง unit ต่อ  + อยากเช็คให้แบบ totalUnit ต้องเป็น type ตัวเลขเท่านั้น และ units ต้องเป็น array
        let {projectID , totalUnit , units} = req.body;
        if(!units) throw {code : 550 , status : 404 ,message : 'ไม่พบข้อมูลยูนิตที่ต้องการสร้าง'};
        if(!Array.isArray(units)) throw {code : 550 , status : 400 , message : 'รูปแบบข้อมูลของยูนิตที่ส่งเข้ามา ไม่ตรงตามรูปแบบที่กำหนด'};
        totalUnit = units.length;
        const unit  = await Unit.create([{
            projectID : project[0]._id , 
            totalUnit : units.length,
            units
        }],{session});
        //สร้าง risk ต่อ + กัน scripting ถหมดแล้วในแค่ส่วนของ risk นี้ 
        let {floodRisk , windRisk , modelRef} = req.body;
        if(!floodRisk || !floodRisk.phaseOne || !floodRisk.phaseTwo) throw {code : 550 , status : 400 , message : 'ข้อมูลความเสี่ยงทางด้านน้ำไม่สมบูรณ์ หรือ ข้อมูลบางฟิลด์ขาดหายไป'};
        floodRisk.phaseTwo = validateObj(floodRisk.phaseTwo || {});
        //validate windRisk
        if(!windRisk || !windRisk.phaseOne || !windRisk.phaseTwo) throw {code : 550 , status : 400 , message : 'ข้อมูลความเสี่ยงทางด้านน้ำไม่สมบูรณ์ หรือ ข้อมูลบางฟิลด์ขาดหายไป'};
        windRisk.phaseOne = validateObj(windRisk.phaseOne || {});
        windRisk.phaseTwo = validateObj(windRisk.phaseTwo || {});
        //validate modelRef
        if(!modelRef || modelRef.trim() === '') throw {code : 550 , status : 400 , message : 'จำเป็นต้องกรอกชื่อของโมเดลที่อ้างอิงสำหรับข้อมูลความเสี่ยง'};
        // modelRef = validator.escape(xss(modelRef.trim()));

        const risk = await Risk.create([{
            projectID : project[0]._id ,
            floodRisk , 
            windRisk ,
            modelRef
        }], {session});

        await session.commitTransaction();
        return res.status(201).json({success : true , message : 'สร้างข้อมูลโครงการสำเร็จ' , projectData : project[0] , unitData : unit[0] , riskData : risk[0]});


    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if(error.code === 11000){   //มันแยกอย่างงี้ได้เลย โคตรเจ๋ง 
            return res.status(400).json({success : false , message : 'ข้อมูลบางฟิลด์ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบ โปรดตรวจสอบข้อมูล ละติจูด ลองจิจูด'});
        }
        else if(error.name === 'ValidationError'){    //แยก error เองตามข้อความผ่าน Console 
            const errors = Object.values(error.errors).map((err)=>({
                field : err.properties.path, 
                message : err.properties.message,
                // type : err.properties.type,
            }));
            return res.status(400).json({success : false , message : 'สร้างโครงการไม่สำเร็จ' , errors});
        }
        //error 550
        else return res.status(500).json({success : false , message : error.message});
    }finally{
        session.endSession();
    }
};

//View Project for every role=== 1000 (evaluator ควรเห็นแค่อันที่ยังไม่มีคนตรวจไหมนะ?). 
// ไม่ต้องมี session : GET method ไม่มีการเปลี่ยนแปลงข้อมูล 
// path : GET /api/v1/project
exports.getAllProjects = async (req,res,next)=>{
    let queryObj = {};
    let url = mongoSanitize.sanitize(req.query); // NoSQL injection 

    //Searching (เดี๋ยวค่อย optimized)
    if(url.projectName){   //หาชื่อ 
        if(typeof url.projectName !== 'string') throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        queryObj.projectName = {$regex : req.query.projectName , $options : "i"};  // regex = ให้หาคำคล้าย , option i = ไม่แคร์พิมใหญ่-เล็ก
    }
    if(url.district){
        if(typeof url.district !== 'string') throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};    
        queryObj.district = url.district;
    }
    if(url.subDistrict){
        if(typeof url.subDistrict !== 'string') throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        queryObj.subDistrict = url.subDistrict;
    }
    if(url.status){
        if(!['Completed' , 'รอเจ้าของโครงการ' , 'รอผู้ตรวจสอบ'].includes(url.status)) throw {code :550  , status :400 , message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'};
        queryObj.projectStatus = url.status;
    }


    //Filter Role 
    if(req.user.role === 'user'){
        queryObj.userID = req.user._id;   // หาแค่ project ที่มี userID ตรงกับ req.user._id
    }
    else if(req.user.role === 'evaluator'){
        queryObj.district = req.user.district; // หาแค่ project ที่มี district ตรงกับของ req.user.role -> evaluator 
        queryObj.evaluatorID = req.user._id;  // หาแค่ project ที่เป็นของ evaluator คนนั้น 
    }
    //Sorting
    let sortBy = url.sort ? url.sort.split(',').join(' ') : '-updatedAt createdAt';   // Ternary Operator  , default : สร้างล่าสุด-> เก่าสุด

    const populateObj = {
        path : 'userID evaluatorID',
        select : 'username email role'
    };


    try{
        const projects = await Project.find(queryObj).populate(populateObj)
            .sort(sortBy)
            .select('projectName projectNum  projectStatus updatedAt district');
        if(req.user.role === 'evaluator' || req.user.role === 'ce'){
            const totalFinished = projects.filter(p=>p.projectStatus === 'Completed').length;
            const totalWaitingEva = projects.filter(p=>p.projectStatus === 'รอผู้ตรวจสอบ').length;
            const totalWaitingUser = projects.filter(p=>p.projectStatus === 'รอเจ้าของโครงการ').length;
        return res.status(200).json({success : true , 
                                    total : projects.length, 
                                    totalFinishedProject : totalFinished , 
                                    totalWaitingForEvaluator : totalWaitingEva ,
                                    totalWaitingForUser : totalWaitingUser,
                                    data : projects });
        }
        if(projects.length === 0) return res.status(200).json({success : true ,message : 'คุณยังไม่มีโครงการ ในขณะนี้'});
        return res.status(200).json({success : true , data : projects});
    }catch(err){
        console.log(err);
        if(err.code === 550 || err.code === 550) return res.status(err.status).json({success : false , message : err.message});
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }   
    
};


//Get Single Project 
// path : GET /api/v1/project/:id
exports.getProject = async(req,res,next)=>{
    // let phase1_rcp2_6;
        let phase1_rcp2_6 ,phase2_rcp2_6 , phase1_rcp4_5 ,phase2_rcp4_5 ,phase1_rcp6_0 , phase2_rcp6_0 ;
        let obj = null;
        // console.log(floodrisk_phase1_rcp2_6);
        // let phase1_rcp4_5;
        // let phase2_rcp4_5;
        // let phase1_rcp6_0;
        // let phase2_rcp6_0 ;
        try{
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code :550  , status :400 , message : 'รูปแบบ id ที่ส่งเข้ามาผิด Format'};
        let project = await Project.findById(req.params.id);
        if(!project) throw {code : 550  , status : 404 , message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ'};
        // let certificate;
        // if(project.projectStatus === 'Completed'){
        //     // ทำ certificate
            
        // }

        //user ดูของคนอื่น
        if(req.user.role === 'user' && project.userID.toString() !== req.user.id) throw {code : 550 , status : 403 , message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณเป็นเจ้าของเท่านั้น'};
        
        if((req.user.role === 'evaluator' && project.district !== req.user.district )) throw {code : 550 , status : 403, message : 'คุณสามารถดูเฉพาะข้อมูลของโครงการที่อยู่ในเขตที่คุณรับผิดชอบได้เท่านั้น'};

        if(req.user.role === 'evaluator' && project.evaluatorID.toString() !== req.user.id) throw {code : 550 , status : 403, message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณรับผิดชอบได้เท่านั้น'};

        let unit = await Unit.findOne({projectID : req.params.id});
        let risk = await Risk.findOne({projectID : req.params.id});

        if(project.document.length > 0){   //ทำ signedURL ของไฟล์ล่าสุดเท่านั้น
            const fileKey = project.document[project.document.length-1].docFile.split('/').pop();  //ดึงชื่อไฟล์ออกจาก array ล่าสุด 
            const user = await User.findOne({_id : project.userID});
            const newFileKey = `${project.district}/${fileKey}`;
            // console.log(newFileKey);
            const command = new GetObjectCommand({
                Bucket : 'bucket1',
                Key : newFileKey,
                ResponseContentDisposition: 'attachment',   //ใส่ไปแล้วคลิ้กURL และมันดาว์นโหลดเลย 
            });
            if(['evaluator' , 'ce'].includes(req.user.role)){
                phase1_rcp2_6 = assessRisk(risk.floodRisk.phaseOne.rcp2_6.data , risk.floodRisk.phaseOne.rcp2_6.freq , risk.windRisk.phaseOne.rcp2_6.data , risk.windRisk.phaseOne.rcp2_6.freq);
                phase2_rcp2_6 = assessRisk(risk.floodRisk.phaseTwo.rcp2_6.data , risk.floodRisk.phaseTwo.rcp2_6.freq , risk.windRisk.phaseTwo.rcp2_6.data , risk.windRisk.phaseTwo.rcp2_6.freq);
                // console.log(floodrisk_phase1_rcp2_6);
                phase1_rcp4_5 = assessRisk(risk.floodRisk.phaseOne.rcp4_5.data , risk.floodRisk.phaseOne.rcp4_5.freq , risk.windRisk.phaseOne.rcp4_5.data , risk.windRisk.phaseOne.rcp4_5.freq);
                phase2_rcp4_5 = assessRisk(risk.floodRisk.phaseTwo.rcp4_5.data , risk.floodRisk.phaseTwo.rcp4_5.freq , risk.windRisk.phaseTwo.rcp4_5.data , risk.windRisk.phaseTwo.rcp4_5.freq);
                phase1_rcp6_0 = assessRisk(risk.floodRisk.phaseOne.rcp6_0.data , risk.floodRisk.phaseOne.rcp6_0.freq , risk.windRisk.phaseOne.rcp6_0.data , risk.windRisk.phaseOne.rcp6_0.freq);
                phase2_rcp6_0 = assessRisk(risk.floodRisk.phaseTwo.rcp6_0.data , risk.floodRisk.phaseTwo.rcp6_0.freq , risk.windRisk.phaseTwo.rcp6_0.data , risk.windRisk.phaseTwo.rcp6_0.freq);
                obj = {
                    rcp26 : {
                        phase1 : phase1_rcp2_6 , 
                        phase2 : phase2_rcp2_6
                    },
                    rcp45 : {
                        phase1 : phase1_rcp4_5,
                        phase2 : phase2_rcp4_5
                    },
                    rcp60 : {
                        phase1 : phase1_rcp6_0 , 
                        phase2 : phase2_rcp6_0
                    }
                }
            }

            const signedUrl =  await getSignedUrl(s3 , command , {expiresIn : 3600});   //Valid for 1 hour
            // console.log(certificate); // undefined ?
            if(pahse1_rcp2_6 === null) {
                return res.status(200).json({success : true , data : project ,unitData : unit  ,riskData : risk , downloadFile : signedUrl});    
            }else{
                return res.status(200).json({success : true , data : project ,unitData : unit  ,riskScore : obj,
            riskData : risk ,
             downloadFile : signedUrl});
            }
        }

        // console.log(certificate); // undefined ?
        if(['evaluator' , 'ce'].includes(req.user.role)){
                phase1_rcp2_6 = assessRisk(risk.floodRisk.phaseOne.rcp2_6.data , risk.floodRisk.phaseOne.rcp2_6.freq , risk.windRisk.phaseOne.rcp2_6.data , risk.windRisk.phaseOne.rcp2_6.freq);
                phase2_rcp2_6 = assessRisk(risk.floodRisk.phaseTwo.rcp2_6.data , risk.floodRisk.phaseTwo.rcp2_6.freq , risk.windRisk.phaseTwo.rcp2_6.data , risk.windRisk.phaseTwo.rcp2_6.freq);
                // console.log(floodrisk_phase1_rcp2_6);
                phase1_rcp4_5 = assessRisk(risk.floodRisk.phaseOne.rcp4_5.data , risk.floodRisk.phaseOne.rcp4_5.freq , risk.windRisk.phaseOne.rcp4_5.data , risk.windRisk.phaseOne.rcp4_5.freq);
                phase2_rcp4_5 = assessRisk(risk.floodRisk.phaseTwo.rcp4_5.data , risk.floodRisk.phaseTwo.rcp4_5.freq , risk.windRisk.phaseTwo.rcp4_5.data , risk.windRisk.phaseTwo.rcp4_5.freq);
                phase1_rcp6_0 = assessRisk(risk.floodRisk.phaseOne.rcp6_0.data , risk.floodRisk.phaseOne.rcp6_0.freq , risk.windRisk.phaseOne.rcp6_0.data , risk.windRisk.phaseOne.rcp6_0.freq);
                phase2_rcp6_0 = assessRisk(risk.floodRisk.phaseTwo.rcp6_0.data , risk.floodRisk.phaseTwo.rcp6_0.freq , risk.windRisk.phaseTwo.rcp6_0.data , risk.windRisk.phaseTwo.rcp6_0.freq);
                obj = {
                    rcp26 : {
                        phase1 : phase1_rcp2_6 , 
                        phase2 : phase2_rcp2_6
                    },
                    rcp45 : {
                        phase1 : phase1_rcp4_5,
                        phase2 : phase2_rcp4_5
                    },
                    rcp60 : {
                        phase1 : phase1_rcp6_0 , 
                        phase2 : phase2_rcp6_0
                    }
                }
            }
        if(obj!== null ){
            return res.status(200).json({success :true , data : project , unitData : unit, riskData : risk , riskScore : obj});
        }else{
            return res.status(200).json({success :true , data : project , unitData : unit, riskData : risk});
        }


    }catch(err){
        console.error(err.message); 
        if(err.code === 550 || err.code === 550) return res.status(err.status).json({success : false , message : err.message});
        return res.status(500).json({ success: false, message: 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์' , errors : err });
    }
};


//edit a project detail  
// path : PUT api/v1/project/:id
exports.editProject = async(req,res,next)=>{
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        //NoSQL injection -------||
        req.params = mongoSanitize.sanitize(req.params);
        req.body = mongoSanitize.sanitize(req.body);
        //-----------------------||

        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , status : 400 , message : 'ID ที่ส่งเข้ามาใน params ไม่ถูกต้องตาม Format'};
        let project = await Project.findById(req.params.id).session(session);
        if(!project) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ'};
        if(project.projectStatus === 'Completed') throw {code : 550 , status : 400 , message : 'โครงการนี้ผ่านการตรวจสอบแล้ว ไม่สามารถแก้ไขข้อมูลได้'};
        // if(project.projectStatus === 'Completed') return res.status(200).json({message : 'this project already approved'});
        
        //ทำได้แต่ของตัวเอง 
        if(project.userID.toString() !== req.user.id && !['admin','evaluator'].includes(req.user.role)) throw {code : 550 , message : 403 , message : 'คุณไม่สามารถแก้ไขข้อมูลโครงการที่คุณไม่ใช่เจ้าของได้'};
        
        //เตรียมค่า 
        let updateObj = {};
        let {projectName , projectStatus , comment} = req.body;
        // แปลงเป็นสองตำแหน่ง 
        // latitude = latitude ? parseFloat(latitude.toFixed(2)) : latitude;
        // longtitude = longtitude ? parseFloat(longtitude.toFixed(2)) : longtitude;
        //Protection-----||
        if(projectName && (validator.escape(projectName) !== projectName)) throw {code : 550 , status : 400 , message : 'ชื่อโครงการไม่สามารถมีอักขระอันตรายได้'};
        // if(district && (validator.escape(district) !== district)) throw {code : 550 , status : 400 , message : 'ชื่อเขตไม่สามารถมีอักขระพิเศษได้'};
        // if(subDistrict && (validator.escape(subDistrict) !== subDistrict)) throw { code : 550 , status : 400 , message : 'ชื่อแขวงไม่สามารถมีอักขระพิเศษได้'};
        // if((latitude && (typeof latitude !== 'number')) || (longtitude && (typeof longtitude !== 'number'))) throw { code : 550 , status : 400 , message : 'ละติจูดและลองจิจูดต้องเป็นข้อมูลตัวเลขเท่านั้น'}
        if(comment) comment  = customEscape(comment);
        //แบ่งงานตาม Role
        if(req.user.role === 'user'){
            // if(projectStatus === 'Completed'){
            //     throw {code : 550 , status : 400 , message : 'โครงการนี้ผ่านการตรวจสอบแล้ว ไม่สามารถแก้ไขข้อมูลได้'};
            // }

            //Logic เช็ค district / subDistrict
            // if(district && subDistrict){    
            //     if( districtData[district] && !districtData[district].includes(subDistrict)) throw {code : 550 , status : 400 , message : 'ข้อมูลแขวงไม่อยู่ในเขตดังกล่าว'};  
            // }else if(!district && subDistrict){
            //     if(!districtData[project.district].includes(subDistrict)) throw {code : 550 , status : 400 , message : 'ข้อมูลแขวงไม่อยู่ในเขตดังกล่าว'};
            // }
            //---------------อยากให้มันเป็นสองแบบคือ ใส่ข้อมูลที่เข้ามาใหม่หรือไม่ก็ถ้าไม่มีข้อมูลใหม่ ก็ assign ค่าเก่าไป--------------------
                updateObj = {
                    projectName ,
                    comment,
                    projectStatus : 'รอผู้ตรวจสอบ'
                };
        }
        else if(req.user.role === 'evaluator'){   //eva edit ได้แต่ status , comment
            if(!['Completed', 'รอเจ้าของโครงการ'].includes(projectStatus)) throw {code : 550 ,status : 400 ,  message : 'กรุณากรอกสถานะโครงการให้ถูกต้อง'};
            // ตรวจได้แค่ที่ของตัวเอง 
            if(project.district !== req.user.district) throw { code : 550 , status : 403 , message : 'คุณสามารถตรวสอบโครงการได้เฉพาะโครงการที่อยู่ในเขตเดียวกับคุณเท่านั้น'};
            
            // if(!project.evaluatorID) return res.status(400).json({success : false , message : 'please assign a project first'})
            //ถ้ามีคนตรวจแล้ว + ไม่ใช่เรา 
            if(project.evaluatorID && project.evaluatorID.toString() !== req.user.id){
                throw { code : 550 , status : 403 , message : 'คุณไม่สามารถตรวจสอบโครงการที่ไม่อยู่ในความรับผิดชอบของคุณได้'};
            }
            updateObj = {projectStatus , comment};
        }else{
            updateObj = req.body;   // admin แม่งทำได้ทุกอย่าง 
        }



        project = await Project.findByIdAndUpdate(req.params.id ,updateObj, {
            new : true ,
            runValidators : true,
            session ,
        });

        let updatedUnit;
        let updatedRisk;

        // แก้ไข Unit : (แก้ทีละอัน) + จะแก้หรือไม่แก้ก็ได้ !แก้ไขของที่มีอยู่แล้ว!
        let {units} = req.body;
        if(units && req.user.role === 'user'){ //only user role can do this action
            /* reg.body ที่เข้ามา : ->
            units : [
            {uID : 84290924929402 , buildingType : 'อรนอยนำไอ' , buildingDetail : '.....'},
            {....},
            {.....}
            ];
            โดยที่ uID จะเป็นข้อมูลใน block array ของ model Unit นั้น 
            */

           if(!Array.isArray(units)) throw {code : 550 ,status : 400 , message : 'โครงสร้างข้อมูลขอบงยูนิตต้องเป็น อาร์เรย์'};
           units = validateUnitUpdateObj(units); // ถ้าเป็น array แต่โครงสร้างข้างในไม่ถูกต้อง ก็ throw error
           let unitData = await Unit.findOne({projectID : req.params.id}).session(session);
           if(!unitData) throw {code : 550 , status : 400 , message : 'ไม่พบข้อมูลยูนิตในโครงการนี้'};
           for(let i = 0; i < units.length;++i){ // loop ของใน array ของ units ใน reg.body 
            let unit = unitData.units.id(units[i].uID);  //each unit ของเก่า 
            if(!unit) throw {code : 550 , status : 400 , message : 'ไม่เจอข้อมูลยูนิตนี้'};
            unit.buildingType = units[i].buildingType ? units[i].buildingType : unit.buildingType;  // ถ้าของใหม่มี field ที่ต้องการเปลี่ยน ก็จัดการได้ , ถ้าไม่มี ก็คงค่าเดิม
            unit.buildingDetail = units[i].buildingDetail ? units[i].buildingDetail : unit.buildingDetail;
            }
            await unitData.save({session});
            updatedUnit = unitData;
        }
        // End of Editing Unit 
        //Next : edit RiskData
        let {floodRisk , windRisk , modelRef} = req.body;
        /*req.body : 
            floodRisk : {object} , 
            windRisk : {object} , 
            modelRef : 'string'
        */
        if((floodRisk || windRisk || modelRef) && req.user.role === 'user'){
            console.log('working');
            let riskData = await Risk.findOne({projectID : req.params.id}).session(session);
            if(!riskData) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ , ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'};
            if(floodRisk){
                if(!floodRisk.phaseOne || !floodRisk.phaseTwo) throw { code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ในความเสี่ยงทางน้ำไม่ครบ'};
                riskData.floodRisk.phaseOne = floodRisk.phaseOne ? validateObj(floodRisk.phaseOne) : riskData.floodRisk.phaseOne;
                riskData.floodRisk.phaseTwo = floodRisk.phaseTwo ? validateObj(floodRisk.phaseTwo) : riskData.floodRisk.phaseTwo;
            }
            if(windRisk){
                if(!windRisk.phaseOne || !windRisk.phaseTwo) throw { code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ในความเสี่ยงทางลมไม่ครบ'};
                riskData.windRisk.phaseOne = windRisk.phaseOne ? validateObj(windRisk.phaseOne) : riskData.windRisk.phaseOne;
                riskData.windRisk.phaseTwo = windRisk.phaseTwo ? validateObj(windRisk.phaseTwo) : riskData.windRisk.phaseTwo;
            }
            if(modelRef && typeof modelRef === 'string'){
                if(validator.escape(modelRef) !== modelRef) throw {code : 550 , status : 400 , message : 'ข้อมูลโมเดลไม่สามารถมีอักขระพิเศษได้'};
                riskData.modelRef = modelRef ? modelRef : riskData.modelRef;
            }
            await riskData.save({session});
            updatedRisk = riskData;
        }
        //end of editing riskData


        await session.commitTransaction();



        if(req.user.role === 'user'){
            return res.status(200).json({success : true , message : 'แก้ไขข้อมูลโครงการสำเร็จ' , data : project , unit : updatedUnit , risk : updatedRisk});
        }else if(req.user.role === 'evaluator') {
            return res.status(200).json({success : true , message : 'ตรวจสอบข้อมูลโครงการสำเร็จ' , data : project});
        }else return res.status(200).json({success : true , message : 'แก้ไขข้อมูลโครงการสำเร็จ'})


    }catch(error){
        await session.abortTransaction();
        console.log(error);
        if([550 , 550].includes(error.code)){
            return res.status(error.status).json({success : false , message : error.message});
        } 
        else if(error.name === 'ValidationError'){    //แยก error เองตามข้อความผ่าน Console 
            const errors = Object.values(error.errors).map((err)=>({
                field : err.properties.path, 
                message : err.properties.message,
                // type : err.properties.type,
            }));
            return res.status(500).json({success : false , message : 'แก้ไขข้อมูลโครงการไม่สำเร็จ' , errors});
        }
        else return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์',error});

    }finally{
        session.endSession();
    }
};





//Delete Project user and Admin Only  (600)
// path : DELETE /api/v1/project/:id
exports.deleteProject = async (req,res,next)=>{
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code : 550 , message : 'ข้อมูล ID ที่ส่งมาทาง params ไม่ถูกต้องตาม  Format'};
        const project = await Project.findById(req.params.id).session(session);
        if(!project) throw { code : 550 , status : 404 , message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ'};
        if(req.user.id !== project.userID.toString() && req.user.role !== 'admin') throw {code : 550 , status : 403 , message : 'คุณไม่สามรถลบโครงการที่ไม่ใช่ของคุณได้'};
        //deleteMany Unit & Risk
        await Risk.deleteOne({projectID : req.params.id}).session(session);
        await Unit.deleteOne({projectID : req.params.id}).session(session);
        await project.deleteOne({session});
        await session.commitTransaction();
        return res.status(200).json({success : true , message : 'ลบข้อมูลโครงการ และ ข้อมูลยูนิตกับข้อมูลความเสี่ยงที่เกี่ยวข้องกับโครงการทั้งหมดเสร็จสิ้น', data : {}});

    }catch(error){
        await session.abortTransaction();
        if([550 ,550].includes(error.code)){
            return res.status(error.status).json({success : false , message : error.message});
        }
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางด้านเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
    // เหลือ logic ลบทุก unit = มีแล้วจร้า
};

// Upload project Doc   /api/v1/project/:id/doc
// file size , duplicated file , 
// path : PATCH /api/v1/project/:id
exports.uploadDoc = async (req,res,next)=>{
    let file;
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        //NoSQL injection 
        // console.log(req.params.id);
        req.params = mongoSanitize.sanitize(req.params);
        // console.log(req.params.id);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw { code : 550  , status : 400 , message : 'รูปแบบ IID ที่ส่งเข้ามาใน params ไม่ถูกต้องตาม format'};
        let project = await Project.findById(req.params.id).session(session);

        if(!project) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลของโครงการดังกล่าว'};
        //ไม่ใช่ของตัวเอง + ไม่ใช่ admin = ทำไม่ได้
        if(project.userID.toString() !== req.user.id && req.user.role !== 'admin'){
            throw { code : 550 , status : 400 , message : 'ไม่สามารถอัพโหลดเข้าโครงการที่ไม่ใช่ของคุณ'}
            // return res.status(400).json({success : false  , message : 'ไม่สามารถอัพโหลดเข้าโครงการที่ไม่ใช่ของคุณ'});
        }

        file  = req.file;
        // throw {code : 550 , status : 404 , message : 'ไม่เจอไฟล์ที่ถูกอัพโหลดเข้ามา'};
        if(!file) throw {code : 550 , status : 404 , message : 'ไม่เจอไฟล์ที่ถูกอัพโหลดเข้ามา'};
        const projectID = req.params.id;
        const maxSize =  50*1024*1024;
        //check file size
        // console.log(`file size : ${file.size}`);
        if(file.size >= maxSize){
            // fs.unlinkSync(file.path);
            throw {code : 550 , status : 400 , message : 'ไม่สามารถอัพโหลดไฟล์ได้ ไฟล์ที่เข้ามามีขนาดไฟล์เกิน 50 Mbs'};
            // return res.status(400).json({success : false , message : 'ไม่สามารถอัพโหลดไฟล์ได้ ไฟล์ที่เข้ามามีขนาดไฟล์เกิน 50 Mbs'});
        }
        //จำกัดประเภทไฟล์ที่เข้ามา 
        if(file.mimetype !== 'application/pdf'){
            // fs.unlinkSync(file.path);
            throw {code : 550 , status : 400 , message : 'สามารถอัพโหลดได้เฉพาะไฟล์ประเภท PDF เท่านั้น'};
            // return res.status(400).json({success : false , message : 'สามารถอัพโหลดได้เฉพาะไฟล์ประเภท PDF เท่านั้น'});
        }
        //Handle file name--------------------||
        // console.log(file.originalname);
        let sanitizedName = sanitizeFileName(file.originalname);
        // console.log(sanitizedName);
        let parts = sanitizedName.split('.');
        // console.log(parts.length);
        // concat เวลาเข้าไปใน ชื่อไฟล์
        let time = new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // ใช้เวลาแบบ 24 ชั่วโมง
        timeZone: 'Asia/Bangkok' // ตั้งค่าให้ตรงกับไทย
        }).format(new Date());
        let time2 = new Date().toISOString().split('T')[0];
        // console.log(time , time2);
        // console.log(parts);
        let time3 = time2+"T"+time;
        time3 =time3.split(' ').join('');
        // time3 = time3.join('');
        let newName = parts[0]+time3+"."+parts[1];
        newName = newName.split(':').join('_');
        // console.log(newName);
        //-----------------------------------------||

        const fileStream = fs.createReadStream(file.path);

        const fileKey = `${project.district}/${path.basename(newName)}`;
        // แบ่งเขต  = ทำละ  แต่ยังคิดๆว่าน่าจะทำแบบ
        await s3.send( // upload เข้า miniO APIs 
            new PutObjectCommand({
                Bucket : 'bucket1' ,
                Key : fileKey , 
                Body : fileStream , 
                ContentType : file.mimetype,
            })
        );        
        const fileURL = `http://127.0.0.1:9001/browser/bucket1/${fileKey}`;   

        // project.requireDoc = fileURL;
        // project.Doctype  = file.mimetype; // file type 
        const fileObj = {
            docFile : fileURL ,
            docType : file.mimetype
        }
        project.document.push(fileObj);
        await project.save({session});
        await session.commitTransaction();
        fs.unlinkSync(file.path); 
        return res.status(201).json({success : true , message : 'อัพโหลดไฟล์สำเร็จ' , data : project});


    }catch(error){
        if([550,550].includes(error.code)){
            fs.unlinkSync(file.path);
            return res.status(error.status).json({success : false , message : error.message});
        }
        console.log(error);
        await session.abortTransaction();
        fs.unlinkSync(file.path);
        console.log(error);
        return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดในการอัพโฟลดไฟล์' , errorMessage : error});
    }finally{
        session.endSession();
    }
};

//path : api/v1/project/summary
exports.summaryInfo = async (req,res,next)=>{   //
    
    try{   //ce เห็นได้ว่าแต่ละเขตมีกี่ project , ในเขตนั้นมี project ที่มีสถานะต่างๆกี่อันบ้าง 
        const projects = await Project.find();
        const summaryDistrict = {};

        for(const districtName in districtData){

            // filter เขต
            const allProjectInDistrict = projects.filter(p=>p.district === districtName);
            
            //จำนวนของทุก project ในเขต
            const allproject = allProjectInDistrict.length;

            //จำนวนของ project ที่ผ่านแล้ว
            const finished = allProjectInDistrict.filter(p=>p.projectStatus === 'Completed').length;

            //จำนวนของ project ที่ยังไม่ผ่าน
            const pending =  allProjectInDistrict.filter(p=>p.projectStatus !== 'Completed').length;

            summaryDistrict[districtName] ={
                total : allproject , 
                finishedProject : finished , 
                pendingProject : pending
            };
            
        }

        return res.status(200).json({success :true , data : summaryDistrict});
    }catch(errror){
        console.log(error);
        return res.status(400).json({success : false , message : 'เกิดข้อผิดพลาดทางฝั่งเซิร์ฟเวอร์'});
    }

    
    
};
// path : /api/v1/project/:id/certificate
exports.createCertificate = async (req,res,next)=>{
    try{
        req.params = mongoSanitize.sanitize(req.params);
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({success : false , message : 'ID ทางparams ผิด format ObjectId'});
        let project = await Project.findById(req.params.id);
        if(!project) return res.status(404).json({success : false ,message : 'ไม่พบโครงการดังกล่าว'});
        let unit = await Unit.findOne({projectID : req.params.id});
        let risk = await Risk.findOne({projectID : req.params.id});
        let eva = await User.findById(project.evaluatorID);
        let certificate;
        //Make Certificate
        if(project.projectStatus === 'Completed'){ //project.projectStatus === 'Completed'
            const existed = await fileExists('bucket1' , `certificate/${project.projectNum}.pdf`);
            if(existed){
                console.log('11111');
                const command = new GetObjectCommand({Bucket : 'bucket1' , Key : `certificate/${project.projectNum} `});
                const signedUrl = await getSignedUrl(s3 , command , {expiresIn : 3600});
                certificate = signedUrl;

            }else{
                 console.log('9999999');
                let date  = formatThaiDate(project.updatedAt);
                const browser = await puppeteer.launch({ headless: 'new' }); //เปิดBrowserจำลองแบบไม่จำเป็นต้องมีหน้าจอ
                const page = await browser.newPage(); //เปิด tab ใหม่ 

                const html = `
                <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Sarabun', sans-serif;
        font-size: 14px;
        padding: 40px;
        line-height: 1.6;
      }
      h2 {
        text-align: center;
        font-size: 18pt;
        margin-bottom: 30px;
      }
      .info p {
        margin: 4px 0;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
      }
      td, th {
        border: 1px solid black;
        padding: 16px;
        height: 40px;
        text-align: center;
      }
      .right {
        text-align: right;
        margin-top: 10px;
        padding-right: 20px;
      }
      .bold {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <h2>ใบรับรองข้อมูลความเสี่ยง</h2>

    <div class="info">
  <p>
    <span class="bold">โครงการ :</span> ${project.projectName}
    <span class="bold"> เลขที่โครงการ :</span> ${project.projectNum}
  </p>
  <p>
    <span class="bold">สถานที่ตั้ง :</span> เขต${project.district} แขวง${project.subDistrict}
  </p>
  <p>
    <span class="bold">พิกัดละติจูด :</span> ${project.latitude}°
    <span class="bold"> พิกัดลองจิจูด :</span> ${project.longtitude}°
  </p>
  <p>
    <span class="bold">จำนวนยูนิตในโครงการ :</span> ${unit.totalUnit} ยูนิต
  </p>
</div>


    <h3>ข้อมูลความเสี่ยง</h3>

    <h4>น้ำท่วม</h4>
    <table>
      <thead>
        <tr>
          <th rowspan="2">RCP</th>
          <th colspan="2">ปัจจุบัน - พ.ศ.2593</th>
          <th colspan="2">พ.ศ.2594 - พ.ศ.2643</th>
        </tr>
        <tr>
          <th>ระดับน้ำ(ม.)</th>
          <th>รอบการเกิด(ปี)</th>
          <th>ระดับน้ำ(ม.)</th>
          <th>รอบการเกิด(ปี)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>RCP 2.6</td><td>${risk.floodRisk.phaseOne.rcp2_6.data}</td><td>${risk.floodRisk.phaseOne.rcp2_6.freq}</td><td>${risk.floodRisk.phaseTwo.rcp2_6.data}</td><td>${risk.floodRisk.phaseTwo.rcp2_6.freq}</td></tr>
        <tr><td>RCP 4.5</td><td>${risk.floodRisk.phaseOne.rcp4_5.data}</td><td>${risk.floodRisk.phaseOne.rcp4_5.freq}</td><td>${risk.floodRisk.phaseTwo.rcp4_5.data}</td><td>${risk.floodRisk.phaseTwo.rcp4_5.freq}</td></tr>
        <tr><td>RCP 6.0</td><td>${risk.floodRisk.phaseOne.rcp6_0.data}</td><td>${risk.floodRisk.phaseOne.rcp6_0.freq}</td><td>${risk.floodRisk.phaseTwo.rcp6_0.data}</td><td>${risk.floodRisk.phaseOne.rcp6_0.freq}</td></tr>
      </tbody>
    </table>

    <h4>แรงลม</h4>
    <table>
      <thead>
        <tr>
          <th rowspan="2">RCP</th>
          <th colspan="2">ปัจจุบัน - พ.ศ.2593</th>
          <th colspan="2">พ.ศ.2594 - พ.ศ.2643</th>
        </tr>
        <tr>
          <th>ความเร็ว(กม./ชม.)</th>
          <th>รอบการเกิด(ปี)</th>
          <th>ความเร็ว(กม./ชม.)</th>
          <th>รอบการเกิด(ปี)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>RCP 2.6</td><td>${risk.windRisk.phaseOne.rcp2_6.data}</td><td>${risk.windRisk.phaseOne.rcp2_6.freq}</td><td>${risk.windRisk.phaseTwo.rcp2_6.data}</td><td>${risk.windRisk.phaseTwo.rcp2_6.freq}</td></tr>
        <tr><td>RCP 4.5</td><td>${risk.windRisk.phaseOne.rcp4_5.data}</td><td>${risk.windRisk.phaseOne.rcp4_5.freq}</td><td>${risk.windRisk.phaseTwo.rcp4_5.data}</td><td>${risk.windRisk.phaseTwo.rcp4_5.freq}</td></tr>
        <tr><td>RCP 6.0</td><td>${risk.windRisk.phaseOne.rcp6_0.data}</td><td>${risk.windRisk.phaseOne.rcp6_0.freq}</td><td>${risk.windRisk.phaseTwo.rcp6_0.data}</td><td>${risk.windRisk.phaseOne.rcp6_0.freq}</td></tr>
      </tbody>
    </table>

    <p>ได้ผ่านการตรวจสอบความเสี่ยงและได้มีมาตรการรองรับความเสี่ยงเหล่านี้เป็นที่เรียบร้อย</p>
    <p><span class="bold">ได้รับการตรวจสอบโดย :</span> ${eva.username}</p>
    <p><span class="bold">ขอบเขตพื้นที่ในการรับผิดชอบ:</span> เขต${eva.district}</p>
    <p class="right"><span class="bold">อนุมัติวันที่:</span> ${date}</p>
  </body>
</html>

                `;

                await page.setContent(html, { waitUntil: 'networkidle0' }); // โหลด content html เข้า tab browser ทีเพิ่งเปิด , รอมันโหลดข้อมูลทุกอย่างเสร็จ (waitUntil )
                let pdfBuffer = await page.pdf({ format: 'A4', printBackground: true }); // แปลง html เป็น pdf แล้วเก็บไว้ใน pdfBuffer
                await browser.close(); // ปิด browser puppeteer ที่เคยเปิดมา กัน mem leak

                // ==== อัปโหลดเข้า MinIO ====
                let filename = `certificate/${project.projectNum}.pdf`;

                await s3.send(
                new PutObjectCommand({
                    Bucket: 'bucket1',
                    Key: filename,
                    Body: pdfBuffer,
                    ContentType: 'application/pdf',
                })
                );
                //find
                let command = new GetObjectCommand({
                Bucket: 'bucket1',
                Key: filename,
                ResponseContentDisposition: 'attachment',
                });

                let signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
                certificate = signedUrl;
                // return res.status(200).json({ success: true, certificate: signedUrl });
            }
            return res.status(200).json({success : true , certificate : certificate})
        
        }else {
            return res.status(400).json({success : false , message : 'โครงการนี้ยังไม่เสร็จสมบูรณ์ ยังไม่สามารถออกใบรับรองได้'});
        }
    }catch(error){
        console.log(error);
        return res.status(400).json({success : false , message : 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์'});
    }
    
}




// -----------------------------------------helping function------------------------------------------------//
 //function for validate obj for risk Data
    const validateObj = (phase)=>{
        for ( const rcp of  ['rcp2_6', 'rcp4_5', 'rcp6_0']){
            if(!phase[rcp]) throw { code : 550 , status : 400 , message : 'ขาดข้อมูลในบางฟิลด์ในข้อมูลความเสี่ยง'};
            // validate ข้อมูล    
            phase[rcp].data = Number(phase[rcp].data);
            phase[rcp].freq = Number(phase[rcp].freq);
            if(isNaN( phase[rcp].data) ||  phase[rcp].data < 0) throw { code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ไม่ถูกต้อง โปรดตรวจสอบขอบเขตของข้อมูล หรือ ประเภทข้อมูล'};
            if(isNaN( phase[rcp].freq) ||  phase[rcp].freq < 0) throw { code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ไม่ถูกต้อง โปรดตรวจสอบขอบเขตของข้อมูล หรือ ประเภทข้อมูล'};
        }
        return phase;
    }
    const validateUnitUpdateObj = (units)=>{ // เอาไว้เช็คแค่ มี field ที่ต้องการ แก้อยู่ไหม พอ
        for(let i = 0; i < units.length;++i){
            //Check unit ID
            console.log(units[i].uID);
            units[i].uID = units[i].uID ? new mongoose.Types.ObjectId(units[i].uID) :  units[i].uID;
            console.log(units[i].uID);
            if(!units[i].uID || !mongoose.Types.ObjectId.isValid(units[i].uID)) throw {code : 550 , status : 400 , message : 'ID ของ unit ที่ใส่เข้ามาผิดรูปแบบ format'};
            //check ข้อมูลข้างในสองฟิลด์
            if((!units[i].buildingDetail || units[i].buildingDetail.trim() === '') && (!units[i].buildingType || units[i].buildingType.trim() === '')) throw {code : 550 , status : 400 , message : 'ไม่พบข้อมูลของ UNIT ที่ต้องการแก้ไข'};
            // buildingType ต้องเป็นค่าที่มีการถูก/ผิดได้
            if(units[i].buildingType &&( (validator.escape(units[i].buildingType) !== units[i].buildingType) || typeof units[i].buildingType !== 'string') ) throw { code : 550 , status : 400 , message : 'ข้อมูลประเภทอาคารไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถเป็นประเภทอื่นได้นอกจากตัวอักษร'};
            // units[i].buildingDetail = units[i].buildingDetail? customEscape(units[i].buildingDetail) : units[i].buildingDetai;
            if(units[i].buildingDetail) units[i].buildingDetail = customEscape(units[i].buildingDetail);
        }
        return units;
    }

    function customEscape(input) {
    // แทนที่พวกอักขระอันตรายใน comment ยกเว้นพวก '' , "" , / 
    return input.replace(/[<>&;:\\]/g, '');
    }
    function formatThaiDate(date) {
        const thMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        const d = new Date(date);
        const day = d.getDate();
        const month = thMonths[d.getMonth()];
        const year = d.getFullYear() + 543;
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        return `วันที่ ${day} ${month} พ.ศ. ${year} เวลา: ${hours}:${minutes} น.`;
    }

    async function fileExists(bucket, key) {
        try {
            await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
            return true;
        } catch (err) {
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
            throw err; // error อื่น เช่น network หรือ permission ก็โยนออกไป
        }
    }
function getFloodScore(level, freq) { //แต่ละ phase
  const levelScore = level >= 5 ? 3 : level >= 3 ? 2 : 1;
  const freqScore = freq <= 2 ? 3 : freq <= 3 ? 2 : 1;
  return levelScore + freqScore;
}
function getWindScore(speed, freq) {
  const speedScore = speed > 155 ? 3 : speed > 145 ? 2 : 1;
  const freqScore = freq <= 29 ? 3 : freq <= 49 ? 2 : 1;
  return speedScore + freqScore;
}

function getRiskLevel(totalScore) {
  if (totalScore <= 5) return "Low";
  if (totalScore <= 9) return "Medium";
  return "High";
}
function assessRisk( floodLevel, floodFreq, windSpeed, windFreq ) { //แต่ละ rcp เลย 
    // console.log(floodScore , floodFreq , windSpeed , windFreq);
  const floodScore = getFloodScore(floodLevel, floodFreq);
  const windScore = getWindScore(windSpeed, windFreq);
  const totalScore = floodScore + windScore;
  const riskLevel = getRiskLevel(totalScore);
  let obj = {
    floodScore,
    windScore,
    totalScore,
    riskLevel
  }

  return obj;
}





//เหลือจัดการ editProject : เอา edit unit + edit risk มาเพิ่ม