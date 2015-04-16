var Client = require('ftp');
var NwBuilder = require('node-webkit-builder');
var file_system = require('fs');
var archiver = require('archiver');

function build() {
    this.package = {};
    this.connect_ftp();
    this.build_packages();
}
build.prototype.update_build = function () {
    var $this = this;
    var json, new_json;
    var json_file = "./source/package.json";
    json = file_system.readFileSync(json_file);
    json = JSON.parse(json);
    json.build = Number(json.build) + 1;
    json.build_date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    new_json = JSON.stringify(json, null, "\t");
    file_system.writeFileSync(json_file, new_json);
    this.package = json;
    return true;
};

build.prototype.connect_ftp = function () {
    var $this = this;
    var dir = "build/packaged/";
    var files = file_system.readdirSync(dir);
    $this.ftp = new Client();
    // connect to localhost:21 as anonymous
    $this.ftp.connect({
        host: "dev.netlabs.bg",
        user: "messenger@dev.netlabs.bg", // defaults to "anonymous"
        password: "(CKO6LRzVX;i" // defaults to "@anonymous"
    });
};
build.prototype.log = function (text) {
    var dateString = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    console.log("[" + dateString + "] " + text);
};
build.prototype.build_packages = function () {
    var $this = this;
    this.update_build();
    $this.log('Build of version ' + $this.package.version + ' (build: ' + $this.package.build + ') started ...');
    var pjson = require('./source/package.json');
    var nw = new NwBuilder({
        files: 'source/**', // use the glob format
        appName: 'Messenger',
        //    buildType: function () {return $this.appVersion;},
        winIco: 'messenger.ico',
        platforms: ['win32', 'win64']
        //        platforms: ['win32', 'win64', 'osx32', 'osx64', 'linux32', 'linux64']
    });
    nw.build().then(function () {
        $this.log('Build completed! Start compressing files ...');
        $this.current_file = 1;
        nw.options.platforms.forEach(function (entry) {
            build = "./build/" + entry;
            dir = './build/packaged/';
            if (!file_system.existsSync(dir)) {
                file_system.mkdirSync(dir);
            }
            var output = file_system.createWriteStream('./build/packaged/Messenger-' + entry + '.zip');
            var archive = archiver('zip');
            output.on('close', function () {
                $this.log('created ' + entry + ': size: ' + archive.pointer() + ' total bytes');
                $this.ftp.put('./build/packaged/Messenger-' + entry + '.zip', '/latest/Messenger-' + entry + '.zip', function (hadError) {
                    $this.log("Uploaded Messenger-" + entry + ".zip; File " + $this.current_file + "/" + nw.options.platforms.length);
                    if ($this.current_file == nw.options.platforms.length) {
                        $this.completed();
                    } else {
                        $this.current_file++;
                    }
                    if (hadError) {
                        throw hadError;
                    }
                });
            });
            archive.on('error', function (err) {
                throw err;
            });
            archive.pipe(output);
            archive.bulk([{
                expand: true,
                cwd: './build/Messenger/' + entry + '/',
                src: ['**'],
                dest: ''
            }]);
            archive.finalize();
        });
    });
};
build.prototype.completed = function () {
    this.log("Build completed");
    this.ftp.end();
};
new build();