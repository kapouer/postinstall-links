#!/usr/bin/node

var pify = require('pify');
var mkdirp = pify(require('mkdirp'));
var fs = require("fs");
fs = {
	readFile: pify(fs.readFile),
	exists: pify(fs.exists, {errorFirst: false}),
	lstat: pify(fs.lstat),
	stat: pify(fs.stat),
	unlink: pify(fs.unlink),
	symlink: pify(fs.symlink)
};
var Path = require('path');

fs.readFile('package.json').then(function(data) {
	var obj = JSON.parse(data);
	if (!obj.links) {
		throw new Error(`No links field in ${process.cwd}package.json`);
	}
	return Promise.all(Object.keys(obj.links).map(function(key) {
		return processLink(key, obj.links[key]);
	}));
}).catch(function(err) {
	console.error(err);
});

function processLink(key, destPath) {
	var list = key.split('/');
	// deal with @owner/name modules
	var module = list.splice(0, list[0].startsWith('@') ? 2 : 1).join('/');
	var modulePath;
	try {
		modulePath = require.resolve(module);
	} catch(ex) {
		console.error("Unknown module", module);
		return;
	}
	return fs.stat(modulePath).then(function(stats) {
		if (stats.isFile()) return Path.dirname(modulePath);
		else return modulePath;
	}).then(function(modulePath) {
		var srcPath = Path.join(modulePath, list.join('/'));

		var destDir;
		if (destPath.endsWith('/')) {
			destDir = destPath;
			destPath = destPath + list.pop();
		} else {
			destDir = Path.dirname(destPath);
		}

		if (!isRooted(srcPath)) throw new Error("Cannot symlink from file outside cwd:\n" + srcPath);
		if (!isRooted(destPath)) throw new Error("Cannot symlink to file outside cwd:\n" + destPath);

		return fs.exists(srcPath).then(function(yes) {
			if (!yes) throw new Error(`Cannot find ${srcPath}`);
		}).then(function() {
			return fs.lstat(destPath).then(function(stats) {
				if (stats.isSymbolicLink()) return fs.unlink(destPath).then(function() {
					return true;
				});
				else return true;
			}).catch(function(err) {
				return false;
			});
		}).then(function(exists) {
			if (!exists) return mkdirp(destDir);
		}).then(function() {
			return fs.symlink(srcPath, destPath);
		});
	});
}

function isRooted(path) {
	return Path.resolve(path).startsWith(process.cwd());
}
