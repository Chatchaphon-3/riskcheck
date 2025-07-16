const {s3 } = require('../middleware/uploadConfig');
const {PutObjectCommand ,GetObjectCommand , HeadObjectCommand} = require('@aws-sdk/client-s3');

async function fileExists(bucket, key) {
        try {
            await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
            return true;
        } catch (err) {
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
            throw err; // error อื่น เช่น network หรือ permission ก็โยนออกไป
        }
}

module.exports = fileExists;
    