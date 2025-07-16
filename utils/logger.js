const winston = require('winston');



const logger = winston.createLogger({  // create Log and setting 
    level : 'info' ,    // choose log level (info , error , warn , ... sum like that )
    format : winston.format.combine(
        winston.format.timestamp(), // เพิ่ม timestamp ให้ logger
        winston.format.json()  // เก็บ log ในฟอม JSON
    ),
    transports: [
        new winston.transports.File({filename : './log/combined.json'})
    ],
});

const logger2 = winston.createLogger({  // create Log and setting 
    level : 'info' ,    // choose log level (info , error , warn , ... sum like that )
    format : winston.format.combine(
        winston.format.timestamp(), // เพิ่ม timestamp ให้ logger
        winston.format.json()  // เก็บ log ในฟอม JSON
    ),
    transports: [
        new winston.transports.File({filename : './log/regis.json'})
    ],
});


if(process.env.NODE_ENV !== 'production') {    // เอาไว้ debug
    logger.add(new winston.transports.Console({
        format : winston.format.simple(),
    }));
}



module.exports  = {
    logger , logger2
};