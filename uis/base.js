// UNCLASSIFIED 

/**
 * @module base
 * The base client modules is used by all Totem's framework modules (grids, models, guides, etc) to support 
 * [Totem's content management](/skinguide.view)nc function. This module is typically used as follows:
 *
 * 		BASE.start( { options .... }, function cb(content widget) { ... } )
 * 
 * See the BASE.start() method for further information.
 * */
 
var BASE = {
	
	alert: "Skinning error: ",
	
	socketio: null,
	
	trace: function (state,req) { 
		alert(`${state}>`+JSON.stringify(req)); 
	},
	
	bodyAnchor: null,
	
	/*syncReq: function (method, path, cb) {

		var req = ((window.XMLHttpRequest) 
			? new XMLHttpRequest()
			: new ActiveXObject("Microsoft.XMLHTTP"));

		req.onreadystatechange = function() {
			if (req.readyState==4) 
				if (req.status==200) {							// Service completed 				
					cb( req.responseText );
				}
		};

		req.open(method, path, false); 
		req.send( );
	},*/

	uploadFile: function () {
		var files = document.getElementById("uploadFile").files,
			 Files = [];
		
		for (var n=0,N=files.length; n<N; n++) 
			Files.push({
				name: files[n].name,
				type: files[n].type,
				size: files[n].size
			});

		//var file = files[0]; for (var n in file) alert(n+"="+file[n]);
		//alert(JSON.stringify(Files));
			
			BASE.syncReq("POST", "/uploads.db", function (res) {
				alert(res);
			}, {
				//name: file.name,
				owner: BASE.user.client,
				classif: "TBD",
				tag: "upload",
				geo: BASE.user.location,
				files: Files
			});		
	},
	
	syncReq: function( method, url, cb , body) {

		var req = ((window.XMLHttpRequest)  			// get a request handle
				? new XMLHttpRequest()
				: new ActiveXObject("Microsoft.XMLHTTP"));
				
		req.onreadystatechange = function() { 				// Set the callback
			if (req.readyState==4 && req.status==200) {	// Service completed 
				if ( cb( req.responseText ) ) {  // kill the document if cb returns true
					
					if (BASE.bodyAnchor)
						BASE.bodyAnchor.innerHTML = "";			
				}
			}
		};
		
		req.open(method, url, false); // start request
		if (body)
			req.send(JSON.stringify(body));  							// end request
		else
			req.send();
	},
		
	/**
	 * @cfg {Object} socketio
	 * Socketio creates a virtual route "/socket.io/socket.io.js" on the 
	 * server which clients access using a <script src="/socket.io/socket.io.js"> tag.  The socket.io.js
	 * then defines an io hash for socketio connections.  Use SOCKET_PATH = "" to force AutoDiscovery.
	 * Because io.connect does not implement a callback, the server must delay its join request to give 
	 * the client time time to establish its join response.  Thus, do not place an alert() immediately after 
	 * the io.connect as this will cause the join request to get dropped.
	 * */
	sockets: {   //< use start(opts) to extend with complete crude interface
	},
	
	mergekey: null, //"merge",

	user: {		//< start(opts) updates this from attributes on startDIV
		client: "guest",		// default client name until socketio fixes
		//guard: "",				// skin password guard
		source: "tbd",			// default client view until socketio fixes
		org:"", 				// organization for table guard ("" disables)
		location: 'POINT(0 0)',	// default location
		retries: 5 				// default max challenge retries if none provided by challenger
		//content: null,	 					// topmost EXTJS component set on render
		//qos:1,								// default QoS
		//message: "",						// challenge for client
		//riddles: 0, 
		//geolocate : false, 		// enable geolocation
	},
		
	//render: null,
	
	parser: { 	//< start(opts) revises with opts. 
		NIXHTML : false,
		SWITCHES : { },
		DEFAULT: { },
		ATTRS : { },
		PARMS : { },
		LISTS : { }
	},
		
	/**
	 * @method format
	 * 
	 * Format a string str containing ${X.key} tags.  The String wrapper for this
	 * method will optionaly provide plugins like X.F = {fn: function (X){}, ...}.
	 * */
	format: function(X,str) {

		try {
			var rtn = eval("`" + str + "`");
			return rtn;
		}
		catch (err) {
			return "[bad]";
		}

	},

	//hidden: "_",

	/**
	 * method reprompt
	 * 
	 * Reprompts the client using the supplied cb(req, test(url)) callback 
	 * until req.tries has been reduced to 0, or until test(url) returns true
	 * to terminate the reprompt.  The dom is destroyed if req.tries is 
	 * exceeded, or if reprompt was terminated.
	 * 
	 * */
	reprompt: function(req, cb) {
						
		var pass = false;
		
		cb( req, function test(url) {

			BASE.syncReq( "GET", url,  function (res) {
				
				switch (res) {
					case "pass":
						if (BASE.fuse) clearInterval(BASE.fuse);
						pass = true; return false;

					case "fail":
						if (BASE.fuse) clearInterval(BASE.fuse);
						pass = false; return true;

					case "retry":
					default:

						if (--req.tries) {  // that's right - must recusively call
							pass = BASE.reprompt(req, cb);
							return false;
						}
						else {
							pass = false;
							return true;
						}
				}
			});

		});
		
		return pass;
	},
		
	startDIV: "content",			//< div where start() begins parsing the dom
	
	/**
	 * @method start
	 * @param {Object} opts BASE options
	 * @param {Function} cb callback(content widget)
	 * 
	 * Parses the dom using the BASE.parse options and provides a socketio crude 
	 * (select,delete,update,insert,execute) interface on BASE.sockets.  The 
	 * default BASE.parser and BASE.sockets are typially overridden by the 
	 * optional opts hash.
	 * 
	 * The parser renders all jade widgets from the BASE.startDIV and will callback 
	 * to cb(widget) with the widget at BASE.startDIV.  This starting DIV may contain
	 * query, icons, start, client, and guard attributes to initialize itself.  During
	 * this parsing process, each widget is expected to define its UI (e.g. an ExtJS 
	 * component) and will receive a list of its dependent UIs (e.g. an ExtJS items list).
	 * 
	 * The sockets interface takes io(req) callbacks and are utilized if a socketio 
	 * interface is povided by the server.
	 * */

	start: function(opts, cb) { // defines user information
		
		// Get default div anchor for parse
		
		if (opts) Copy(opts, BASE);
			
		var div = BASE.startDIV,
			anchor = window.document.getElementById(div || "content");

		if (!anchor) 
			return alert(`${BASE.alert} missing ${div} starting div`);
			
		// Check for guarded views
		
		//if ( anchor.getAttribute("guard") != (opts.GUARD || "") )
		//	return alert(`${BASE.alert} skin is password protected `+[anchor.getAttribute("guard"),opts.GUARD] );
		
		// Retain session parameters
		

		BASE.bodyAnchor = window.document.getElementsByTagName("body")[0];
		BASE.parser.QUERY = anchor.getAttribute("query"); 
		BASE.parser.ICONS = anchor.getAttribute("icons");
		BASE.parser.START = anchor.getAttribute("start");
		
		BASE.user.client = anchor.getAttribute("client");
		//BASE.user.guard = anchor.getAttribute("guard");
		BASE.user.source = anchor.getAttribute("source");
		BASE.user.location = anchor.getAttribute("location");		
		//alert("user="+BASE.user.client+" "+BASE.user.source);
		
		if (io) {
			BASE.socketio = io(); // issues a GET on /socket.io to connect

			for (var n in BASE.sockets) 
				BASE.socketio.on(n, BASE.sockets[n]);
			
			BASE.socketio.emit("select", {
				client: BASE.user.client,
				message: "can I join please?",
				ip: navigator.totem.ip,
				location: navigator.totem.location
			});	
		}

		//console.log("base div=[%s] default=[%s] guard=[%s]",opts.START,div,opts.GUARD);

		// Allow content div to redirect starting div

		if (div = BASE.parser.START) 
			anchor = window.document.getElementById(div);
		
		if (anchor) {
			var widget = new WIDGET(anchor);
			
			if (widget.content)
				widget.content();
			
			if (cb) cb( widget );
		}
		else
			alert(`${BASE.alert} missing ${div} redirecting div`);
			
	}

}

/**
* @class Date
*/

/**
 * @method toJSON
 * Return MySQL compliant date string.
 * @return {String} MySQL compliant version of this date
 */
Date.prototype.toJSON = function () {
	return this.toISOString().split(".")[0];
}

/**
* @class String
*/

/**
 * @method parse
 * Parse this string using the {@link PARSE#String Parser}.
 *
 * @param {Function} cb Callback(token,args) returns an arg for the next args list
 * @return {Array} arg list returned by callback
 */
String.prototype.parse = function (parms,cb,endcb) {
	var ps = new PARSE(this,parms,cb,endcb);
	return ps.args;
}

String.prototype.indent = function (tag,at) {	
	if (tag) 
		if (at)
			return tag + "(" + BASE.joinify(at) + ")" + "\n\t" + this.split("\n").join("\n\t");
		else
			return tag + "\n\t" + this.split("\n").join("\n\t");
	else
		return "\t" + this.split("\n").join("\n\t");
}
	
/**
* @method tag
* Returns an html tag of the specified element and class.
* @param {String} el html element (e.g. div, ul)
* @param {String} cl html class
* @return {String} html tag
*/
String.prototype.tag = function tag(el,at) {
		
	if (el.constructor == String) {
		var rtn = "<"+el+" ";

		if (at)  
			for (var n in at) rtn += n + "='" + at[n] + "' ";

		switch (el) {
			case "embed":
			case "img":
			case "link":
				return rtn+">" + this;
			default:
				return rtn+">" + this + "</"+el+">";
		}
		//return rtn+">" + this + "</"+el+">";
	}
	else {
		var rtn = this;

		for (var n in el) rtn += "&" + n + "=" + el[n];
		return rtn;
	}

}

/**
* @class Array
*/

/**
 * @method hashify
 *
 */
Array.prototype.hashify = function (val) {
	var rtn = new Object();
	var N = this.length;

	if (val)
		for (n=0;n<N;n++) rtn[this[n][val]] = n;
	else
		for (n=0;n<N;n++) rtn[this[n]] = n;
	
	return rtn;
}

/**
 * @method Each
 * Enumerate with callback
 * @param {Object} cb callback (index,value) returns true to terminate
*/
Array.prototype.Each = function (cb) {
	var N = this.length;
	for (var n=0;n<N;n++) if (cb(n,this[n])) return true;
	return false;
}

/**
* @method listify
* @public
* Return an array corresponding to the supplied hash
* @param {Object} hash supplied hash of values
* @return {Array} array such that return[hash[n]] = n
*/
/*function listify(hash) {
	var len = 0;
	for (var n in hash) if (hash[n]>len) len = hash[n];
	var rtn = new Array(len+1);
	for (var n in hash) rtn[hash[n]] = n;
	return rtn;
}*/

/**
* @method hashify
* @public
* Build map hash from data records.
* @param {Array} recs records to map
* @param {Object} rtn hash to return
* @param {String} idx index into record
*/
function hashify(recs) { 
	rtn = {};
	
	recs.Each( function (n,rec) {
		rtn[rec] = n;
	});
	
	return rtn;
}

/**
* @method listify
* @public
* Build data records from a hash.
* @param {String} idxkey index key name
* @param {String} valkey value key name
* @param {hash} input input key-value hash
* @return {Array} output records
*/
function listify(hash,idxkey,valkey) {
	var list = [];
	var n = 0;
	
	if (idxkey)
		for (var idx in hash) {
			rec = {ID:n++};
			rec[idxkey] = idx;
			rec[valkey] = hash[idx];
			list.push( rec );
		}
	else
		for (var idx in hash) 
			list.push(idx);
			
	return list;
}

function joinify(hash, list, cb) {
	var rtn = [];

	for (var n in hash) 
		if (n)
			if (hash.hasOwnProperty(n)) 
				rtn.push( cb ? cb(n,escape(hash[n])) : n + "=" + escape(hash[n]) );
	
	return rtn.join(list || ",");
}

/**
 * @class PARSE
 * @constructor
 * Construct and execute the String Parser against supplied text, returning an
 * aray of arguments corresponding to callbacks on Each token.
 * 
 * text = "token(token,token, ... token(token, ...))" where token = [Name, 
 * NameIndex, Name*, Name*Count] returns the Name parm, all parms starting 
 * with Name, the parm[Index], and the parms Name0-NameCount-1.
 * 
 * @param {String} text string to be parsed.
 * @param {Object} parms hash of parameter token keys
 * @param {Function} cb callback (token,args,depth,asm) returns arg hash for given token, args list (when a token call), and destination assmembly at given call depth.
 * @param {Function} fincb final callback (asm,depth,count) for assembly at given depth in all count assemblies
 * @return {Array} args returned by cb callback
 */
function PARSE(text,parms,cb,fincb) {
/**
 * @property {String}
 * String to parse
 */
	this.text = text;
/**
 * @property {Number}
 * Current position in parse string
 */
	this.pos = 0;
/**
 * @property {Number}
 * Length of parse string
 */
	this.len = text.length;
/**
 * @property {Object}
 * An (assumed static) hash of parameter names for lookups or null (for no lookups)
 */
	this.parms = parms;
/**
 * @property {Array}
 * An array of assemblies for cb callback to deposit its artifacts at Each depth.
 */
	this.asms = [new Array()];
/**
 * @property {Array}
 * An array of args returned by calls to cb
 */
	this.args = this.parse(cb,fincb);
}

/**
* @method tokens
*/
PARSE.prototype.tokens = function (tok) { 
	var toks = tok.split("*");
	var parms = this.parms;
	
	if (toks.length > 1) {	// admit implied tokens if wild cards present
		var arg = toks[0];
		var cnt = toks[1];
		var toks = [];
		
		if (cnt) {	// take all tokens arg0 ...  argN-1 unconditionally
			var N = Number(cnt);			
			for (var n=0;n<N;n++) toks.push(arg+n);
		}
		else
		if (arg) {
			if (parms) {	// admit token if in parms hash
				for (var n in parms) 
					if (n.indexOf(arg) == 0) 
						if ("0123456789".indexOf(n[arg.length]) >= 0) 
							toks.push(n);
			}
			else 			// always admit token if no parms hash
				toks.push(n);
		}
	}
	
	return toks;
}

/**
 * @method parse
 * Parse this string from current position with callbacks on every token.
 * @param {Function} cb callback(token,[args]) returns an arg.
 * @return {Array} arg array corresponding to Each arg returned by cb 
 */ 
PARSE.prototype.parse = function (cb,fincb) { 
	var tok = "", test, args = new Array();
	var This = this;
	var asms = this.asms;
	var depth = asms.length;
	var asm = asms[depth-1];
	
	while (this.pos<this.len) {	
		test = this.text[this.pos++];
		
		switch (test) {
			case "(":
				depth++;
				if (depth >= asms.length) asms.push( new Array() );
				
				args.push(cb(tok,this.parse(cb),depth,asm));
				tok = "";
				break;
				
			case ")":
			
				if (tok) 
					This.tokens(tok).Each( function (n,tok) {
						args.push(cb(tok,null,depth,asm));
					});
					
				depth--;
				asm = this.asms[depth];

				return args;
				
			case ",":
				if (tok) 
					This.tokens(tok).Each( function (n,tok) {
						args.push(cb(tok,null,depth,asm));
					});
					
				tok =  "";
				break;
				
			default:
				tok += test;
		}
	}
		
	if (tok) 
		This.tokens(tok).Each( function (n,tok) {
			args.push(cb(tok,null,depth,asm));
		});
	
	if (fincb) 
		asms.Each( function (n,asm) {
			return fincb(asm,n,asms.length);
		});
		
	return args;
}

HTMLDivElement.prototype.Each = function (cb) {
	var nodes = this.childNodes;
	
	for (var n=0,N=nodes.length; n<N; n++) 
		if ( cb(n,nodes.item(n)) ) return true;
		
	return false;
}

function DS(anchor) {   // to be overridden by client
}

function ANCHOR(id,attr,children) { 
	this.id = id;
	this.getAttribute = function (idx) { return attr[idx]; };
	this.setAttribute = function (idx,val) { attr[idx] = val; };
	this.childNodes = children;
	this.nodeName = "DIV";
	//this.Each = function () {};
}

/**
 * @class WIDGET
 * @constructor
 * 
 * Constructs a widget (its HTML, UIs, and Dataset) from the skin under the 
 * current document Anchor.  The widget's PROTOtype method is called to define
 * the widget's UI (or null if there is none).  A skin look like this:  

		#PROTO.NAME(...)
			#PROTO.NAME(...)
			:
			#PROTO.NAME(...)
				#PROTO.NAME(...)
				:

			#PROTO.NAME(...)
				:

				TAG(...)
					inner html

				ishtml 
					widget-free html
					
				inline(src="FILE.TYPE", w="WIDTH", h="HEIGHT")

				:FILTER
					markdown text

	where  
	
	+ NAME uniquely identifies the widget
	
	+ FILTER specifies a [markdown](https://github.com/jstransformers) | markdown-it | supermarked | babel | less | coffee-script
	
	+ ... represents attrbutes (a no-prefixed attribute disables the attribute)
	
	+ : represents HTML TAGs or 
	
	+ : represents a [Jade program flow](http://jade-lang.com/tutorial/)
	
	+ FILE.TYPE inlines html with an appropriate link = [project](/project.view), [engine](/engines.view),
	[files](/files.view) for the specifed TYPE = db, py | js | mat | ... , jpg | png | ico | ... of FILE.
*/
function WIDGET (Anchor) {
	var This = this;
	var UIs = this.UIs = [];
	var HTML = "";
	var opts = BASE.parser;
	
	this.id = Anchor.id;
	this.name = Anchor.getAttribute("class") || "";	
		
/**
 * @property {String}
 * Anchor DOM anchor ties to this data skin
 */
	this.anchor = Anchor;

/**
* @property {Object}
* Various values for all attributes specfied in opts.ATTRS hash
*/	
	Each(opts.ATTRS, function (n,v) {
		This[n] = Anchor.getAttribute(n) || v;
	});

/**
* @property {Boolean}
* Various states for all switched specfied in opts.SWITCHES hash
*/
	Each(opts.SWITCHES, function (n,v) {
		This[n] = Anchor.getAttribute(n) ? true : v;
	});

/**
* @property {Array}
* Various array for all arrays specfied in opts.LISTS hash
*/
	Each(opts.LISTS, function (n,v) {
		var val = Anchor.getAttribute(n) || v;
		This[n] = val ? val.split(",") : [];
	});

/**
* @property {Object}
* Various values for all parameters specfied in opts.PARMS hash
*/			
	Each(opts.PARMS, function (n,v) {
		if ( val = Anchor.getAttribute(n) ) {
			This[v] = n;
			This[n] = val;
			//alert(n+"->"+v+"->"+val);
		}
	});	

/**
 * @property {Number[]}
 * Maximum [width,height] dimensions for this data skin
 */
 
	this.dims = (this.dims || "100%,100%").split(",");	
	this.title = Anchor.getAttribute("title") || this.name;

/**
 * @property {String}
 *UI title
 */

	Anchor.setAttribute( "title", this.title );
	//alert("widget "+this.name+"="+this.title);
	
	this.selects = this.title + " ... Select";
	
/**
* @property {Object}
* Menu component for specified menu attribute 
*/		
		
	this.Status = function (msg) { 	// Default statusing until widget fully defined
		alert(msg);
	}
	
//alert("Skinning "+this.name+" childs="+Anchor.childNodes);

	// No! You cant use Each on childNodes - they are not really an Array
	
	if (Anchor.childNodes)
	for (var n=0, N=Anchor.childNodes.length; n<N; n++) {
		var childAnchor = Anchor.childNodes[n];
		
//alert("skin "+this.name+" at child "+n+"=" + childAnchor.nodeName);
		
		switch (childAnchor.nodeName) {
			case "ISHTML":
				HTML += childAnchor.innerHTML;
				break;

			case "DIV":
			
				var widget = new WIDGET(childAnchor),
					route = widget[widget.id];
				
//alert("div id="+widget.id+" tit="+widget.title+" nam="+widget.name);

				if ( route ) {
//alert(`UIing ${widget.id}.${widget.name}`);
					widget[widget.id]();  // JS gets confused if we use route() to call a prototype
					if (widget.UI) UIs.push( widget.UI );
				}
				else
				if (widget.default) {
//alert(`Default UIing ${widget.id}.${widget.name}`);
					widget.default(); 
					if (widget.UI) UIs.push( widget.UI );
				}
				
				else
					alert(`${BASE.alert} no prototype for ${widget.id}.${widget.name}`);
				
				break;

			case "SCRIPT":
				break;
				
			case "#comment":
			case "#text":
				break;

			case "INLINE": 
							
				var	src = childAnchor.getAttribute("src") || "",
					parts = src.split("?")[0].split("."),
					//area = parts[0] || "uploads",
					//name = parts[1] || "file",
					type = parts[1] || "type",
					w = childAnchor.getAttribute("w") || 600,   	// width
					h = childAnchor.getAttribute("h") || 600,		// heigth
					g = childAnchor.getAttribute("g") || "goto",	// goto label
					a = childAnchor.getAttribute("a") || "Classif",	// file attribute
					s = childAnchor.getAttribute("s") || "",		// css style
					//src = `/${area}/${name}.${type}`,
					classif = ""; //"".tag("iframe",{src: "/"+a+"/"+src,width:200,height:25,class:s,scrolling:"yes",frameborder:0});

//alert(JSON.stringify(["inline",w,h,g,a,s,type,src]));

				switch (type.toUpperCase()) {
					case "JPG":
					case "PNG":
					case "ICO":

						HTML = "".tag("img", { src:src, width:w, height:h }) 
									+ classif
									+ g.tag("a", { href:"/files.view?option="+src });
						
						break;
						
					case "DB":
					
						HTML = "no support".tag("iframe", { src:src, width:w, height:h  })
									+ classif
									+ g.tag("a", { href:"/project.view?g="+name });
									
						break;

					case "VIEW":

						HTML = "no support".tag("iframe", { src:src+"?hold="+(childAnchor.getAttribute("hold")||0), width:w, height:h  })
									+ classif
									+ g.tag("a", { href:"/engines.view?name="+name });
						break;
						
					default:
					
						HTML = "".tag("iframe", { src: "/code"+src, width:w, height:h  })
									+ classif
									+ g.tag("a", { href:"/engines.view?name="+name, width:w, height:h });
							
				}

				childAnchor.innerHTML = HTML;
				
				break;
			
			default:
				if (childAnchor.innerHTML) 
					HTML += childAnchor.innerHTML.tag(childAnchor.nodeName,{});
		};
		
		if (opts.NIXHTML) childAnchor.innerHTML = "";
	}

	//alert(`DDing ${this.name}`);
	this.Data = new DS(Anchor);
	this.Data.Widget = this;
	this.HTML = HTML;
}

/**
* @method status
*/
WIDGET.prototype.status = function (oper,msg) {
	// Set dom.disable_window_status_change = false in FF about:config to get window.status to work
	if (this.trace)
		//window.status = oper+" "+this.name+" "+(msg||"");
		console.log(oper+" "+this.name+" "+(msg||""));
}

/**
 * @method Copy
 * @public
 * @param {Object} src source hash
 * @param {Object} tar target hash
 * @param {Function} cb callback(idx,val) returns true to drop
 * @return {Object} target hash
 * 
 * Shallow Copy of source hash under supervision of callback. If
 * a mergekey key is encountered, the Copy becomes a deep mergekey. 
 * If a constructor source key is encountered, the key's methods 
 * are added to the source's prototype.
 */
function Copy(src,tar,cb) {

	var mergekey = BASE.mergekey;
	
	/*if (mergekey)
		if (cb) {
			for (var key in src)  {
				var val = src[key];
				if ( !cb(key,val) ) 
					if (val == null) 
						tar[key] = val;
					else
					if (val.constructor == Object)
						if (mergekey in val) 
							Copy(val.mergekey, tar[key]);
						else
							tar[key] = val;
					else 
						tar[key] = val;
			}
		}
		else 
			for (var key in src) {
				var val = src[key];
				if (val == null) 
					tar[key] = val;
				else
				if (val.constructor == Object)
					if (mergekey in val) 
						Copy(val[mergekey], tar[key]);
					else
						tar[key] = val;
				else 
					tar[key] = val;
			}
	else */
		if (cb) 
			for (var key in src) 
				tar[key] = cb( key, src[key] );
		else 
			for (var key in src) 
				tar[key] = src[key];

	return tar;
}

function Clone(src,cb) {
	return Copy(src,{},cb);
}

/**
 * @method Each
 * @public
 * @param {Object} src source hash
 * @param {Function} cb callback (idx,val) returning true or false
 * 
 * Shallow enumeration over source hash until callback returns true.
 * */
function Each(src,cb) {
	
	if (src)
	switch (src.constructor) {
		case String:
		
			for (var n=0,N=src.length; n<N; n++) 
				if (cb(n,src.charAt(n))) return true;
				
			return false;
		
		case Array:

			for (var n=0,N = src.length;n<N;n++) 
				if (cb(n,src[n])) return true;
				
			return false;
		
		case Object:

			for (var n in src)  
				if (cb(n,src[n])) return true;
			
			return false;

		default:
		
			for (var n in src)  
				if (src.hasOwnProperty(n)) 
					if (cb(n,src[n])) return true;
			
			return false;
			
	}
}

String.prototype.format = function (req,plugin) {
	req.plugin = req.F = plugin || {};
	return BASE.format(req,this);
}

String.prototype.json = function (def) {
	try {
		return JSON.parse(this);
	}
	catch (err) {
		return def;
	}
}

// UNCLASSIFIED
