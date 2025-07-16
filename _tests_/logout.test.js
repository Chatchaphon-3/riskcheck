const { logout } = require("../controllers/authService/logout");

describe('Logout unit testing set' , ()=>{
    let req , res;
    beforeEach(()=>{
        jest.clearAllMocks();
         res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis()
        };
    });
    test('TC1 : logout success' , async ()=>{
        await logout(req,res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('TC2 : Internal Server Error' , async ()=>{
        res.cookie.mockImplementation(() => {
        throw new Error('Cookie set failed');
    });
        await logout(req,res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});