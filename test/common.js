var pify = require('pify');
var fs = pify(require('fs'));
var rimraf = pify(require('rimraf'));
var mkdirp = pify(require('mkdirp'));
var spawn = require('spawn-please');
var Path = require('path');
var ncp = pify(require('ncp').ncp);
var assert = require('assert');

var tmpDir = Path.join(__dirname, "tmp");

exports.checkLinks = function(dir, pkg) {
	return Promise.all(Object.keys(pkg.links).map(function(key) {
		var path = pkg.links[key];
		if (path.endsWith('*')) {
			// check path without * is a directory
			path = Path.join(dir, path.split('/').slice(0, -1).join('/'));
			return fs.stat(path).then(function(stat) {
				assert.ok(stat.isDirectory());
			});
		} else {
			// check path is a symlink
			return fs.lstat(Path.join(dir, path)).then(function(stat) {
				assert.ok(stat.isSymbolicLink());
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
