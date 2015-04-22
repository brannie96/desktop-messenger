var semver = require('semver');
var request = require("request");
var Client = require('ftp');
var NwBuilder = require('node-webkit-builder');
var file_system = require('fs');
var archiver = require('archiver');
var settings = require("./settings.json");

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
    json.version = semver.inc(json.version, "patch");
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
        host: settings.ftp_hostname,
        user: settings.ftp_username,
        password: settings.ftp_password
    });
};
build.prototype.log = function (text) {
    var dateString = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    console.log("[" + dateString + "] " + text);
};
build.prototype.build_packages = function () {
    var $this = this;
    this.update_build();
    $this.log('Build of version ' + $this.package.version + ' (build: ' + $this.package.build_date + ') started ...');

    // retrieve last pushed package.json
    // if version is the same it will not publish the build (dev version)
    request({
        url: 'http://messenger.dev.netlabs.bg/latest/package.json',
        json: true
    }, function (error, response, latest_json) {
        if (!error && response.statusCode === 200) {
            var nw = new NwBuilder({
                files: 'source/**', // use the glob format
                appName: 'Messenger',
                //    buildType: function () {return $this.appVersion;},
                winIco: 'messenger.ico',
        //        platforms: ['win32', 'win64']
		        platforms: ['win32', 'win64', 'osx32', 'osx64', 'linux32', 'linux64']
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
        }
    });
};
build.prototype.completed = function () {
    $this = this;
    $this.ftp.put('./source/package.json', '/latest/package.json', function (hadError) {
        $this.log("Build completed");
        $this.ftp.end();
    });
};
new build();