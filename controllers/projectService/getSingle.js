const Project = require('../../models/Project');
const Unit = require('../../models/Unit');
const Risk = require('../../models/Risk');
const User = require('../../models/User');
const {GetObjectCommand } = require('@aws-sdk/client-s3');
const {s3, s3Public } = require('../../middleware/uploadConfig');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { default: mongoose, model } = require('mongoose');
//Get Single Project 
// path : GET /api/v1/project/:id
exports.getProject = async(req,res,next)=>{
    // let phase1_rcp2_6;
        let flood_rcp2_6 ,wind_rcp2_6 , flood_rcp4_5 ,wind_rcp4_5 ,flood_rcp6_0 , wind_rcp6_0 ;
        let obj = null; // คำตอบของสูตรจะอยู่ในนี้ 
        try{
        if(!mongoose.Types.ObjectId.isValid(req.params.id)) throw {code :550  , status :400 , message : 'รูปแบบ id ที่ส่งเข้ามาผิด Format'};
        let project = await Project.findById(req.params.id);
        if(!project) throw {code : 550  , status : 404 , message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ'};
        //user ดูของคนอื่น
        if(req.user.role === 'user' && project.userID.toString() !== req.user.id) throw {code : 550 , status : 403 , message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณเป็นเจ้าของเท่านั้น'};
        
        if((req.user.role === 'evaluator' && project.district !== req.user.district )) throw {code : 550 , status : 403, message : 'คุณสามารถดูเฉพาะข้อมูลของโครงการที่อยู่ในเขตที่คุณรับผิดชอบได้เท่านั้น'};

        if(req.user.role === 'evaluator' && project.evaluatorID.toString() !== req.user.id) throw {code : 550 , status : 403, message : 'คุณสามารถดูได้เฉพาะข้อมูลโครงการที่คุณรับผิดชอบได้เท่านั้น'};

        let unit = await Unit.findOne({projectID : req.params.id});
        let risk = await Risk.findOne({projectID : req.params.id});

        if(project.document.length > 0){   //ทำ signedURL ของไฟล์ล่าสุดเท่านั้น
            const fileKey = project.document[project.document.length-1].docFile.split('/').pop();  //ดึงชื่อไฟล์ออกจาก array ล่าสุด 
            // const user = await User.findOne({_id : project.userID});
            const newFileKey = `${project.district}/${fileKey}`;
            // console.log( 'filename : ', newFileKey);
            const command = new GetObjectCommand({
                Bucket : 'bucket1',
                Key : newFileKey,
                ResponseContentDisposition: 'attachment',   //ใส่ไปแล้วคลิ้กURL และมันดาว์นโหลดเลย 
            });
            if(['evaluator' , 'ce'].includes(req.user.role)){
                obj = makeScore(risk);
            }

            const signedUrl =  await getSignedUrl(s3Public , command , {expiresIn : 3600});   //Valid for 1 hour
            // console.log(certificate); // undefined ?
            if(obj === null) {
                return res.status(200).json({success : true , data : project ,unitData : unit  ,riskData : risk , downloadFile : signedUrl});    
            }
            // else{
                return res.status(200).json({success : true , data : project ,unitData : unit  ,riskScore : obj,
            riskData : risk ,
             downloadFile : signedUrl});
            // }
        }

        // console.log(certificate); // undefined ?
        if(['evaluator' , 'ce'].includes(req.user.role)){
               // สร้างคำตอบ
                obj = makeScore(risk);
            }
        if(obj!== null ){
            return res.status(200).json({success :true , data : project , unitData : unit, riskData : risk , riskScore : obj});
        }
        // else{
            return res.status(200).json({success :true , data : project , unitData : unit, riskData : risk});
        // }


    }catch(err){
        console.error(err.message); 
        if(err.code === 550 || err.code === 550) return res.status(err.status).json({success : false , message : err.message});
        return res.status(500).json({ success: false, message: 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์' , errors : err });
    }
};


//helping function (UPDATED)
function getFloodDamageScore(depth) { //ลึกเมตร 
  if (depth < 0.25) return 0.0;      // ไม่เสียหาย
  if (depth < 0.5) return 0.5;       // เสียหายน้อย
  if (depth < 1.0) return 1.0;       // เสียหายระดับกลาง
  if (depth < 1.5) return 1.5;       // เสียหายสูง
  return 2.0;                        // เกือบทั้งหมด/สูญเสียหนัก
}
function calculateFloodRiskLevel(depth1, freq1, depth2, freq2) {
  const alpha = 0.4;  // ถ่วงน้ำหนักช่วง Now–2050
  const beta  = 0.6;  // ถ่วงน้ำหนักช่วง 2051–2100
  const gamma = 0.5;  // น้ำหนักความถี่ (frequency)

  const damage1 = getFloodDamageScore(depth1);
  const damage2 = getFloodDamageScore(depth2);

  const riskScore = alpha * damage1 + beta * damage2 + gamma * ((1 / freq1) + (1 / freq2));

  if (riskScore < 0.75) return "ต่ำ";
  else if (riskScore < 1.25) return "ปานกลาง";
  else if(riskScore < 1.8) return "สูง"
  else return "ไม่ถูกต้อง";
}

// ----------------------------------
function getDamageScoreFromWindSpeed(speed) {               //B
  if (speed >= 178) return 2.0;        // Category 3–5   ความเร็วลม กม/ชม
  if (speed >= 154) return 1.5;        // Category 2
  if (speed >= 119) return 1.0;        // Category 1
  if (speed >= 80)  return 0.5;        // Strong storm
  return 0.0;                           // Below storm threshold
}

function calculateWindRiskLevel(speed1, freq1, speed2, freq2) {         //C ใช้ B ข้างใน 
  // น้ำหนักของแต่ละช่วงเวลา และผลจากความถี่
  const alpha = 0.4;   // Now–2050
  const beta = 0.6;    // 2051–2100
  const gamma = 0.5;   // ความถี่

  const damage1 = getDamageScoreFromWindSpeed(speed1);
  const damage2 = getDamageScoreFromWindSpeed(speed2);

  // คำนวณคะแนนรวม
  const riskScore = alpha * damage1 + beta * damage2 + gamma * ((1 / freq1) + (1 / freq2));

  // ตีความระดับความเสี่ยง
  if (riskScore < 0.75) return "ต่ำ";
  else if (riskScore < 1.25) return "ปานกลาง";
  else if(riskScore < 2.5) return "สูง";
  else return "ไม่ถูกต้อง";
}

function makeScore(risk){
    let flood_rcp2_6 = calculateFloodRiskLevel(risk.floodRisk.phaseOne.rcp2_6.data , risk.floodRisk.phaseOne.rcp2_6.freq , risk.floodRisk.phaseTwo.rcp2_6.data , risk.floodRisk.phaseTwo.rcp2_6.freq);
    let wind_rcp2_6 = calculateWindRiskLevel(risk.windRisk.phaseOne.rcp2_6.data , risk.windRisk.phaseOne.rcp2_6.freq , risk.windRisk.phaseTwo.rcp2_6.data , risk.windRisk.phaseTwo.rcp2_6.freq );
    let flood_rcp4_5 = calculateFloodRiskLevel(risk.floodRisk.phaseOne.rcp4_5.data , risk.floodRisk.phaseOne.rcp4_5.freq , risk.floodRisk.phaseTwo.rcp4_5.data , risk.floodRisk.phaseTwo.rcp4_5.freq);
    let wind_rcp4_5 = calculateWindRiskLevel(risk.windRisk.phaseOne.rcp4_5.data , risk.windRisk.phaseOne.rcp4_5.freq , risk.windRisk.phaseTwo.rcp4_5.data , risk.windRisk.phaseTwo.rcp4_5.freq );
    let flood_rcp6_0 = calculateFloodRiskLevel(risk.floodRisk.phaseOne.rcp6_0.data , risk.floodRisk.phaseOne.rcp6_0.freq , risk.floodRisk.phaseTwo.rcp6_0.data , risk.floodRisk.phaseTwo.rcp6_0.freq);
    let wind_rcp6_0 = calculateWindRiskLevel(risk.windRisk.phaseOne.rcp6_0.data , risk.windRisk.phaseOne.rcp6_0.freq , risk.windRisk.phaseTwo.rcp6_0.data , risk.windRisk.phaseTwo.rcp6_0.freq );
    let obj = {
        rcp2_6 : {
            floodScore : flood_rcp2_6,
            windScore :  wind_rcp2_6
            },
        rcp4_5 : {
            floodScore : flood_rcp4_5 , 
            windScore : wind_rcp4_5
            },
        rcp6_0 : {
            floodScore : flood_rcp6_0 , 
            windScore : wind_rcp6_0
                }
    }
    return obj;
}