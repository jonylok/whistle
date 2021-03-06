var path = require('path');
var p = require('pfork');
var fs = require('fs');
var fse = require('fs-extra');
var url = require('url');
var extend = require('util')._extend;
var EventEmitter = require('events').EventEmitter;
var pluginMgr = new EventEmitter();
var colors = require('colors/safe');
var comUtil = require('../util');
var logger = require('../util/logger');
var util = require('./util');
var config = require('../config');
var getPluginsSync = require('./get-plugins-sync');
var getPlugin = require('./get-plugins');
var rulesMgr = require('../rules');
var RulesMgr = require('../rules/rules');
var properties = require('../rules/util').properties;
var PLUGIN_MAIN = path.join(__dirname, './load-plugin');
var PLUGIN_URL_RE = /^(?:http|ws)s?:\/\/([\da-z]+)\.local\.whistlejs\.com\//i;
var RULE_VALUE_HEADER = 'x-whistle-rule-value';
var SSL_FLAG_HEADER = 'x-whistle-https';
var FULL_URL_HEADER = 'x-whistle-full-url';
var METHOD_HEADER = 'x-whistle-method';
var INTERVAL = 6000;
var UTF8_OPTIONS = {encoding: 'utf8'};
var plugins = getPluginsSync();
var conf = {};

Object.keys(config).forEach(function(name) {
	var value = config[name];
	if (typeof value == 'string' || typeof value == 'number') {
		conf[name] = value;
	}
});

pluginMgr.on('updateRules', function() {
	rulesMgr.clearAppend();
	Object.keys(plugins).sort(function(a, b) {
		var p1 = plugins[a];
		var p2 = plugins[b];
		return (p1.mtime > p2.mtime) ? 1 : -1;
	}).forEach(function(name) {
		if (pluginIsDisabled(name.slice(0, -1))) {
			return;
		}
		var plugin = plugins[name];
		if (plugin._rules && !plugin.rulesMgr) {
			plugin.rulesMgr = new RulesMgr();
			plugin.rulesMgr.parse(plugin._rules, plugin.path);
		}
		plugin.rules && rulesMgr.append(plugin.rules, plugin.path);
	});
});
pluginMgr.emit('updateRules');

pluginMgr.updateRules = function() {
	pluginMgr.emit('updateRules');
};

pluginMgr.on('update', function(result) {
	Object.keys(result).forEach(function(name) {
		pluginMgr.stopPlugin(result[name]);
	});
});
pluginMgr.on('uninstall', function(result) {
	Object.keys(result).forEach(function(name) {
		pluginMgr.stopPlugin(result[name]);
	});
});

function showVerbose(oldData, newData) {
	if (!config.debugMode) {
		return;
	}
	var uninstallData, installData, updateData;
	Object.keys(oldData).forEach(function(name) {
		var oldItem = oldData[name];
		var newItem = newData[name];
		if (!newItem) {
			uninstallData = uninstallData || {};
			uninstallData[name] = oldItem;
		} else if (newItem.path != oldItem.path || newItem.mtime != oldItem.mtime) {
			updateData = updateData || {};
			updateData[name] = newItem;
		}
	});
	
	Object.keys(newData).forEach(function(name) {
		if (!oldData[name]) {
			installData = installData || {};
			installData[name] = newData[name];
		}
	});
	
	if (uninstallData || installData || updateData) {
		console.log('\n***********[%s] %s has changed***********', comUtil.formatDate(), 'plugins');
	}
	
	uninstallData && Object.keys(uninstallData).forEach(function(name) {
		console.log(colors.red('[' + comUtil.formatDate(new Date(uninstallData[name].mtime)) + '] [uninstall ' + 'plugin] ' + name.slice(0, -1)));
	});
	installData && Object.keys(installData).forEach(function(name) {
		console.log(colors.green('[' + comUtil.formatDate(new Date(installData[name].mtime)) + '] [install ' + 'plugin] ' + name.slice(0, -1)));
	});
	updateData && Object.keys(updateData).forEach(function(name) {
		console.log(colors.yellow('[' + comUtil.formatDate(new Date(updateData[name].mtime)) + '] [update ' + 'plugin] ' + name.slice(0, -1)));
	});
}

function readPackages(obj, callback) {
	var _plugins = {};
	var count = 0;
	var callbackHandler = function() {
		if (--count <= 0) {
			callback(_plugins);
		}
	};
	Object.keys(obj).forEach(function(name) {
		var pkg = plugins[name];
		var newPkg = obj[name];
		if (!pkg || pkg.path != newPkg.path || pkg.mtime != newPkg.mtime) {
			++count;
			fse.readJson(newPkg.pkgPath, function(err, pkg) {
				if (pkg && pkg.version) {
					newPkg.version = pkg.version;
					newPkg.homepage = util.getHomePageFromPackage(pkg);
					newPkg.description = pkg.description;
					newPkg.moduleName = pkg.name;
					_plugins[name] = newPkg;
					fs.readFile(path.join(path.join(newPkg.path, 'rules.txt')), UTF8_OPTIONS, function(err, rulesText) {
						newPkg.rules = comUtil.trim(rulesText);
						fs.readFile(path.join(path.join(newPkg.path, '_rules.txt')), UTF8_OPTIONS, function(err, rulesText) {
							newPkg._rules = comUtil.trim(rulesText);
							callbackHandler();
						});
					});
				} else {
					callbackHandler();
				}
				
			});
			
		} else {
			_plugins[name] = pkg;
		}
	});
	
	if (count <= 0) {
		callback(_plugins);
	}
}

(function update() {
	setTimeout(function() {
		getPlugin(function(result) {
			readPackages(result, function(_plugins) {
				var updatePlugins, uninstallPlugins;
				Object.keys(plugins).forEach(function(name) {
					var plugin = plugins[name];
					var newPlugin = _plugins[name];
					if (!newPlugin) {
						uninstallPlugins = uninstallPlugins || {};
						uninstallPlugins[name] = plugin;
					} else if (newPlugin.path != plugin.path || newPlugin.mtime != plugin.mtime) {
						updatePlugins = updatePlugins || {};
						updatePlugins[name] = newPlugin;
					}
				});
				showVerbose(plugins, _plugins);
				plugins = _plugins;
				if (uninstallPlugins || updatePlugins) {
					uninstallPlugins && pluginMgr.emit('uninstall', uninstallPlugins);
					updatePlugins && pluginMgr.emit('update', updatePlugins);
					pluginMgr.emit('updateRules');
				}
				update();
			});
		});
	}, INTERVAL);
})();

pluginMgr.RULE_VALUE_HEADER = RULE_VALUE_HEADER;
pluginMgr.SSL_FLAG_HEADER = SSL_FLAG_HEADER;
pluginMgr.FULL_URL_HEADER = FULL_URL_HEADER;
pluginMgr.METHOD_HEADER = METHOD_HEADER;

function loadPlugin(plugin, callback) {
	config.debugMode && console.log(colors.cyan('[' + comUtil.formatDate() + '] [access plugin] ' + plugin.path));
	p.fork({
		name: plugin.moduleName,
		script: PLUGIN_MAIN,
		value: plugin.path,
		RULE_VALUE_HEADER: RULE_VALUE_HEADER,
		SSL_FLAG_HEADER: SSL_FLAG_HEADER,
		FULL_URL_HEADER: FULL_URL_HEADER,
		METHOD_HEADER: METHOD_HEADER,
		debugMode: config.debugMode,
		config: conf
	}, function(err, ports, child) {
		callback && callback(err, ports, child);
		logger.error(err);
		if (config.debugMode) {
			if (err) {
				console.log(colors.red(err));
			} else if (!child.debugMode) {
				child.debugMode = true;
				child.on('data', function(data) {
					if (data && data.type == 'console.log') {
						console.log('[' + comUtil.formatDate() + '] [plugin] [' + plugin.path.substring(plugin.path.lastIndexOf('.') + 1) + ']', data.message);
					}
				});
				child.sendData({
					type: 'console.log',
					status: 'ready'
				});
			}
		}
	});
}

pluginMgr.loadPlugin = loadPlugin;

pluginMgr.stopPlugin = function(plugin) {
	p.kill({
		script: PLUGIN_MAIN,
		value: plugin.path
	}, 10000);
};

pluginMgr.getPlugins = function() {
	return plugins;
};

function pluginIsDisabled(name) {
	if (properties.get('disabledAllPlugins')) {
		return true;
	}
	var disabledPlugins = properties.get('disabledPlugins') || {};
	return disabledPlugins[name];
}

pluginMgr.getPlugin = function(protocol) {
	return pluginIsDisabled(protocol.slice(0, -1)) ? null : plugins[protocol];
};

function getPluginByRuleUrl(ruleUrl) {
	if (!ruleUrl || typeof ruleUrl != 'string') {
		return;
	}
	var index = ruleUrl.indexOf(':');
	if (index == -1) {
		return null;
	}
	var protocol = ruleUrl.substring(0, index + 1);
	return pluginIsDisabled(protocol.slice(0, -1)) ? null : plugins[protocol];
}

pluginMgr.getPluginByRuleUrl = getPluginByRuleUrl;

pluginMgr.getPluginByHomePage = function(url) {
	return PLUGIN_URL_RE.test(url) 
				&& plugins[RegExp.$1 + ':'];
};

function getRules(req, port, callback) {
	if (!port) {
		return callback();
	}
	var options = url.parse(req.fullUrl);
    options.headers = extend({}, req.headers);
    options.headers[FULL_URL_HEADER] = encodeURIComponent(req.fullUrl);
    options.headers[METHOD_HEADER] = encodeURIComponent(req.method || 'GET');
    if (options.protocol == 'https:' || options.protocol == 'wss:') {
        options.headers[SSL_FLAG_HEADER] = 'true';
    }

    options.protocol = 'http:';
    options.host = '127.0.0.1';
    options.port = port;
    options.hostname = null;
    var ruleValue = comUtil.getMatcherValue(req.rules.rule);
    if (ruleValue) {
        options.headers[RULE_VALUE_HEADER] = encodeURIComponent(ruleValue);
    }
    delete options.headers.upgrade;
    delete options.headers.connection;
    comUtil.getResponseBody(options, callback);
}

pluginMgr.getRules = function(req, callback) {
	var plugin = getPluginByRuleUrl(comUtil.rule.getUrl(req.rules.rule));
	if (!plugin) {
		return callback();
	}
	
	loadPlugin(plugin, function(err, ports) {
		getRules(req, ports && ports.rulesPort, function(err, body) {
			if (err || !body) {
				callback(plugin.rulesMgr, plugin);
			} else {
				if (body != plugin.__rules) {
					var rulesMgr = new RulesMgr();
					rulesMgr.parse(body + (plugin._rules ? '\n' + plugin._rules : ''), plugin.path);
					plugin._rulesMgr = rulesMgr;
					plugin.__rules = body;
				}
				callback(plugin._rulesMgr, plugin);
			}
		});
	});
};

module.exports = pluginMgr;

