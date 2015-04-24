var net = require('net');
var url = require('url');
var path = require('path');
var util = require('util');
var os = require('os');
var StringDecoder = require('string_decoder').StringDecoder;
var PassThrough = require('stream').PassThrough;
var iconv = require('iconv-lite');
var zlib = require('zlib');
var PipeStream = require('pipestream');
var config = require('../package.json');
var npm = require('./npm');
var installedTianma, startedTianma;

exports.LOCAL_DATA_PATH = path.join(__dirname, '../../' + config.dataDirname);
exports.config = util._extend({}, config);
exports.argvs = require('./argvs');
exports.WhistleTransform = require('./whistle-transform');
exports.npm = npm;

exports.installTianma = function(config, callback) {
	if (installedTianma) {
		start();
		callback && callback();
		return;
	}
	
	npm(['tianma@0.8.1', 'tianma-unicorn@1.0.15', 'pegasus@0.7.5'], function(err) {
		!err && start();
		callback && callback(err);
	});
	
	function start() {
		try {
			installedTianma = true;
			!startedTianma && require('../biz/tianma/app')(config);
			startedTianma = true;
		} catch(e) {}
	}
};

function noop() {}

exports.noop = noop;

var REG_EXP_RE = /^\/(.+)\/(i)?$/

exports.isRegExp = function isRegExp(regExp) {
	return REG_EXP_RE.test(regExp);
};


exports.getHost = function parseHost(_url) {
	_url = url.parse(setProtocol(_url || '')).hostname;
	return _url && _url.toLowerCase();
};


exports.toRegExp = function toRegExp(regExp) {
	regExp = REG_EXP_RE.test(regExp);
	try {
		regExp = regExp && new RegExp(RegExp.$1, RegExp.$2);
	} catch(e) {
		regExp = null;
	}
	return regExp;
};

exports.getFullUrl = function getFullUrl(req) {
	if (hasProtocol(req.url)) {
		req.url = url.parse(req.url).path;
	}
	return _getProtocol(req.isHttps) + req.headers.host + req.url;
};

function setProtocol(url, isHttps) {
	return hasProtocol(url) ? url : _getProtocol(isHttps) + url;
}

function _getProtocol(isHttps) {
	return isHttps ? 'https://' : 'http://';
}

function hasProtocol(url) {
	return /^[a-z0-9.+-]+:\/\//i.test(url);
}

function getProtocol(url) {
	return hasProtocol(url) ? url.substring(0, url.indexOf('://') + 1) : null;
}

function removeProtocol(url, clear) {
	return hasProtocol(url) ? url.substring(url.indexOf('://') + (clear ? 3 : 1)) : url;
}

exports.hasProtocol = hasProtocol;
exports.setProtocol = setProtocol;
exports.getProtocol = getProtocol;
exports.removeProtocol = removeProtocol;

exports.isLocalAddress = function(address) {
	if (!address) {
		return false;
	}
	
	if (address == '127.0.0.1' || address == '0:0:0:0:0:0:0:1') {
		return true;
	}
	
	address = address.toLowerCase();
	var interfaces = os.networkInterfaces();
	for (var i in interfaces) {
		var list = interfaces[i];
		if (Array.isArray(list)) {
			for (var j = 0, info; info = list[j]; j++) {
				if (info.address.toLowerCase() == address) {
					return true;
				}
			}
		}
	}
	
	return false;
};

exports.isWebProtocol = function isWebProtocol(protocol) {
	return protocol == 'http:' || protocol == 'https:';
};


exports.drain = function drain(stream, end) {
	if (end) {
		stream._readableState.endEmitted ? end.call(stream) : stream.on('end', end);
	}
	stream.on('data', noop);
};

exports.encodeNonAsciiChar = function encodeNonAsciiChar(str) {
	
	return  str ? str.replace(/[^\x00-\x7F]/g, encodeURIComponent) : str;
};

function getPath(url) {
	url = url && url.replace(/\/?(?:\?|#).*$/, '') || '';
	var index = url.indexOf('://');
	return index > -1 ? url.substring(index + 3) : url;
}

exports.getPath = getPath;

exports.wrapResponse = function wrapResponse(res) {
	var passThrough = new PassThrough();
	passThrough.statusCode = res.statusCode;
	passThrough.headers = res.headers || {};
	passThrough.headers.Server = config.name;
	passThrough.push(res.body == null ? null : String(res.body));
	return passThrough;
};

function parseJSON(data) {
	try {
		return JSON.parse(data);
	} catch(e) {}
	
	return null;
}

exports.parseJSON = parseJSON;

exports.parseFileToJson = function parseFileToJson(path, callback) {
	if (!path) {
		callback();
		return;
	}
	fs.readFile(getPath(path), {encoding: 'utf8'}, function(err, data) {
		
		callback(err, (data = data && data.trim()) && parseJSON(data));
	});
};

function getContentType(contentType) {
	if (contentType && typeof contentType != 'string') {
		contentType = contentType['content-type'] || contentType.contentType;
	}
	
	if (typeof contentType == 'string') {
		contentType = contentType.toLowerCase();
		if (contentType.indexOf('javascript') != -1) {
	        return 'JS';
	    }
		
		if (contentType.indexOf('css') != -1) {
	        return 'CSS';
	    }
		
		if (contentType.indexOf('html') != -1) {
	        return 'HTML';
	    }
		
		if (contentType.indexOf('json') != -1) {
	        return 'JSON';
	    }
		
		if (contentType.indexOf('text/') != -1) {
	        return 'TEXT';
	    }
		
		if (contentType.indexOf('image') != -1) {
	        return 'IMG';
	    } 
	}
	
	return null;
}

exports.getContentType = getContentType;

function supportHtmlTransform(headers) {
	if (getContentType(headers) != 'HTML') {
		return false;
	}
	
	var contentEncoding = toLowerCase(headers && headers['content-encoding']);
	//chrome新增了sdch压缩算法，对此类响应无法解码
	return !contentEncoding || contentEncoding == 'gzip' || contentEncoding == 'deflate';
}

exports.supportHtmlTransform = supportHtmlTransform;

function getPipeZipStream(headers) {
	var pipeStream = new PipeStream();
	switch (toLowerCase(headers && headers['content-encoding'])) {
	    case 'gzip':
	    	pipeStream.addHead(zlib.createGunzip());
	    	pipeStream.addTail(zlib.createGzip());
	      break;
	    case 'deflate':
	    	pipeStream.addHead(zlib.createInflate());
	    	pipeStream.addTail(zlib.createDeflate());
	      break;
	}
	
	return pipeStream;
}

exports.getPipeZipStream = getPipeZipStream;

function getPipeIconvStream(headers, plainText) {
	var pipeStream = new PipeStream();
	var charset = plainText ? null : getCharset(headers['content-type']);
	
	function pipeTransform() {
		var stream = new PipeStream();
		stream.addHead(iconv.decodeStream(charset));
		stream.addTail(iconv.encodeStream(charset));
    	return stream;
	}
	
	if (charset) {
		pipeStream.add(pipeTransform());
	} else {
		pipeStream.addHead(function(res, next) {
			var passThrough = new PassThrough();
			var decoder = new StringDecoder();
			var content = '';
			
			res.on('data', function(chunk) {
				if (!charset && !plainText) {//如果没charset
					content += decoder.write(chunk);
					charset = getMetaCharset(content);
					setTransform();
				}
				passThrough.write(chunk);
			});
			
			res.on('end', function() {
				if (!charset) {
					content += decoder.end();
					charset = content.indexOf('�') != -1 ? 'gbk' : 'utf8';
					setTransform();
				}
				passThrough.end();
			});
			
			function setTransform() {
				if (charset) {
					next(passThrough.pipe(pipeTransform()));
				}
			}
			
		});
	}

	return pipeStream;
}

exports.getPipeIconvStream = getPipeIconvStream;

function toLowerCase(str) {
	return str && str.trim().toLowerCase();
}

exports.toLowerCase = toLowerCase;

var CHARSET_RE = /charset=([\w-]+)/i;
var META_CHARSET_RE = /<meta\s[^>]*\bcharset=(?:'|")?([\w-]+)[^>]*>/i;

function getCharset(str, isMeta) {
	
	return _getCharset(str);
}

function getMetaCharset(str) {
	
	return _getCharset(str, true);
}

function _getCharset(str, isMeta) {
	var charset;
	if ((isMeta ? META_CHARSET_RE : CHARSET_RE).test(str)) {
		charset = RegExp.$1;
		if (!iconv.encodingExists(charset)) {
			charset = null;
		}
	}
	
	return charset;
}

exports.getCharset = getCharset;
exports.getMetaCharset = getMetaCharset;



