const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema({
    projectID : {
        type : mongoose.Schema.ObjectId ,
        ref : 'Project' , 
        required : [true , 'ข้อมูลความเสี่ยงจำเป็นต้องมี ID ของโครงการ']
    },
    floodRisk : {
        phaseOne : {
            rcp2_6 : {
                data : {
                    type : Number , 
                    required : true , 
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true , 
                    min : 0
                }
            } ,
            rcp4_5 : {
                data : {
                    type : Number , 
                    required : true , 
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true ,
                     min : 0
                }
            },
            rcp6_0 : {
                data : {
                    type : Number , 
                    required : true , 
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true , 
                    min : 0
                }
            }
        },
        phaseTwo : {
            rcp2_6 : {
                data : {
                    type : Number , 
                    required : true , 
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true , 
                    min : 0
                }
            } ,
            rcp4_5 : {
                data : {
                    type : Number , 
                    required : true , 
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true , 
                    min : 0
                }
            },
            rcp6_0 : {
                data : {
                    type : Number , 
                    required : true, 
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            }
        }
    },
    windRisk :{
         phaseOne : {
            rcp2_6 : {
                data : {
                    type : Number , 
                    required : true,
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            } ,
            rcp4_5 : {
                data : {
                    type : Number , 
                    required : true,
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            },
            rcp6_0 : {
                data : {
                    type : Number , 
                    required : true,
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            }
        },
        phaseTwo : {
            rcp2_6 : {
                data : {
                    type : Number , 
                    required : true,
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            } ,
            rcp4_5 : {
                data : {
                    type : Number , 
                    required : true,
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            },
            rcp6_0 : {
                data : {
                    type : Number , 
                    required : true,
                    min : 0
                },
                freq : {
                    type : Number , 
                    required : true,
                    min : 0
                }
            }
        }
    },
    modelRef : {
        type : String , 
        required : true
    }
    
},{
    timestamps : true,
});

module.exports = mongoose.model('Risk', riskSchema);
