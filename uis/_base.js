// UNCLASSIFIED 

/**
 * @module base
 * The base client modules is used by Totem frameworks (grids, models, guides, etc) to support 
 * [Totem's content management](/skinguide.view)nc function. This module is typically used as follows:
 *
 * 		BASE.start( { key: value options .... }, contentWidget => { ... } )
 * 
 * See the BASE.start() method for further information.
 * */

const { isString, isArray, isFunction, typeOf } = BASE = {
	
	Log: console.log,
	
	typeOf: obj => obj.constructor.name,
	isString: obj => obj.constructor.name == "String",
	isNumber: obj => obj.constructor.name == "Number",
	isArray: obj => obj.constructor.name == "Array",
	isObject: obj => obj.constructor.name == "Object",
	isDate: obj => obj.constructor.name == "Date",
	isFunction: obj => obj.constructor.name == "Function",
	isError: obj => obj.constructor.name == "Error",
	
	isEmpty: (opts) => {
		for ( var key in opts ) return false;
		return true;
	},
	
	Copy: (src,tar,deep) => {
	/**
	 @method copy
	 @member BASE
	 @param {Object} src source hash
	 @param {Object} tar target hash
	 @param {String} deep copy key 
	 @return {Object} target hash
	 
	 Copy source hash to target hash; thus Copy({...}, {}) is equivalent to new Object({...}).
	 If a deep deliminator (e.g. ".") is provided, src  keys are treated as keys into the target thusly:
	 
	 		{	
	 			A: value,			// sets target[A] = value
	 
	 			"A.B.C": value, 	// sets target[A][B][C] = value
	 
	 			"A.B.C.": {			// appends X,Y to target[A][B][C]
	 				X:value, Y:value, ...
	 			},	
	 
	 			OBJECT: [ 			// prototype OBJECT (Array,String,Date,Object) = method X,Y, ...
	 				function X() {}, 
	 				function Y() {}, 
	 			... ]
	 
	 		} 
	 
	 */
		for (var key in src) {
			var val = src[key];

			if (deep) 
				switch (key) {
					case Array: 
						val.extend(Array);
						break;

					case "String": 
						val.extend(String);
						break;

					case "Date": 
						val.extend(Date);
						break;

					case "Object": 	
						val.extend(Object);
						break;

					/*case "Function": 
						this.callStack.push( val ); 
						break; */

					default:

						var 
							keys = key.split(deep), 
							Tar = tar,
							idx = keys[0];
						
						for (  // index to the element to set/append
								var n=0,N=keys.length-1 ; 
								n < N ; 
								idx = keys[++n]	) 	
								
							if ( idx in Tar ) 
								Tar = Tar[idx];
							else
								Tar = Tar[idx] = new Array();

						if (idx)  // set target
							Tar[idx] = val;

						else  // append to target
						if (val.constructor == Object) 
							for (var n in val) 
								Tar[n] = val[n];

						else
							Tar.push( val );
				}
			
			else
				tar[key] = val;
		}

		return tar;
	},

	Each: (src,cb) => {
	/**
	 * @method each
	 * @member BASE
	 * @param {Object} src source hash
	 * @param {Function} cb callback (idx,val, isLast) returns true or false to terminate
	 * 
	 * Enumerates src with optional callback cb(idx,val,isLast) and returns isEmpty.
	 * */
		var 
			keys = Object.keys(src),
			last = keys.length-1;

		if (cb)
			keys.forEach( (key,idx) => cb(key, src[key], idx == last ) );

		return keys.length==0;
	},
	
	Ajax: function ( method, async, url, cb , body, kill ) {
		var req = ((window.XMLHttpRequest)  			// get a request handle
				? new XMLHttpRequest()
				: new ActiveXObject("Microsoft.XMLHTTP"));

		req.onreadystatechange = function() { 				// Set the callback
			if (req.readyState==4 && req.status==200) 	// Service completed 
				if (cb) 			// pass response to callback
					if ( cb( req.responseText ) ) 	// test callback returned status
						if (kill) kill();  // kill the document if cb returns true
		};

		req.open(method, url, async); // start request
		if (body)
			req.send(JSON.stringify(body));  	// end request
		else
			req.send();  // end request
	},
	
	Fetch: function (opts, cb) {
	/**
	@method BASE.Fetch
	Callback cb(recs, svg) with a d3 svg dom target, and the records recs = [rec, ...] that
	were loaded from the source path 
	
		opts.ds = "/src?x:=STORE$.x[$KEY]&y:=STORE$.y[$KEY]..." 
	
	as updated by optional KEY dom-inputs:
	
		opts.KEY = [ ARG, ... ].TYPE   ||  function F( ... )
		
	where TYPE = range | list | select | ... specifies the type of dom input (with 
	ARGs = [min,max,...] ), or it used F("make",key) to make the dom input and 
	F("update",ds,val) to return an updated opts.ds source path given the input's 
	present value.
	
	The global d3 must be available.
	
	@param {Object} opts source loading options {ds: "/path", ... }
	@param {Function} cb callback(recs)
	*/
		const {Log, Ajax} = BASE;

		function fetchData( path, opts ) {
			/* 
			There are problems with d3.json: 
				(1) d3 became version dependent as  v4+ uses (sometime flakey) promise structure
				(2) d3.json() fails when loading on a https thread
			Thus we use ajax instead.
			*/
			if (false) 	{ // use d3 to fetch
				if ( d3.version.startsWith("3.") )	// older v3
					d3.json( path, (err, recs) => {
						if (err) 
							alert( err+"" );

						else {					
							if (opts.debug>1) alert("recs"+JSON.stringify(recs));

							if ( recs ) cb( isArray(recs) ? recs : [recs] , opts.svg );
						}
					});

				else // newer v4+
					d3.json( path ).then( recs => {
						if (opts.debug>1) alert("recs"+JSON.stringify(recs));

						if ( recs ) cb( isArray(recs) ? recs : [recs] , opts.svg );
					});
			}
			
			else 
				Ajax("GET", true, path, data => {
					if (opts.debug>1) alert("data"+data);

					if ( data = JSON.parse(data) ) cb( data , opts.svg );
							//cb( isArray(recs) ? recs : [recs] , opts.svg );
				});
		}
		
		if (d3) 
			if ( isString(opts) ) 
				fetchData( opts, {} );
		
			else {
				if (opts.debug) alert( "opts: "+JSON.stringify(opts) ); 

				d3.select("svg").remove();

				var 
					body = d3.select("body"),
					dims = opts.dims || { margin: null },
					margin = dims.margin || {top: 20, right: 90, bottom: 30, left: 90},
					svg = opts.svg = body.append("svg") 
									.attr('width', (dims.width || 1200) - margin.left - margin.right )
									.attr('height', (dims.height || 500) - margin.top - margin.bottom ),
									//.append("g")
									//	.attr("transform", dims.transform ? dims.transform.parseEMAC(dims) : ""),
				
									//.append("g")
									//.attr("transform", "translate(" + opts.dims.margin.left + "," + opts.dims.margin.top + ")"),

					widgets = opts.widgets || {},
					def = "0:100:1".split(":");

				var 
					body = d3.select("body"),
					url = opts.url || "",
					family = (opts.family || "").split(",");

				url.replace( /\/(.*).view[\?]?(.*)/, (str,view,query) => {
					family.forEach( (fam,n) => family[n] = fam.tag( `/${fam}.view?${query}` ) );
				});

				"p".d3tag(body,	{ html: family.join(" || ")	} );

				def.type = "range";

				opts.ds.replace(/\$(\w+)/g, (str,key) => {
					var 
						id = "_"+key,
						widget = widgets[key] || ( widgets[key] = def );

					if ( !widget.created ) {
						widget.created = true;

						if ( isFunction(widget) ) 
							var input = widget("make",key);

						else
							switch (widget.type) {
								case "range":
									var input = "input".d3tag(body, {type: "number", min: widget[0], max: widget[1], step: widget[2], value: widget[0], id:id} );
									break;

								case "select":
									var input = "select".d3tag(body, { value: widget[0], id:id} );

									widget.forEach( (arg,n) => input.insert("option").attr( "value", arg ).text( arg ) );
									break;

								case "list":
									var input = "input".d3tag(body, {type: "text", value: widget[0], id:id} );
									break;

								default:
									var input = null;
							}

						Log( `make widget ${key} id = ${id} type = ${widget.type}` );

						if (input) input.on("change", () => {
							//Log(input);
							var 
								el = input._groups[0][0], //v3 use input[0][0],		// dom is a major Kludge!
								value = el.value,
								id = el.id,
								key = id.substr(1),
								reg = new RegExp( `\\$${key}` , "g" ),
								path = isFunction(widget) ? widget("update", opts.ds,value) : opts.ds.replace( reg, value );

							//Log(input[0][0]);
							Log(`adjust ${key}=${value} ${opts.ds} -> ${path}`);
							fetchData( path, opts );
						});
					}
				});

				fetchData( opts.ds.replace(/\$\w+/g, "0"), opts );
			}

		else 
			alert("BASE.d3json needs the d3");
	},
	
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
			
			BASE.request( false, "POST", "/uploads.db", function (res) {
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
	
	request: function( async, method, url, cb , body) {

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
		
		req.open(method, url, async); 		// start request
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
		
	/*
	format: function(X,str) {
	/ **
	 * @method format
	 * 
	 * Format a string str containing ${X.key} tags.  The String wrapper for this
	 * method will optionaly provide plugins like X.F = {fn: function (X){}, ...}.
	 * * /

		try {
			var rtn = eval("`" + str + "`");
			return rtn;
		}
		catch (err) {
			return "[bad]";
		}

	}, */

	//hidden: "_",

	reprompt: function(req, cb) {
	/**
	 * method reprompt
	 * 
	 * Reprompts the client using the supplied cb(req, test(url)) callback 
	 * until req.tries has been reduced to 0, or until test(url) returns true
	 * to terminate the reprompt.  The dom is destroyed if req.tries is 
	 * exceeded, or if reprompt was terminated.
	 * */				
		var pass = false;
		
		cb( req, function test(url) {  // provide callback this prompt tester

			BASE.request( false, "GET", url,  function (res) {
				
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
	
	start: function(opts, cb) { // defines user information
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
				ip: "0.0.0.0", //navigator.totem.ip,
				location: "somewhere"	// navigator.totem.location
			});	
		}

		//console.log("base div=[%s] default=[%s] guard=[%s]",opts.START,div,opts.GUARD);

		// Allow content div to redirect starting div

		if (div = BASE.parser.START) 
			anchor = window.document.getElementById(div);
		
		if (anchor) {
			var widget = new WIDGET(anchor);
			
			if (widget.content) widget.content();
			
			if (cb) cb( widget );
		}
		else
			alert(`${BASE.alert} missing ${div} redirecting div`);
			
	}

}

Array.prototype.Extend = function (con) {
/**
 * @method Extend
 * @member ENUM
 * Extend the opts prototype with specified methods, or, if no methods are provided, 
 * extend this ENUM with the given opts.  Array, String, Date, and Object keys are 
 * interpretted to extend their respective prototypes.  
 * */
	this.forEach( function (proto) {
		//console.log("ext", proto.name, con);
		con.prototype[proto.name] = proto;
	});
};

[ // extend Date
	function toJSON () {
/**
 * @method toJSON
 * Return MySQL compliant date string.
 * @return {String} MySQL compliant version of this date
 */
	return this.toISOString().split(".")[0];
}
].Extend(Date);

[  // extend String
	function d3tag (d3el, attrs ) {
		var el = d3el.append(this);

		for (key in attrs) {
			//alert("tag "+key+" " + attrs[key]);
			switch (key) {
				case "text":
				case "html":
					el[key]( attrs[key] ); 
					break;
				case "xstyle":  // seems to crash so x-ed out
					el.style( attrs[key]); 
					break;
				default:
					el.attr(key, attrs[key]);
			}
		}

		return el;
	},
		
	/*
	String.prototype.parseURL = function (xx,pin) {

		function Format(X,S) {

			try {
				var rtn = eval("`" + S + "`");
				return rtn;
			}
			catch (err) {
				return "[bad]";
			}

		}

		var x = d = {};
		function xs(n) {
			if (n)
				if ( x = xx[n] )
					return x;
				else
					return x = xx[n] = xx.def || {};
			else
				return x;
		}

		function ds(n) {
			if (n)
				if ( d = xx[n] = DSLIST[n] ) 
					return d;
				else
					return d = xx[n] = xx.def || {};
			else
				return d;
		}

		if (pin) xx.pin = pin;

		return Format(xx,this);
	}
	*/
	function parseURL( query ) {
		var 
			parts = this.split("?"),
			path = parts[0] || "",
			parms = (parts[1] || "").split("&");
		
		parms.forEach( parm => {
			parm.replace( /(.*)(=)(.*)/g, (rem,lhs,op,rhs) => query[lhs] = rhs );
		});
		
		return path;
	},
	
	function parseJSON (def) {
		try {
			return JSON.parse(this);
		}
		catch (err) {
			return def ? isFunction(def) ? def(this) : def : null;
		}
	},

	function lisp(parms,cb,endcb) {
	/**
	 * @method lisp
	 * Parse this string using the {@link LISP#String Parser}.
	 *
	 * @param {Function} cb Callback(token,args) returns an arg for the next args list
	 * @return {Array} arg list returned by callback
	 */
		var ps = new LISP(this,parms,cb,endcb);
		return ps.args;
	},

	function tag(el,at) {
	/**
	@member String
	@method tag

	Tag url (el = ? || &) or html (el = html tag) with specified attributes.

	@param {String} el tag element = ? || & || html tag
	@param {String} at tag attributes = {key: val, ...}
	@return {String} tagged results
	*/

		if (!at) { at = {href: el}; el = "a"; }

		if ( el == "?" || el == "&" ) {  // tag a url
			var rtn = this;

			BASE.Each(at, (key,val) => {
				rtn += el + key + "=" + ( (typeof val == "string") ? val : JSON.stringify(val) ); 
				el = "&";
			});

			return rtn;	
		}

		else {  // tag html
			var rtn = "<"+el+" ";

			BASE.Each( at, (key,val) => rtn += key + "='" + val + "' " );

			switch (el) {
				case "embed":
				case "img":
				case "link":
				case "input":
					return rtn+">" + this;
				default:
					return rtn+">" + this + "</"+el+">";
			}
		}
	},

	function option () {
		if (this)
			try {
				return JSON.parse(this);
			}
			catch (err) {
				var 
					list = this.split(","),
					rng = this.split(":");
				
				return (list.length>1) : list : {min: rng[0], max: rng[1], del: rng[2]};
				/*
				var
					types = {
						":" : "range",
						"|" : "select",
						"," : "list"
					};
		
				for (var tok in types) 
					if ( args = this.split(tok) ) 
						if ( args.length > 1 || tok == "," ) {
							args.type = types[tok];
							//Log(tok, args);
							return args;
						}					
					
				return [this];
				*/
			} 
					
		else
			return null;
	},
	
	function parseEval($) {
	/**
	@member String
	@method parseEval

	Parse "$.KEY" || "$[INDEX]" expressions given $ hash.

	@param {Object} $ source hash
	*/
		try {
			return eval(this+"");
		}
		
		catch (err) {
			return err+"";
		}
	}
].Extend(String);

/*
Array.prototype.get = function (idx, key) {
	var keys = key.split(","), K = keys.length, rtns = [], recs = this, at = Object.keys(idx)[0], match = idx[at];

	if ( keys[0] && at )
		for (var n=0, N=recs.length; n<N; n++) {
			var rec = recs[n], rtn = {};

			if ( rec[at] == match )  {
				for (var k=0; k<K; k++) {
					var key = keys[k];
					rtn[key] = rec[key];
				}
				rtns.push(rtn);
			}
		}
}
*/
[ // extend Array
	function Each (cb) {
	/**
	 * @method Each
	 * Enumerate with callback
	 * @param {Object} cb callback (index,value) returns true to terminate
	*/
		var N = this.length;
		for (var n=0;n<N;n++) if (cb(n,this[n])) return true;
		return false;
	},

	function hashify (rtn, key) { 
	/**
	* @method hashify
	* @public
	* Build map hash from data records.
	* @param {Array} recs records to map
	* @param {Object} rtn hash to return
	* @param {String} idx index into record
	*/
		if (key) 
			this.forEach( (rec) => {
				rtn[rec[key]] = true;
			});

		else
			this.forEach( (rec,n) => {
				rtn[rec] = n+1;
			});

		return rtn;
	}
].Extend(Array);

function LISP(text,parms,cb,fincb) {	// list processing
/**
@constructor
Construct and execute the list processor against supplied text, returning an
aray of arguments corresponding to callbacks on Each token.
 
text = "token(token,token, ... token(token, ...))" where token = [Name, 
NameIndex, Name*, Name*Count] returns the Name parm, all parms starting 
with Name, the parm[Index], and the parms Name0-NameCount-1.
 
@param {String} text string to be parsed.
@param {Object} parms hash of parameter token keys
@param {Function} cb callback (token,args,depth,asm) returns arg hash for given token, args list (when a token call), and destination assmembly at given call depth.
@param {Function} fincb final callback (asm,depth,count) for assembly at given depth in all count assemblies
@return {Array} args returned by cb callback
 */
	
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
	this.args = this.lisp(cb,fincb);
}

[ // extend LISP
	function tokens (tok) { 
/**
* @method tokens
*/
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
},
	
	function lisp (cb,fincb) { 
/**
 * @method lisp
 * Parse this string from current position with callbacks on every token.
 * @param {Function} cb callback(token,[args]) returns an arg.
 * @return {Array} arg array corresponding to Each arg returned by cb 
 */ 
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
				
				args.push(cb(tok,this.lisp(cb),depth,asm));
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
].Extend(LISP);

[	// extend HTMLDivElement
	function Each (cb) {
	var nodes = this.childNodes;
	
	for (var n=0,N=nodes.length; n<N; n++) 
		if ( cb(n,nodes.item(n)) ) return true;
		
	return false;
}
].Extend( HTMLDivElement );

function DS(anchor) {   // to be overridden by client
}

function ANCHOR(id,attr,children) { // creates a new anchor to accept a new widget
	this.id = id;
	this.getAttribute = function (idx) { return attr[idx]; };
	this.setAttribute = function (idx,val) { attr[idx] = val; };
	this.childNodes = children;
	this.nodeName = "DIV";
	//this.Each = function () {};
}

function WIDGET (Anchor) {
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
	var This = this;
	var UIs = this.UIs = [];
	var HTML = "";
	var opts = BASE.parser;
	
	this.id = Anchor.id;
	this.name = this.class = Anchor.getAttribute("class") || "";	
		
	//console.log("widget id.name=", this.id+"."+this.name);
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
	Each(opts.LISTS, function (key,def) {
		var val = Anchor.getAttribute(key);
		//console.log(key,val,def);
		This[key] = val ? val.split(",") : def;
		//console.log([This.name,key,This[key]+""]);
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
	this.dock = this.sorts ? (this.dock||"left").replace("head","left") : this.dock;
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

	var children = Anchor.childNodes;
	//console.log("widget childs=", children);
	if ( children )
		for (var n=0, N=children.length; n<N; n++) {	// No! You cant use Each on childNodes - they are not really an Array
			//console.log(`widget n=${n}`, children[n] ? true : false);
			var childAnchor = children[n]; 
			if ( childAnchor ) {
				switch (childAnchor.nodeName) {
					/*
					case "ISHTML":
						HTML += childAnchor.innerHTML;
						break;
					*/

					case "DIV":

						var 
							widget = new WIDGET(childAnchor),
							proto = widget[widget.id];

		// console.log("div id.name="+widget.id+"."+widget.name, "title="+widget.title, "widget=",widget, "route=", proto);

						if ( proto ) {
		//console.log(`div route id.name=${widget.id}.${widget.name}`);
							widget[widget.id]();  // JS gets "wrong this" if we use proto() directly, so call the "long way"
							if (widget.UI) UIs.push( widget.UI );
						}
						else
						if (widget.default) {		// widget has a default() method to initialize it
		//console.log(`div default id.name=${widget.id}.${widget.name}`);
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

					/*
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
					*/

					default:
						if (childAnchor.innerHTML) 
							HTML += childAnchor.innerHTML.tag(childAnchor.nodeName,{});
				};

				if (opts.NIXHTML) childAnchor.innerHTML = "";
			}
		}

	//alert(`DDing ${this.name}`);
	this.Data = new DS(Anchor);
	this.Data.Widget = this;
	this.HTML = HTML;
}

[	// extend WIDGET
	function status (oper,msg) {
/**
* @method status
*/
		// Set dom.disable_window_status_change = false in FF about:config to get window.status to work
		if (this.trace)
			//window.status = oper+" "+this.name+" "+(msg||"");
			console.log(oper+" "+this.name+" "+(msg||""));
	}
].Extend(WIDGET);

// UNCLASSIFIED
