const mongoose = require('mongoose');
const districtData = require('../info/district_sub.json');
const {genNum} = require('../utils/generateNumber');
const projectSchema = new mongoose.Schema({
    
    userID : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' , 
        required : [true , 'โครงการจำเป็นต้องมีเจ้าของโครงการ']
    },
    evaluatorID : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : false
    },
    projectName : {
        type : String ,
        required : [true , 'ได้โปรดกรอกชื่อโครงการ']
    },
    projectNum : {  // จะใช้ระบบเรารันเลขเองหรือว่าจะต้องเพิ่งจากภายนอก 
        type : Number , 
        unique : true ,
        required : false
    },
    district: {
        type: String,
        enum: {
            values: Object.keys(districtData), // ใช้ key ของ districtData มาทำ enum
            message: 'ไม่มีชื่อเขต {VALUE} ในจังหวัดกรุงเทพมหานคร',
        },
        required: [true, 'จำเป็นต้องกรอกเขตที่อยู่ของโครงการ'],
    },
    subDistrict: {
        type: String,
        required: [true, 'ได้โปรดกรอกข้อมูลแขวงของโครงการ'],
        validate: {
            validator: function (value) {
                const validDistricts = districtData[this.district]; // ดึง array ของแขวงในเขตนั้น
                return validDistricts && validDistricts.includes(value); // ตรวจสอบว่ามีแขวงนี้ในเขตหรือไม่
            },
            message: 'ไม่มีแขวง {VALUE} ในเขตที่เลือกไว้',
        },
    },
    latitude : {
        type : Number , 
        validate : {
            validator : function (value){
                return value >= -90 && value <= 90;
            },
            message : 'ได้โปรดกรอกค่าละติจูดให้ถูกต้องตามขอบเขตของค่า',
        },
        required : [true , 'ได้โปรดกรอกค่าละติจูด']
    },
    longtitude : {
        type : Number , 
        validate : {
            validator : function(value){
                return ((value >= -180) && (value <= 180))
            },
            message : 'ได้โปรดกรอกค่าลองจิจูดให้ถูกต้องตามขอบเขตของค่า'
        },
        required : [true , 'ได้โปรดกรอกค่าลองจิจูด']
    },
    projectStatus : {
        type : String , 
        enum : ['Completed' , 'รอเจ้าของโครงการ' , 'รอผู้ตรวจสอบ'],
        default : 'รอผู้ตรวจสอบ',
        required : false
    },
    comment : {
        type : String , 
        default : null , 
        required : false
    },
    document : {
        type : [
            {
                docFile : {
                    type : String , 
                    default : null ,
                    required : false
                },
                docType : {
                    type : String ,
                    default : null,
                    required : false
                }
            }
        ]
    }
    // requireDoc : {
    //     type : String , 
    //     default : null,
    //     required : false 
    // },
    // Doctype : {
    //     type : String , 
    //     default : null , 
    //     required : false
    // }

},{
    timestamps : true,
});


projectSchema.pre('save', async function (next) { // ปัดเศษก่อนบันทึก 
    // if(this.isNew && !this.projectNum){   //ทำงานเฉพาะตอนที่ ยังไม่เคยมี projectNum
    //     this.projectNum = await genNum();
    // }
    this.latitude = parseFloat(this.latitude.toFixed(2));
    this.longtitude = parseFloat(this.longtitude.toFixed(2));    
    next();
});



projectSchema.index({latitude : 1 , longtitude : 1 } , {unique : true });   //สร้าง Compound Index สำหรับการเช็ค Duplicate lat long 
projectSchema.index({ evaluatorID: 1}); // deleteEva
projectSchema.index({district : 1, createdAt : -1}); // protectRegis

module.exports = mongoose.model('Project' , projectSchema);