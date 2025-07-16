const Project = require('../models/Project');
const mongoose = require('mongoose');
const { getAllProjects } = require('../controllers/projectService/getAll');

// Mock dependencies
jest.mock('../models/Project');
jest.mock('../info/district_sub.json', () => ({
    lebron: [],
    hit: []
}));

// Mock express-mongo-sanitize
// jest.mock('express-mongo-sanitize', () => ({
//     sanitize: jest.fn(input => input) // Return input as-is for testing
// }));

describe('getAllProject Unit testing set', () => {
    let req, res;
    const testArray = [
        {
            _id: 'proj1',
            projectName: 'Project One',
            district: 'lebron',
            subDistrict: 'bronny',
            projectStatus: 'Completed',
            updatedAt: new Date(),
            projectNum: '001',
            userID: new mongoose.Types.ObjectId(),
            evaluatorID: new mongoose.Types.ObjectId()
        },
        {
            _id: 'proj2',
            projectName: 'Project Two',
            district: 'lebron',
            subDistrict: 'bronny',
            projectStatus: 'รอผู้ตรวจสอบ',
            updatedAt: new Date(),
            projectNum: '002',
            userID: new mongoose.Types.ObjectId(),
            evaluatorID: new mongoose.Types.ObjectId()
        },
        {
            _id: 'proj3',
            projectName: 'Project Three',
            district: 'hit',
            subDistrict: 'bronny',
            projectStatus: 'รอเจ้าของโครงการ',
            updatedAt: new Date(),
            projectNum: '003',
            userID: new mongoose.Types.ObjectId(),
            evaluatorID: new mongoose.Types.ObjectId()
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        let userid = new mongoose.Types.ObjectId();
        req = {
            user: {
                role: 'user',
                _id: userid,
                district: 'lebron'
            },
            query: {
                projectName: 'nameOne',
                district: 'lebron,lebronto',
                subDistrict: 'bronny',
                status: 'Completed',
                sort: 'createdAt,updatedAt'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        Project.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue(testArray)
        });
    });

    test('TC1 : query error not valid status', async () => {
        req.query.status = 'wrongStatus';
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'
        });
    });
    test('TC2 : happy path : search one district', async () => {
        req.query.district = 'hit';
        Project.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([testArray[2]]) // ตัวเดียวที่ district === 'hit'
        });
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            total : 1

        }));
    });
    test('TC3 : evaluator see all project ', async () => {
        req.user.role = 'evaluator';
        req.user.district = 'hit';
        Project.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([testArray[2]]) 
        });
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            total : 1 , 
            totalFinishedProject : expect.any(Number) , 
            totalWaitingForEvaluator : expect.any(Number) , 
            totalWaitingForUser : expect.any(Number) , 
            data : expect.any(Object)

        }));
    });
    test('TC4 : ce see all project ', async () => {
        req.user.role = 'ce';
        req.user.district = 'hit';
        Project.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([testArray[2]]) 
        });
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            total : 1 , 
            totalFinishedProject : expect.any(Number) ,   //ce 
            totalWaitingForEvaluator : expect.any(Number) , 
            totalWaitingForUser : expect.any(Number) , 
            data : expect.any(Object) , 
            summary : expect.any(Object)

        }));
    });
    test('TC5 : Internal Server crashed', async () => {
        Project.find.mockImplementation(()=>{
            throw new Error('Database crashed');
        });
        await getAllProjects(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success : false , 
                message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'
            })
        );
    });
    test('TC6 : query error not valid projectName', async () => {
        req.query.projectName = {age : 10};
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'
        });
    });
    test('TC7 : query error not valid district', async () => {
        req.query.district = {age : 10};
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'
        });
    });
    test('TC8 : query error not valid sub-district', async () => {
        req.query.subDistrict = {age : 10};
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success : false , 
            message : 'รูปแบบข้อมูลใน params รูปแบบผิดพลาด'
        });
    });
    test('TC9 : user not have any project', async () => {
         Project.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([])
        });
        await getAllProjects(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success : true  , 
            message : 'ไม่พบข้อมูลโครงการ'
        });
    });
    test('TC10 : user see all their projects', async () => {
        await getAllProjects(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            total : 3 
        }));
    });
    test('TC11 : ce see all project (0) ', async () => {
        req.user.role = 'ce';
        req.user.district = 'hit';
        Project.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([]) 
        });
        await getAllProjects(req ,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            total : 0 , 
            totalFinishedProject : expect.any(Number) ,   //ce 
            totalWaitingForEvaluator : expect.any(Number) , 
            totalWaitingForUser : expect.any(Number) , 
            data : expect.any(Object) , 
            summary : expect.any(Object)

        }));
    });
    test('TC10 : user see all their projects', async () => {
        req.query = {};
        await getAllProjects(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success : true , 
            total : 3 
        }));
    });
    test('TC11 : user see all their projects (extra districts)', async () => {
        req.query.district = ',,,,,';
        await getAllProjects(req,res);
        expect(res.status).toHaveBeenCalledWith(200);

    });
    test('TC11 : ce see all projects ', async () => {
        req.query = {};
        req.user.role = 'ce';
        await getAllProjects(req,res);
        expect(res.status).toHaveBeenCalledWith(200);

    });
    

});