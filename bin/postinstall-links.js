#!/usr/bin/node

var pify = require('pify');
var glob = pify(require('glob'));
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
		return processKeyVal(key, obj.links[key]);
	}));
}).catch(function(err) {
	console.error(err);
});

function processKeyVal(key, destPath) {
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
	modulePath = findModuleRoot(modulePath, module);
	var srcFile = list.pop();
	var srcPath = Path.join(modulePath, list.join('/'), srcFile);
	assertRooted(modulePath, srcPath);
	var destDir, destFile;
	if (destPath.endsWith('/')) {
		destDir = destPath;
		destFile = destPath + srcFile;
	} else {
		destDir = Path.dirname(destPath);
		destFile = destPath;
	}
	assertRooted(process.cwd(), destDir);
	return mkdirp(destDir).then(function() {
		if (srcFile == "*") {
			if (!destPath.endsWith('/')) {
				console.error("Wildcard symlinks only works with a destination directory", key, destPath);
				return;
			}
			return glob(srcPath, {
				nosort: true,
				nobrace: true,
				noglobstar: true
			}).then(function(paths) {
				return Promise.all(paths.map(function(onePath) {
					return makeLink(onePath, Path.join(destDir, Path.basename(onePath)));
				}));
			});
		} else {
			return makeLink(srcPath, destFile);
		}
	});
}

function makeLink(srcPath, destPath) {
	return fs.exists(srcPath).then(function(yes) {
		if (!yes) throw new Error(`Cannot find ${srcPath}`);
	}).then(function() {
		return fs.lstat(destPath).then(function(stats) {
			if (stats.isSymbolicLink()) return fs.unlink(destPath);
		}).catch(function() {});
	}).then(function() {
		return fs.symlink(srcPath, destPath);
	});
}

function assertRooted(root, path) {
	if (!Path.resolve(path).startsWith(root)) {
		throw new Error(`path is not in root:\n ${root}\n ${path}`);
	}
}

function findModuleRoot(resolvedPath, moduleName) {
	moduleName = moduleName.split('/').pop();
	if (resolvedPath.endsWith(moduleName)) {
		return resolvedPath;
	} else {
		var dir = Path.dirname(resolvedPath);
		if (dir == resolvedPath) throw new Error("Cannot find module root: " + moduleName);
		return findModuleRoot(dir, moduleName);
	}
}
