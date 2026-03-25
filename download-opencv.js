const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://docs.opencv.org/4.5.5/opencv.js';
const filePath = path.join(__dirname, 'libs', 'opencv.js');

const file = fs.createWriteStream(filePath);

https.get(url, function(response) {
    response.pipe(file);
    
    file.on('finish', function() {
        file.close();
        console.log('OpenCV.js успешно скачан в папку libs/');
    });
}).on('error', function(err) {
    fs.unlink(filePath);
    console.error('Ошибка при скачивании OpenCV.js:', err.message);
});