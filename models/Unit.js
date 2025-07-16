const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
    projectID : {
        type : mongoose.Schema.ObjectId , 
        ref : 'Project' , 
        required : [true , 'ยูนิตจำเป็นต้องมีโครงการ']
    },
    totalUnit : {
        type : Number , 
        min : [1 , 'จำนวนยูนิตในโครงการต้องมีขั้นต่ำ 1 ยูนิต'] , 
        required : [true , 'กรุณาระบุจำนวนยูนิตในโครงการ']
    },
    units : {
        type: [
            {
                buildingType : {
                    type : String , 
                    enum :[
                            'อาคารที่อยู่อาศัย', 'ห้องแถว', 'ตึกแถว', 'บ้านแถว', 'บ้านแฝด',
                            'อาคารพาณิชย์', 'อาคารสาธารณะ', 'อาคารพิเศษ', 'อาคารอยู่อาศัยรวม', 'อาคารขนาดใหญ่',
                            'สำนักงาน', 'คลังสินค้า', 'โรงงาน', 'โรงมหรสพ', 'โรงแรม',
                            'ภัตตาคาร'
                        ] , 
                        required : [true , 'กรุณากรอกประเภทอาคาร']
                } , 
                buildingDetail : {
                    type : String , 
                    required : [true , 'กรุณาอธิบายรายละเอียดต่างๆโดยพื้นฐานของอาคารในแต่ละยูนิต']
                }
            }
        ],
        validate : { 
            validator : function(val) {
                return val.length === this.totalUnit;
            },
            message : 'กรุณาใส่ข้อมูลของยูนิตทั้งหมดให้สอดคล้องกับจำนวน unit' ,
        }
    }

});


module.exports = mongoose.model('Unit' , unitSchema);