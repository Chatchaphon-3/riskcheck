// const Project = require('../models/Project');
const Project = require('../../models/Project');
const Unit = require('../../models/Unit');
const Risk = require('../../models/Risk');
const User = require('../../models/User');
const genNum = require('../../utils/generateNumber');
const { default: mongoose, model } = require('mongoose');
const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize');
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

        //LOGIC แจกจ่ายงาน : หา eva ในเขตเดียวกันที่ได้รับงานเก่าสุด 
        let eva = await User.findOne({district : targetDistrict , role : 'evaluator'}).sort({workState : 1}).session(session);
        // console.log(eva);
        if(!eva) throw {code : 550 , status : 404 , message : 'เกิดข้อผิดพลาด ไม่พบผู้ตรวจสอบในเขตดังกล่าวขออภัยในความไม่สะดวก'};
        let targetID = eva.id;
        // O(log(n)) on average case


        const project = await Project.create([{
            userID ,
            evaluatorID : targetID,  
            projectName ,
            projectNum, 
            district,
            subDistrict,
            latitude,
            longtitude,
            projectStatus : 'รอผู้ตรวจสอบ', //ไม่จำเป็น 
            comment : null ,
            document : []
        }], {session});
        await User.findByIdAndUpdate(targetID , {workState : new Date()} , {session});
        // eva.workState = new Date();
        // await eva.save({session});
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
        floodRisk.phaseOne = validateObj(floodRisk.phaseOne);
        floodRisk.phaseTwo = validateObj(floodRisk.phaseTwo);
        //validate windRisk
        if(!windRisk || !windRisk.phaseOne || !windRisk.phaseTwo) throw {code : 550 , status : 400 , message : 'ข้อมูลความเสี่ยงทางด้านลมไม่สมบูรณ์ หรือ ข้อมูลบางฟิลด์ขาดหายไป'};
        windRisk.phaseOne = validateObj(windRisk.phaseOne);
        windRisk.phaseTwo = validateObj(windRisk.phaseTwo);
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
        else if(error.code === 550) return res.status(error.status).json({success : false , message : error.message});
        else return res.status(500).json({success : false , message : 'เกิดข้อผิดพลาดทางฝั่งเซิร์ฟเวอร์'});
    }finally{
        session.endSession();
    }
};

//helping function 
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