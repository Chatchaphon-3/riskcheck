exports.logout = async (req,res,next)=>{
    try{
        res.cookie('token' , '' , {
        expires : new Date(Date.now()) , 
        httpOnly : true 
    });

    return res.status(200).json({success : true , message : 'ออกจากระบบเสร็จสิ้น'});
    }catch(error){
        // console.log(error);
        return res.status(500).json({success : false , message : 'เกิดปัญหาทางฝั่งเซิร์ฟเวอร์'});
    }
}