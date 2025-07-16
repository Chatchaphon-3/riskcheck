const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const districtData = require('../info/district_sub.json');

const userSchema = new mongoose.Schema({
    username : {
        type : String ,
        required : [true , 'กรุณากรอกชื่อผู้ใช้ของท่าน']
    },
    email : {
        type : String ,
        unique :true,
        required : [true , 'กรุณากรอกอีเมลของท่าน'],
         match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบอีเมล'
        ]
    },
    password : {
        type : String , 
        required : [true , 'กรุณากรอกรหัสผ่านของท่าน'],
        minlength : 8,
         match: [/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/, 'รหัสผ่านต้องมีจำนวนอักขระอย่างน้อย 8 ตัวอักขระ , ตัวอักษรภาษาอังกฤษพิมพ์เล็กและพิมพ์ใหญ่อย่างละ1ตัวเป็นอย่างน้อย'],
        select : false
    },
    role : {
        type : String,
        enum : ['user' , 'evaluator' , 'ce' ,'admin'],
        required : [true , 'กรุณาระบุตำแหน่งของบัญชีคุณ']
    },
    district : {
        type : String ,
        validate : {
            validator : function(v){
                if(this.role === 'evaluator'){
                    return !!v;  // แปลงข้อมูล type อื่น แปลงเป็นประเภท boolean   
                }
                return true;
            } , message : 'ผู้ตรวจสอบจำเป็นต้องมีการระบุเขตที่ตนเองรับผิดชอบ'
        },
        enum: {
            values: Object.keys(districtData), // ใช้ key ของ districtData มาทำ enum
            message: 'ไม่มีชื่อเขต {VALUE} ในจังหวัดกรุงเทพมหานคร',
        },
        default : null
    },
    workState : {
        type : Date , 
        default : Date.now(),
    }

},
{
    timestamps :true,
}
);

userSchema.pre('save',async function(next){  //hashing password ก่อน save ลง DB
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password,salt);
});
userSchema.methods.checkPassword = async function (plainPassword){  //funtion check password
    return await bcrypt.compare(plainPassword,this.password);
}
userSchema.methods.jwtToken = function (){  
    return jwt.sign({id : this._id},process.env.JWT_SECRET, {expiresIn :process.env.JWT_EXPIRE});
}

userSchema.index({ district: 1, role: 1, workState: 1 }); //deleteAccount + createProject
userSchema.index({district : 1 , createdAt : 1}); //protect regis

module.exports = mongoose.model('User',userSchema);