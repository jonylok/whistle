### v0.3.11

fix配置某些带端口号正则的时候可能导致系统奔溃的情况

### v0.3.12

fix如果请求包含content-length导致weinre无法注入的bug

### v0.4.0

1. 菜单 `Rules`、`Values`、`Weinre`，hover出现列表（原来需要点击才能出现列表）
2. 新增快捷键 `ctrl + /` 来注释（取消注释）选中的行
3. 新增 `css`、`html`、`js` 3个协议，分别用来注入css、js、html到html页面，或css代码到css文件，js代码到js文件的底部。这个与resPrepend、resBody、resAppend的区别是：系统会自动判断响应的类型来选择注入

### v0.4.1、v0.4.2

修改快捷键 `ctrl + /` 的小bug：没有选中，及从后往前选择会导致聚焦有点问题。

### v0.5.0

1. JSON对象的一种inline写法，可以直接写在协议的uri里面，形如： `protocol://name1=values&name2=value2&name3&name4=&name5=value5&nameN=valueN`
2. 加入了如果有大版本的更新，会自动提醒（一般有新功能加入或修复致命bug才会有大版本的更新）

bugFix:

修改了一些子匹配的问题，及urlParams，params可能无效的问题

### v0.5.1

修复：本地调试时，https的根证书可能被开发目录的根证书自动覆盖问题

### v0.5.2

新增：支持 www.qq.com resHeaders://(content-type=text/plain)格式

### v0.5.3

微调parseInlineJSON的实现 
  
### v0.5.4
### v0.5.5
 
新增支持配置模式：pattern operator-uri1 operator-uri2 ... operator-uriN （原来只支持operator-uri pattern1 pattern2 ... patternN）

这种情况下 `pattern` 和 `operator-uri1` 不能同时为形如这种形式的uri：`[http[s]|ws[s]://]www.example.com/*`，否则会忽略后面的 `operator-uri2 ... operator-uriN`

### v0.5.6

修复低版本的node在[拦截https](https://github.com/avwo/whistle/wiki/%E5%90%AF%E7%94%A8HTTPS)时，有可能产生的重复关闭server会抛出异常的情况

### <del>v0.5.7</del>

新增快捷键：`ctrl[command]+鼠标点击：快速打开rules设置的key(点击形如：`xxx://{key}` 的规则)在values中的位置(如果values中不存在对应的key，则会自动创建)，更多内容请参考：[界面操作](https://github.com/avwo/whistle/wiki/%E7%95%8C%E9%9D%A2%E6%93%8D%E4%BD%9C)

### v0.5.8

bugfix：修改v0.5.7版直接访问[http://local.whistlejs.com/index.html](http://local.whistlejs.com/index.html)脚本出错的问题

### v0.6.0

bugfix：修改了路径匹配可能多加一个 `/` 的问题

形如：

	http://www.test.com/index.html http://www.test.com:8888/index.html
	
	# http://www.test.com/index.html?query --> http://www.test.com:8888/index.html/?query
	
	
### v0.6.1

1. 新增了 `disable` 协议，用来禁用cache、cookie、referer、ua、timeout、csp，具体参考：[功能列表](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#%E7%9B%AE%E5%BD%95)
2. 纠正了解析[配置操作符](https://github.com/avwo/whistle/wiki/%E9%85%8D%E7%BD%AE%E6%A8%A1%E5%BC%8F#%E4%B8%89%E4%B8%AA%E6%93%8D%E4%BD%9C%E7%AC%A6%E7%9A%84%E4%BD%9C%E7%94%A8)使用拼接后url的问题
3. 原来通过filter启用HTTPS，推荐改用这种方式：[启用HTTPS](https://github.com/avwo/whistle/wiki/%E5%90%AF%E7%94%A8HTTPS)
	
	
### v0.6.2

1. 加入小版本更新时给出小提示
2. 添加 `disable` 的新功能：301、dnsCache、keepAlive、intercept
3. 新增 `reqReplace` 和 `resReplace` 两个功能：类似js字符串的 `replace` 方法，分别用来替换请求和响应的文本内容


### v0.6.3

 1. 新增`reqWriter`、`resWrite`分别用来把请求内容和响应内容写入到本地文件
 2. 新增`reqWriterRaw`、`resWriteRaw`分别用来把请求完整信息和响应的完整信息写入到本地文件（包括路径、协议、方法、响应状态码、头部、内容等）
 3. bugfix: 使用`reqReplace`改变了请求内容长度没有同步处理headers的content-length的问题
 4. 支持通过 `params` 替换上传表单的字段
 5. 对形如 `[a-z]:\*`、`[a-z]:/xxx`、`/xxx` 自动识别为 `file://...`
 
 	即：
 	
 		www.text.com/ /User/xxx # 或 www.text.com/ D:\workspace 
 		# 等价于
 		www.text.com/ file:///User/xxx # 或 www.text.com/ file://D:\workspace 
 		
### 0.6.4

 1. 修复使用log的时候，多次注入脚本导致console的时候会重复打印多次
 2. 增加repReplace、resReplace的缓存字符串大小
 
### 0.6.5

1. bugfix:
	
	修复前：
	
		/(.*):8899(\/.*)/ $1$2 
		
	结果：
		
		http://xxx:8899 http://http://xxx
		
	修复后：
	
		/(.*):8899(\/.*)/ $1$2 --> http://xxx:8899 http://xxx
		
### v0.6.6

新增 `exports` 功能，用于把请求导出到指定文件（如果该文件不存在，则会自动创建），每一行都是如下json对象（第一行可能为空）：

	{
		startTime: '请求的开始时间',
		dnsTime: 'dns结束时间',
		requestTime: '请求结束时间',
		responseTime: '开始响应的时间',
		endTime: '响应结束的时间',
		url: '请求的url',
		realUrl: '实际请求的url（一般设置了替换规则，才会有realUrl，否则不会显示该字段）',
		method: '请求使用的方法', 
		httpVersion: 'http版本号',
	    clientIp: '用户ip',
	    hostIp: '服务器ip',
	    reqError: '是否请求阶段出错',
	    reqSize: '请求内容的长度',
		reqHeaders: '请求头',
		reqTrailers: '请求的trailers',
		statusCode: '响应状态码',
		resError: '是否在响应阶段出错',
		resSize: '响应内容的长度',
		resHeaders: '响应头',
		resTrailers: '响应的trailers',
		rules: '匹配到的规则'
	}
	
### v0.7.0
1. 支持通过插件开启在网页的右下角显示访问的真实ip，需要安装最新版的Chrome插件：[https://github.com/avwo/whistle-for-chrome](https://github.com/avwo/whistle-for-chrome)
2. 支持`exportsUrl`，可以把匹配到的请求url导出到指定的文件
3. 新增功能`resCors://use-credentials`(等价于`resCors://enable`)，让语义更清晰
4. 新增更简洁的命令行命令 `w2`，新版的whistle同时支持`whistle xxx`和`w2 xxx`，如 `w2 start`、`w2 restart`、`w2 stop`、`w2 --help`等

### v0.7.1

新增 [dispatch](https://github.com/avwo/whistle/wiki/功能列表#dispatch) 协议，主要用途：某些情况需要我们根据用户的ip、或ua、或cookie等来动态决定匹配规则，这时可以利用 `dispatch` 来执行自定义脚本来修改url里面的请求参数从而修改请求的url，最后达到修改请求url匹配的规则的目的。

### v0.7.2

	bugfix: Cannot read property 'dist-tags' of null


### v0.8.0

1. 新增插件机制，可以很方便的自定义插件，并提供了平时开发中有用的插件作为例子，具体请参考请查看：[自定义whistle插件](https://github.com/avwo/whistle/wiki/%E8%87%AA%E5%AE%9A%E4%B9%89%E6%8F%92%E4%BB%B6)
2. 加入请求失败自动重试机制，减少请求出错的情况

### v0.8.1

1. whistle ui -> about -> 插件列表：插件列表显示按ascii码排序
2. 缓存[dispatch](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#dispatch)的script，提升速度
3. 新增[attachment](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#attachment)用于设置下载文件的响应头 `content-disposition: attachment; filename="attachment"`

### v0.8.2

1. 修复自定义插件不能获取[values]()的值，即 `pattern plugin://{key}` 无法正确获取ruleValue的问题
2. 限制自定义插件的名称不能与内置的协议名称冲突，如果冲突则该自定义插件将无效

### v0.9.0
1. **重要bugfix：**Fix https post数据时可能出现pending的问题
2. 新增[etag](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#etag)协议，用于修改请求头的etag
3. 支持通过`ua://`、`referer://`、`reqType://`、`resType://`等，把对应的字段置空

### v0.9.1
1. 新增[reqCharset](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#reqcharset)和[resCharset](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#rescharset)两个协议，分别用于快速修改请求、响应的编码
2. bugfix：修复可能出现请求出错的情况，https://github.com/nodejs/node/pull/4482

### v0.9.2

bugfix：修复keepAlive可能导致请求无法响应的问题

### v0.9.3

refactor: 限制starting的版本为0.1.1，后面发布的starting版本和现有的不兼容

### v0.9.4
1. feature: 加入 `disable://ajax`，用于删除请求头 `x-requested-with`
2. feature: 新增[accept](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#accept)用于修改请求头的accept字段 
3. feature: 加入插件开发过程中输出详细日志，[#3](https://github.com/avwo/whistle/issues/3)
4. feature: 新增菜单栏 -> Rules -> Setting -> Disable all rules的选项，用于禁用所有规则
5. refactor: 修改 `reqType`，`resType`的默认行为，如果`reqType`，`resType`没有带charset的时候，保留原有的charset
6. refactor: 新增详细的启动提示信息

### v0.9.5

refactor: 详细的启动提示信息兼容node v0.10.x

# 0.10.0

1. feat: 新增规则包，可以在插件加入全局及内部的规则包，详见：[自定义插件](https://github.com/avwo/whistle/wiki/%E8%87%AA%E5%AE%9A%E4%B9%89%E6%8F%92%E4%BB%B6)
2. feat: 新增`rawfile`、 `xrawfile`的功能，详见：[rule](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#%E7%9B%AE%E5%BD%95)
3. fix: 修复headers里面的set-cookie可能导致页面js出错的问题
4. refactor: 更新页面用到的react到最新版本，提升前端性能
5. fix: 如果插件的package.json格式有问题会导致无法自动加载插件
6. fix: 修复reqAppend、resAppend无效的问题

# 0.10.1
1. feat:新增Server Log，用于记录服务端的日志：Network -> Log -> Server
2. refactor: 调整log的加载逻辑，确保在打开Network -> Log前记录的log都能看到
3. fix: 修复[log](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#log)协议出现请求被gc的情况
4. fix: [log](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#log)可能导致页面出现的样式问题



### -
具体参考：[功能列表](https://github.com/avwo/whistle/wiki/%E5%8A%9F%E8%83%BD%E5%88%97%E8%A1%A8#%E7%9B%AE%E5%BD%95)
	



