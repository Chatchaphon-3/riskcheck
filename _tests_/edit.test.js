const Project = require('../models/Project');
const Unit = require('../models/Unit');
const Risk = require('../models/Risk');
const User = require('../models/User');
const { editProject } = require('../controllers/projectService/edit');
const { default: mongoose } = require('mongoose');
const  generateRiskCertificatePDF = require('../utils/buildCertificate');
//Setting mocks
jest.mock('../models/Project');
jest.mock('../models/Unit');
jest.mock('../models/Risk');
jest.mock('../models/User');
jest.mock('../utils/buildCertificate');


describe('Edit project Unit testing set' , ()=>{
    let req , res;
    let projectid = new mongoose.Types.ObjectId();
    let userid = new mongoose.Types.ObjectId();
    let evaluatorid = new mongoose.Types.ObjectId();
    const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
    };
    let mockProject;

    let fakeUnit = {
        _id: new mongoose.Types.ObjectId(),
        buildingType: 'ห้องแถว',
        buildingDetail: 'รายละเอียดห้องแถว'
    };
    let mockUnit ;
    let mockRisk ;


    beforeEach(()=>{
        jest.clearAllMocks();
         mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
         mockProject = {
        _id : projectid , 
        userID : userid , 
        evaluatorID : evaluatorid , 
        projectName : 'default name' , 
        projectNum : 123456 , 
        district : 'บางพลัด' ,
        subDistrict : 'บางอ้อ' , 
        latitude : 10.11 , 
        longtitude : 10.12 , 
        projectStatus : 'รอเจ้าของโครงการ' , 
        comment : null , 
        document : [] , 
        createdAt : new Date() , 
        updatedAt : new Date()
    };
    mockUnit = {
        _id : new mongoose.Types.ObjectId() , 
        projectID : projectid , 
        totalUnit : 1 , 
        units : {
            id: jest.fn().mockImplementation((uid) => {
            // เทียบ _id ที่ mock ให้ return unit ปลอม
            // return uid.toString() === fakeUnit._id.toString() ? fakeUnit : null;
            return fakeUnit;
            })
        }
        // save : jest.fn().mockResolvedValue(mockUnitUpdated)
    };
    mockRisk = {
        _id : new mongoose.Types.ObjectId() , 
        projectID : projectid ,
        floodRisk: {
            phaseOne: {
                rcp2_6: { data: 1, freq: 1 },
                rcp4_5: { data: 1, freq: 1 },
                rcp6_0: { data: 1, freq: 1 }
            },
            phaseTwo: {
                rcp2_6: { data: 1, freq: 1 },
                rcp4_5: { data: 1, freq: 1 },
                rcp6_0: { data: 1, freq: 1 }
            }
        },
        windRisk: {
            phaseOne: {
                rcp2_6: { data: 1, freq: 1 },
                rcp4_5: { data: 1, freq: 1 },
                rcp6_0: { data: 1, freq: 1 }
            },
            phaseTwo: {
                rcp2_6: { data: 1, freq: 1 },
                rcp4_5: { data: 1, freq: 1 },
                rcp6_0: { data: 1, freq: 1 }
            }
        },
        modelRef: 'model A' 
        // save : jest.fn().mockResolvedValue(mockRiskUpdated)

    };
    mockUnit.save = jest.fn();
    mockRisk.save = jest.fn();
    mockProject.save = jest.fn();
        req = {
            user : {
                id : userid.toString() , 
                role : 'user' ,
                district : 'บางพลัด' , 
            } , 
            params : {
                id : mockProject._id.toString()
            } ,
            body : {
                //empty ไว้ก่อน เดี๋ยวต้องใช้ในแต่ละ test 
            }
        };
        res = {
            status : jest.fn().mockReturnThis() , 
            json : jest.fn()
        }
        Project.findById.mockReturnValue({
        session: () => mockProject
        });
        Project.findByIdAndUpdate.mockReturnValue({
            session: () => mockProject2
        });
        Unit.findOne.mockReturnValue({
            session: () => mockUnit
        });
        Risk.findOne.mockReturnValue({
            session: () => mockRisk
        });
        User.findById.mockReturnValue({
            session: () => {}
        });
    });
    test('TC1 : user casually edit project but not passing anything in body : 200' , async ()=>{
        // mockProject = undefined;
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success : true , 
            message : 'แก้ไขข้อมูลโครงการสำเร็จ' , 
            data : expect.any(Object) , 
            unit : undefined , 
            risk : undefined
        })
    });
    test('TC2 : user casually edit project FULL EDIT : 200' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 9, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            message : 'แก้ไขข้อมูลโครงการสำเร็จ' , 
            data : expect.objectContaining({
                projectName : 'อีกแล้วโว้ย2',
                comment : 'ฮาโหล2'
            }),  
            unit : expect.objectContaining({
                projectID: projectid , 
                totalUnit : 1
                // เช็คเฉพาะ field ที่มึงสนใจ
            }),
            risk : expect.objectContaining({
                projectID: projectid , 
                modelRef : "7"
                // เช็คเฉพาะ field ที่มึงสนใจ
            }),
        }))
    });
    test('TC3 : eva try to edit another eva work : 403' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "projectStatus" : 'Completed',
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 9, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        req.user.role = 'evaluator';
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'คุณไม่สามารถตรวจสอบโครงการที่ไม่อยู่ในความรับผิดชอบของคุณได้'
        })
    });
    test('TC4 : eva o edit their work : 403' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "projectStatus" : 'Completed',
            "comment" : "ผ่านแล้วครับ",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 9, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        req.user.role = 'evaluator';
        req.user.id = evaluatorid.toString();
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success : true , 
            message : 'ตรวจสอบข้อมูลโครงการสำเร็จ' , 
            data : expect.objectContaining({
                projectStatus : 'Completed' ,
                comment : 'ผ่านแล้วครับ'
            }) , 
            unit : undefined , 
            risk : undefined
        })

    });
    test('TC5 : admin casually edit project FULL EDIT : 200' , async ()=>{
        // mockProject.projectStatus = 'รอเจ้าของโครงการ';
        req.user.role = 'admin';
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 9, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            message : 'แก้ไขข้อมูลโครงการสำเร็จ' 
        }))
    });
    test('TC6 : Internal Server crashed', async () => {
            Project.findById.mockImplementation(()=>{
                throw {name : 'whtnError'};
            });
            await editProject(req,res);
            expect(res.status).toHaveBeenCalledWith(500);
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         success : false , 
            //         message : 'แก้ไขข้อมูลโครงการไม่สำเร็จ'
            //     })
            // );
        });
    test('TC7 : validation error', async () => {
            Project.findById.mockImplementation(()=>{
                throw {
                        name: 'ValidationError',
                        errors: {
                            projectName: {
                            properties: {
                                path: 'projectName',
                                message: 'Project name is required.'
                            }
                            },
                            comment: {
                            properties: {
                                path: 'comment',
                                message: 'Comment must not contain special characters.'
                            }
                            },
                            projectStatus: {
                            properties: {
                                path: 'projectStatus',
                                message: 'Invalid project status.'
                            }
                            }
                        }
                        };
            });
            await editProject(req,res);
            expect(res.status).toHaveBeenCalledWith(500);
            // expect(res.json).toHaveBeenCalledWith(
            //     expect.objectContaining({
            //         success : false , 
            //         message : 'แก้ไขข้อมูลโครงการไม่สำเร็จ'
            //     })
            // );
    });
    test('TC8 : invalid id format' , async ()=>{
        // mockProject = undefined;
        req.params.id = null;
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ID ที่ส่งเข้ามาใน params ไม่ถูกต้องตาม Format' 
        })
    });
    test('TC9 : project not found' , async ()=>{
        Project.findById.mockReturnValue({
        session: () => undefined
        });
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่พบข้อมูลโครงการดังกล่าวในระบบ' 
        })
    });
    test('TC10 : try to edit a completed project' , async ()=>{
        mockProject.projectStatus = 'Completed';
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'โครงการนี้ผ่านการตรวจสอบแล้ว ไม่สามารถแก้ไขข้อมูลได้' 
        })
    });
    test('TC11 : try to edit other user\'s project' , async ()=>{
        // mockProject.projectStatus = 'รอผู้ตรวจสอบ';
        req.user.id = new mongoose.Types.ObjectId().toString();
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'คุณไม่สามารถแก้ไขข้อมูลโครงการที่คุณไม่ใช่เจ้าของได้' 
        })
    });
    test('TC12 : scripting projectname' , async ()=>{
        req.body.projectName = '<script>malicious text</script>'
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ชื่อโครงการไม่สามารถมีอักขระอันตรายได้' 
        })
    });
    test('TC13 : evaluator enter invalid status' , async ()=>{
        req.user.role = 'evaluator';
        req.user.id = evaluatorid.toString();
        req.body = {
            projectStatus : 'invalidStatus'
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'กรุณากรอกสถานะโครงการให้ถูกต้อง' 
        })
    });
    test('TC14 : evaluator try to edit project that out of scope' , async ()=>{
        req.user.role = 'evaluator';
        req.user.district = 'one'
        req.user.id = evaluatorid.toString();
        mockProject.district = 'two'
         req.body = {
            projectStatus : 'Completed'
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'คุณสามารถตรวสอบโครงการได้เฉพาะโครงการที่อยู่ในเขตเดียวกับคุณเท่านั้น' 
        })
    });
    test('TC15 : invalid unit body' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : {age : 10},
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 9, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : false , 
            message : 'โครงสร้างข้อมูลขอบงยูนิตต้องเป็น อาร์เรย์' 
        }))
    });
    test('TC16 : unit not found' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 9, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        Unit.findOne.mockReturnValue({
            session: () => undefined
        });
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : false , 
            message : 'ไม่พบข้อมูลยูนิตในโครงการนี้' 
        }))
    });
    test('TC17 : each unit not found' , async ()=>{
        req.body = {
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ]
        }
        mockUnit = {
        _id : new mongoose.Types.ObjectId() , 
        projectID : projectid , 
        totalUnit : 1 , 
        units : {
            id: jest.fn().mockImplementation((uid) => {
            // เทียบ _id ที่ mock ให้ return unit ปลอม
            // return uid.toString() === fakeUnit._id.toString() ? fakeUnit : null;
            return undefined;
            })
        }};

        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่เจอข้อมูลยูนิตนี้'
        })
        
    });
    test('TC18 : each unit  found' , async ()=>{
        req.body = {
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ]
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true ,
            risk : undefined  , 
            unit : expect.any(Object) , 
            data : expect.any(Object) 
        }))
        
    });
    test('TC19 : riskData not found' , async ()=>{
        req.body = {
                "windRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },"floodRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 9, "freq": 9 },
                        "rcp4_5": { "data": 2, "freq": 4 },
                        "rcp6_0": { "data": 3, "freq": 3 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 3, "freq": 4 },
                        "rcp4_5": { "data": 4, "freq":3 },
                        "rcp6_0": { "data": 5, "freq": 2 }
                    }
            },
            "modelRef" : "7"
        
        }
        Risk.findOne.mockReturnValue({
            session: () => undefined
        });
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success : false ,
            message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'
        })
        
    });
    test('TC20 : invalid field in riskdata' , async ()=>{
        req.body = {
                "windRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },"floodRisk": {
                    "phaseOnet": {
                        "rcp2_6": { "data": 9, "freq": 9 },
                        "rcp4_5": { "data": 2, "freq": 4 },
                        "rcp6_0": { "data": 3, "freq": 3 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 3, "freq": 4 },
                        "rcp4_5": { "data": 4, "freq":3 },
                        "rcp6_0": { "data": 5, "freq": 2 }
                    }
            },
            "modelRef" : "7"
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false ,
        //     message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'
        // })
        
    });
    test('TC21 : invalid field in riskdata' , async ()=>{
        req.body = {
                "windRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },"floodRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 9, "freq": 9 },
                        "rcp4_5": { "data": 2, "freq": 4 },
                        "rcp6_0": { "data": 3, "freq": 3 }
                    },
                    "phaseTwoe": {
                        "rcp2_6": { "data": 3, "freq": 4 },
                        "rcp4_5": { "data": 4, "freq":3 },
                        "rcp6_0": { "data": 5, "freq": 2 }
                    }
            },
            "modelRef" : "7"
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false ,
        //     message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'
        // })
        
    });
    test('TC22 : invalid field in riskdata' , async ()=>{
        req.body = {
                "windRisk": {
                    "phaseOnet": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },"floodRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 9, "freq": 9 },
                        "rcp4_5": { "data": 2, "freq": 4 },
                        "rcp6_0": { "data": 3, "freq": 3 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 3, "freq": 4 },
                        "rcp4_5": { "data": 4, "freq":3 },
                        "rcp6_0": { "data": 5, "freq": 2 }
                    }
            },
            "modelRef" : "7"
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false ,
        //     message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'
        // })
        
    });
    test('TC23 : invalid field in riskdata' , async ()=>{
        req.body = {
                "windRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwoe": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },"floodRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 9, "freq": 9 },
                        "rcp4_5": { "data": 2, "freq": 4 },
                        "rcp6_0": { "data": 3, "freq": 3 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 3, "freq": 4 },
                        "rcp4_5": { "data": 4, "freq":3 },
                        "rcp6_0": { "data": 5, "freq": 2 }
                    }
            },
            "modelRef" : "7"
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false ,
        //     message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'
        // })
        
    });
    test('TC24 : invalid field in riskdata' , async ()=>{
        req.body = {
                "windRiskk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },
            "modelRef" : "7"
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false ,
        //     message : 'ไม่พบข้อมูลความเสี่ยงในระบบนี้ หรือ ไม่สามารถแก้ไขข้อมูลความเสี่ยงได้'
        // })
        
    });
    test('TC25 : invalid field in unit data' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 1, "freq": -9 },
                    "rcp4_5": { "data": 2, "freq": -4 },
                    "rcp6_0": { "data": 3, "freq": -3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC26 : invalid field in unit data' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": "word", "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC27 : invalid field in unit data' , async ()=>{
        req.body = {   //full edit 
            "projectName" : "อีกแล้วโว้ย2" ,
            "comment" : "ฮาโหล2",
            "units" : [
                {"uID" : undefined , "buildingType" : "อาคารพาณิชย์" , "buildingDetail" : "ก็ไม่มีอะไรมาก2"}
            ],
            "windRisk": {
                "phaseOne": {
                    "rcp2_6": { "data": 142, "freq": 50 },
                    "rcp4_5": { "data": 150, "freq": 40 },
                    "rcp6_0": { "data": 160, "freq": 30 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 150, "freq": 40 },
                    "rcp4_5": { "data": 162, "freq": 30 },
                    "rcp6_0": { "data": 170, "freq": 20 }
                }
        },"floodRisk": {
                "phaseOne": {
                    "rcp2_6": { "data":  1, "freq": 9 },
                    "rcp4_5": { "data": 2, "freq": 4 },
                    "rcp6_0": { "data": 3, "freq": 3 }
                },
                "phaseTwo": {
                    "rcp2_6": { "data": 3, "freq": 4 },
                    "rcp4_5": { "data": 4, "freq":3 },
                    "rcp6_0": { "data": 5, "freq": 2 }
                }
        },
        "modelRef" : "7"
        }
        // unitData.save.mockReturnValue(mockUnit);
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC28 : sripting modelRef' , async ()=>{
        req.body = {
            "modelRef" : "<script>malicious word</script?>"
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลโมเดลไม่สามารถมีอักขระพิเศษได้ หรือ ประเภทข้อมูลไม่ถูกต้อง หรือ ไม่พบข้อมูลที่ส่งเข้ามา'
        })
    })
    test('TC29 : modelRef isnt string' , async ()=>{
        req.body = {
            "modelRef" : 12
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลโมเดลไม่สามารถมีอักขระพิเศษได้ หรือ ประเภทข้อมูลไม่ถูกต้อง หรือ ไม่พบข้อมูลที่ส่งเข้ามา'
        })
    });
    test('TC30 : invalid field in riskdata' , async ()=>{
        req.body = {
                "floodRisk": {
                    "phaseOne": {
                        "rcp2_7": { "data": 9, "freq": 9 },
                        "rcp4_5": { "data": 2, "freq": 4 },
                        "rcp6_0": { "data": 3, "freq": 3 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },
            "modelRef" : undefined
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC31 : not passing buildingType and buildingDetail' , async ()=>{
        req.body = {
                "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : undefined , "buildingDetail" : undefined}
            ]
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ไม่พบข้อมูลของ UNIT ที่ต้องการแก้ไข หรือ ประเภทข้อมูลไม่ถูกต้อง'
        })
    });
    test('TC32 : buildingType is not string' , async ()=>{
        req.body = {
                "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : 10 , "buildingDetail" : 'hellp'}
            ]
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'ข้อมูลประเภทอาคารไม่สามารถมีอักขระพิเศษ หรือ ไม่สามารถเป็นประเภทอื่นได้นอกจากตัวอักษร'
        })
    });
    test('TC33 : buildingDetail is not string' , async ()=>{
        req.body = {
                "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : '10' , "buildingDetail" : 122}
            ]
        
        }
        await editProject(req,res)
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC34 : unit passing some field' , async ()=>{
        req.body = {
                "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingType" : '10'}
            ]
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);

    });
    test('TC35 : unit passing some field' , async ()=>{
        req.body = {
                "units" : [
                {"uID" : "6863469edbcc7d1a998e1d65" , "buildingDetail" : '10'}
            ]
        
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);

    });
    test('TC36 : scripting modelRef' , async ()=>{
        req.body = {
                "windRisk": {
                    "phaseOne": {
                        "rcp2_6": { "data": 142, "freq": 50 },
                        "rcp4_5": { "data": 150, "freq": 40 },
                        "rcp6_0": { "data": 160, "freq": 30 }
                    },
                    "phaseTwo": {
                        "rcp2_6": { "data": 150, "freq": 40 },
                        "rcp4_5": { "data": 162, "freq": 30 },
                        "rcp6_0": { "data": 170, "freq": 20 }
                    }
            },
        }
        await editProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        // expect(res.json).toHaveBeenCalledWith({
        //     success : false , 
        //     message : 'ข้อมูลโมเดลไม่สามารถมีอักขระพิเศษได้ หรือ ประเภทข้อมูลไม่ถูกต้อง หรือ ไม่พบข้อมูลที่ส่งเข้ามา'
        // })

    });
    
    
});


