const{ deleteProject } = require('../controllers/projectService/delete');
const Project = require('../models/Project');
const Unit = require('../models/Unit');
const Risk = require('../models/Risk');
const {default: mongoose} = require('mongoose');

jest.mock('../models/Project');
jest.mock('../models/Unit');
jest.mock('../models/Risk');
jest.mock('../models/User');

describe('Delete project Unit testing set' , ()=>{
    let req , res ,mockProject;
    let projectid = new mongoose.Types.ObjectId();
    let userid = new mongoose.Types.ObjectId();
    const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
    };
    beforeEach(()=>{
        jest.clearAllMocks();
        mockProject = {userID : userid};
        mockProject.deleteOne = jest.fn();
        mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
        req = {
            params :{
                id : projectid.toString()
            },
            user : {
                id : userid.toString() , 
                role : 'user'
            }
        }
        res = {
            status : jest.fn().mockReturnThis() , 
            json : jest.fn()
        }
        Project.findById.mockReturnValue({
            session: () => mockProject
        });
        Risk.deleteOne.mockReturnValue({
            session : () => {}
        });
        Unit.deleteOne.mockReturnValue({
            session : () => {}
        });
    });
    test('TC1 : user delete their own project : 200' , async ()=>{
        await deleteProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC2 : user delete another user  project : 200' , async ()=>{
        req.user.id = new mongoose.Types.ObjectId().toString();
        await deleteProject(req,res);
        expect(res.status).toHaveBeenCalledWith(403);
    });
    test('TC3 : id in params no valid : 200' , async ()=>{
        req.params.id = '<script>';
        await deleteProject(req,res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC4 : not found project : 200' , async ()=>{
        Project.findById.mockReturnValue({
            session: () => undefined
        });
        await deleteProject(req,res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
    test('TC5 : Internal Server Error : 200' , async ()=>{
        Project.findById.mockImplementation(()=>{
            throw {server : 'error'};
        })
        await deleteProject(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
    test('TC6 : admin delete another user  project : 200' , async ()=>{
        req.user.role = 'admin'
        req.user.id = new mongoose.Types.ObjectId().toString();
        await deleteProject(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});