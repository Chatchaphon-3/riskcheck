function sanitizeFileName(filename) {
    const invalidChars = /[<>:"\/\\|?*\s]/g; // อักขระที่ไม่อนุญาต
    const maxLength = 255; // จำกัดความยาวชื่อไฟล์
    const maxDots = 1; // อนุญาตให้มี dot ได้ 1 จุด (ก่อนนามสกุล)
    // console.log(filename);
    // filename = filename + new Date().toISOString();
    // console.log(filename);
    // replace invalid char with '_'
    let sanitized = filename.replace(invalidChars, '_');

    // Count Dots in filename
    const dotCount = (sanitized.match(/\./g) || []).length;

    // if filename has dots more than 1 , replace all dots with '_' except last dot
    if (dotCount > maxDots) {
        const parts = sanitized.split('.'); // arrays of word split by dots
        const baseName = parts.slice(0, -1).join('_'); // merge all path by using _. to join each word
        const extension = parts.pop(); // this is wear นามสกุล file is located 
        sanitized = `${baseName}.${extension}`; // we have a sanitized file name !
    }

    // Next-up : check filename lenght 
    if (sanitized.length > maxLength) {
        const extIndex = sanitized.lastIndexOf('.');  // check if this filename has a นามสกุล 
        const baseName = extIndex === -1 ? sanitized : sanitized.slice(0, extIndex); // split a file name 
        const extension = extIndex === -1 ? '' : sanitized.slice(extIndex); // split a file surname 
        sanitized = baseName.slice(0, maxLength - extension.length) + extension; //ทำให้มันใส่ได้
    }

    return sanitized;
}

module.exports = sanitizeFileName;
