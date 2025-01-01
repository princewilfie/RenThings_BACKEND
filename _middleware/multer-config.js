const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the directory exists
const assetsPath = path.join(__dirname, '../assets/');
if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, assetsPath); // Use the assetsPath variable
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
