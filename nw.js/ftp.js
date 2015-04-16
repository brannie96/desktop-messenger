var fs = require('fs');
var dir = "build/packaged/";
var files = fs.readdirSync(dir);
var Client = require('ftp');
var c = new Client();
c.on('ready', function() {
    console.log("Publishing files to ftp ...");
    files.forEach(function(file) {
        if (file && file.match(/\.zip/ig)) {
            var f = dir + file;
            c.put(f, '/latest/' + file, function(hadError) {
                console.log("Uploading " + file + " ...");
                if (!hadError) {
                    console.log("OK!");
                } else {
                    throw hadError;
                }
                c.end();
            });
        }
    });
});
// connect to localhost:21 as anonymous 
c.connect({
    host: "dev.netlabs.bg",
    user: "messenger@dev.netlabs.bg", // defaults to "anonymous" 
    password: "(CKO6LRzVX;i" // defaults to "@anonymous" 
});