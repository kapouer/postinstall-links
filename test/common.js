var pify = require('pify');
var fs = pify(require('fs'));
var rimraf = pify(require('rimraf'));
var mkdirp = pify(require('mkdirp'));
var spawn = require('spawn-please');
var Path = require('path');
var ncp = pify(require('ncp').ncp);
var glob = pify(require('glob'));
var assert = require('assert');

var tmpDir = Path.join(__dirname, "tmp");

exports.checkLinks = function(dir, pkg) {
	return Promise.all(Object.keys(pkg.links).map(function(key) {
		var dest = Path.join(dir, pkg.links[key]);
		var count = 0;
		if (key.endsWith('*')) {
			return glob(Path.join(dest, '*'), {
				nosort: true,
				nobrace: true,
				noglobstar: true,
			}).then(function(files) {
				return Promise.all(files.map(function(file) {
					return fs.lstat(file).then(function(stat) {
						count++;
						assert.ok(stat.isSymbolicLink(), `is symbolic link ${file}`);
					});
				}));
			}).then(function() {
				assert.ok(count >= 2, "at least two files should have been installed");
			});
		} else {
			// check path is a symlink
			return fs.lstat(dest).then(function(stat) {
				count++;
				assert.ok(stat.isSymbolicLink(), `is symbolic link ${dest}`);
			}).then(function() {
				assert.ok(count == 1, "one file should have been installed");
			});
		}
	}));
};

exports.prepare = function() {
	return rimraf(tmpDir).then(function() {
		return ncp(Path.join(__dirname, "fixtures"), tmpDir);
	});
};

exports.cmd = function(dir, cmd) {
	return run(Path.join(tmpDir, dir), cmd);
};

//exports.setbin = function(dir) {
//	var bindir = Path.join(dir, 'node_modules', '.bin');
//	return mkdirp(bindir).then(function() {
//		return fs.symlink(Path.join(bindir, 'postinstall-links'
//	});
//};

function run(dir, cmd) {
	if (!Array.isArray(cmd)) cmd = [cmd];
	return spawn("npm", cmd, {
		cwd: dir,
		timeout: 10000,
		env: {
			HOME: process.env.HOME,
			PATH: process.env.PATH,
			npm_config_userconfig: '', // attempt to disable user config
			npm_config_ignore_scripts: 'false',
			npm_config_loglevel: 'info',
			npm_config_progress: 'false',
			npm_config_package_lock: 'false',
			npm_config_only: 'prod',
			npm_config_offline: 'true'
		}
	}).then(function(out) {
		if (out) console.log(out);
		return fs.readFile(Path.join(dir, 'package.json')).then(function(buf) {
			return {dir: dir, pkg: JSON.parse(buf)};
		});
	});
}
