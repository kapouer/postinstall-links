var common = require('./common');


describe("Root config", function suite() {
	before(function() {
		return common.prepare();
	});

	after(function() {

	});

	it("should install local links", function() {
		return common.cmd("local", "install").then(function({dir, pkg}) {
			return common.checkLinks(dir, pkg);
		});
	});

});
