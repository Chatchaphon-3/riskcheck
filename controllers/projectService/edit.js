const Project = require('../../models/Project');
const Unit = require('../../models/Unit');
const Risk = require('../../models/Risk');
const User = require('../../models/User')
const { default: mongoose, model } = require('mongoose');
const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize');
const  generateRiskCertificatePDF = require('../../utils/buildCertificate');
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
        
        //ทำได้แต่ของตัวเอง 
        if(project.userID.toString() !== req.user.id && !['admin','evaluator'].includes(req.user.role)) throw {code : 550 , status : 403 , message : 'คุณไม่สามารถแก้ไขข้อมูลโครงการที่คุณไม่ใช่เจ้าของได้'};
        
        //เตรียมค่า 
        let updateObj = {};
        let {projectName , projectStatus , comment} = req.body;

        //Protection-----||
        if(projectName && (validator.escape(projectName) !== projectName)) throw {code : 550 , status : 400 , message : 'ชื่อโครงการไม่สามารถมีอักขระอันตรายได้'};

        if(comment) comment  = customEscape(comment);
        //แบ่งงานตาม Role
        if(req.user.role === 'user'){

            //---------------อยากให้มันเป็นสองแบบคือ ใส่ข้อมูลที่เข้ามาใหม่หรือไม่ก็ถ้าไม่มีข้อมูลใหม่ ก็ assign ค่าเก่าไป--------------------
                updateObj = {
                    projectName : projectName ? projectName : project.projectName, //ถ้าไม่มีค่าใหม่ ก็ใช้ค่าเก่า
                    comment : comment ? comment : project.comment, //ถ้าไม่มีค่าใหม่ ก็ใช้ค่าเก่า
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
        //new update project approach (good for testing but in work field ? i dont know)
        // project.comment = updateObj.comment? updateObj.comment : project.comment;
        // project.projectName = updateObj.projectName? updateObj.projectName : project.projectName;
        // project.projectStatus = updateObj.projectStatus? updateObj.projectStatus : project.projectStatus;
        Object.assign(project , updateObj);

        await project.save({session}); // validateBeforeSave = false เพราะว่าเราได้ validate เองแล้วในข้างบน
        // project = project; // just for testing 
        // project = await Project.findByIdAndUpdate(req.params.id ,updateObj, {
        //     new : true ,
        //     runValidators : true,
        //     session ,
        // });
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
        //    console.log("REACHED UNIT FIND ONE");
           if(!unitData) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลยูนิตในโครงการนี้'};
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
            // console.log('working');
            let riskData = await Risk.findOne({projectID : req.params.id}).session(session);
            if(!riskData) throw {code : 550 , status : 404 , message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'};
            if(floodRisk){
                if(!floodRisk.phaseOne || !floodRisk.phaseTwo) throw { code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ในความเสี่ยงทางน้ำไม่ครบ'};
                riskData.floodRisk.phaseOne = validateObj(floodRisk.phaseOne);
                riskData.floodRisk.phaseTwo = validateObj(floodRisk.phaseTwo);
            }
            if(windRisk){
                if(!windRisk.phaseOne || !windRisk.phaseTwo) throw { code : 550 , status : 400 , message : 'ข้อมูลบางฟิลด์ในความเสี่ยงทางลมไม่ครบ'};
                riskData.windRisk.phaseOne = validateObj(windRisk.phaseOne) ;
                riskData.windRisk.phaseTwo = validateObj(windRisk.phaseTwo) ;
            }
            if(modelRef){
                if(typeof modelRef !== 'string' || validator.escape(modelRef) !== modelRef || modelRef.trim() === '') throw {code : 550 , status : 400 , message : 'ข้อมูลโมเดลไม่สามารถมีอักขระพิเศษได้ หรือ ประเภทข้อมูลไม่ถูกต้อง หรือ ไม่พบข้อมูลที่ส่งเข้ามา'};
                riskData.modelRef = modelRef;
            }
            await riskData.save({session});
            updatedRisk = riskData;
        }
        //end of editing riskData
        
        //if eva evaluate project -> Completed , its will automatically created Certificate...
        if(project.projectStatus === 'Completed' && req.user.role === 'evaluator'){
            // console.log('making certificated...');
            let unit = await Unit.findOne({projectID : project.id});
            let risk = await Risk.findOne({projectID : project.id});  
            let eva = await User.findById(req.user.id).session(session);
            await generateRiskCertificatePDF(project , unit , risk , eva);
            console.log('done');
        }


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
    const validateUnitUpdateObj = (units)=>{ // เอาไว้เช็คแค่ มี field ที่ต้องการ แก้อยู่ไหม พอ
        for(let i = 0; i < units.length;++i){
            //Check unit ID
            // console.log(units[i].uID);
            units[i].uID = units[i].uID ? new mongoose.Types.ObjectId(units[i].uID) :  units[i].uID;
            // console.log(units[i].uID);
            if(!units[i].uID || !mongoose.Types.ObjectId.isValid(units[i].uID)) throw {code : 550 , status : 400 , message : 'ID ของ unit ที่ใส่เข้ามาผิดรูปแบบ format'};
            //check ข้อมูลข้างในสองฟิลด์
            if((!units[i].buildingDetail|| typeof units[i].buildingDetail !== 'string' || units[i].buildingDetail.trim() === '') && (!units[i].buildingType || typeof units[i].buildingType !== 'string' || units[i].buildingType.trim() === '')) throw {code : 550 , status : 400 , message : 'ไม่พบข้อมูลของ UNIT ที่ต้องการแก้ไข หรือ ประเภทข้อมูลไม่ถูกต้อง'};
            // buildingType ต้องเป็นค่าที่มีการถูก/ผิดได้
            if(units[i].buildingType &&( typeof units[i].buildingType !== 'string' ||validator.escape(units[i].buildingType) !== units[i].buildingType) ) throw { code : 550 , status : 400 , message : 'ข้อมูลประเภทอาคารไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถเป็นประเภทอื่นได้นอกจากตัวอักษร'};
            // units[i].buildingDetail = units[i].buildingDetail? customEscape(units[i].buildingDetail) : units[i].buildingDetai;
            if(units[i].buildingDetail && typeof units[i].buildingDetail === 'string' ) units[i].buildingDetail = customEscape(units[i].buildingDetail);
        }
        return units;
    }

    function customEscape(input) {
    // แทนที่พวกอักขระอันตรายใน comment ยกเว้นพวก '' , "" , / 
    return input.replace(/[<>&;:\\]/g, '');
    }