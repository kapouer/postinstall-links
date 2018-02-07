#!/usr/bin/node

var pify = require('pify');
var glob = pify(require('glob'));
var mkdirp = pify(require('mkdirp'));
var resolvePkg = require('resolve-pkg');

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
		throw new Error(`No links field in ${Path.join(process.cwd(), 'package.json')}`);
	}
	return Promise.all(Object.keys(obj.links).map(function(key) {
		return processKeyVal(key, obj.links[key]);
	}));
}).catch(function(err) {
	console.error(err);
});

function processKeyVal(key, destPath) {
	var srcPath = resolvePkg(key) || Path.resolve(key);
	var srcFile = Path.basename(srcPath);
	var destDir, destFile;
	if (destPath.endsWith('/')) {
		destDir = destPath;
		destFile = Path.join(destPath, srcFile);
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
