#!/usr/bin/node

var pify = require('pify');
var mkdirp = require('mkdirp');
var fs = require("fs");
var Path = require('path');

pify(fs.readFile)('package.json').then(function(data) {
	var obj = JSON.parse(data);
	if (!obj.links) {
		throw new Error(`No links field in ${process.cwd}package.json`);
	}
	return Promise.all(Object.keys(obj.links).map(function(key) {
		return processLink(key, obj.links[key]);
	}));
});

function processLink(key, value) {
	var list = key.split('/');
	var module = list.splice(0, 1)[0];
	var modulePath;
	try {
		modulePath = require.resolve(module);
	} catch(ex) {
		console.error("Unknown module", module);
		return;
	}
	var filePath = Path.join(modulePath, list.join('/'));
	var destDir;
	if (value.endsWith('/')) {
		destDir = value;
		value = value + list.pop();
	} else {
		destDir = Path.dirname(value);
	}
	return pify(fs.exists)(filePath).then(function(yes) {
		if (!yes) throw new Error('Cannot find', filePath);
	}).then(function() {
		return mkdirp(destDir);
	}).then(function() {
		return pify(fs.symlink)(filePath, value);
	});
}

