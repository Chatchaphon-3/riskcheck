const Project = require('../models/Project');
const Unit  = require('../models/Unit');
const Risk = require('../models/Risk');
const User = require('../models/User');
const {createCertificate} = require('../controllers/projectService/certificate')
const { default: mongoose, mongo } = require('mongoose');
const generateRiskCertificatePDF = require('../utils/buildCertificate');
const checkFileExisted = require('../utils/checkFileExisted');
jest.mock('../models/Project');
jest.mock('../models/Unit');
jest.mock('../models/Risk');
jest.mock('../models/User');
jest.mock('../utils/buildCertificate');
jest.mock('../utils/checkFileExisted');


describe('get certificate unit testing set' , ()=>{
    let req , res , mockProject;
    let userid = new mongoose.Types.ObjectId();
    let projectid = new mongoose.Types.ObjectId();
    let evaluatorid = new mongoose.Types.ObjectId();

    beforeEach(()=>{
        jest.clearAllMocks();
        req = {
            params : {
                id : projectid.toString()
            },
            user : {
                role : 'user' , 
                id : userid.toString()
            }
        };
        res = {
            status : jest.fn().mockReturnThis() , 
            json : jest.fn()
        };
        mockProject = {
            projectStatus : 'Completed' , 
            userID : userid , 
            evaluatorID : evaluatorid , 
            projectNum : 123221 
        }
        Project.findById.mockReturnValue(mockProject);
        Unit.findOne.mockReturnValue({});
        Risk.findOne.mockReturnValue({});
        User.findById.mockReturnValue({});
    });
    test('TC1 : user get certificate . nothing went wrong' , async ()=>{
        checkFileExisted.mockResolvedValue(false);
        generateRiskCertificatePDF.mockResolvedValue('some-fake-file.pdf');
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC2 : user get certificate . nothing went wrong(already have in server)' , async ()=>{
        checkFileExisted.mockResolvedValue(true);
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC3 : user get certificate but project no finish' , async ()=>{
        mockProject.projectStatus = 'รอเจ้าของโครงการ';
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC4 : invalid id params' , async ()=>{
        req.params.id = '1233112121';
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC5 : project not found  ' , async ()=>{
        Project.findById.mockReturnValue(undefined);
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
    test('TC6 : not our project ' , async ()=>{
        mockProject.userID = new mongoose.Types.ObjectId();
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC6 : my project (eva) ' , async ()=>{
        mockProject.evaluatorID = evaluatorid;
        req.user.id = evaluatorid.toString();
        req.user.role = 'evaluator';
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC6 : not my project (eva) ' , async ()=>{
        mockProject.evaluatorID = new mongoose.Types.ObjectId();
        req.user.role = 'evaluator';
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC6 : server error ' , async ()=>{
        Project.findById.mockImplementation(()=>{
            throw {server : false};
        })
        await createCertificate(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});