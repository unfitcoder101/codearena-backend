const fs =require("fs");
const { exec } = require("child_process");

exports.runCppCode = (code) => {
    return new Promise((resolve,reject) => {
        const filePath = "./temp.cpp";

        //Step 1: wiret code to file
        fs.writeFileSync(filePath,code);

        //Step 2: compile and run
        exec(`g++ ${filePath} -o temp && ./temp`, (error, stdout,stderr) => {
            if(error){
                return reject(stderr || error.message);
        
            }
            resolve(stdout);
        });
    });
};