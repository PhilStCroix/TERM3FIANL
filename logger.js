const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'logs', 'search_events.log');

function logSearchAction(keyword, userId, userName) {
    console.log('Logging search action...');
    const timestamp = new Date().toISOString();
    const logData = `${timestamp} - User ID: ${userId}, searched for: ${keyword}\n`;

    fs.mkdir(path.join(__dirname, 'logs'), { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating logs directory:', err);
        } else {
            fs.appendFile(logFilePath, logData, (err) => {
                if (err) {
                    console.error('Error writing to log file:', err);
                } else {
                    console.log('Search action logged successfully.');
                }
            });
        }
    });
}

module.exports = { logSearchAction };
