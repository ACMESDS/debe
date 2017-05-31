// UNCLASSIFIED 

/**
 * @class debe
 * @requires child_process
 * @requires cluster
 * @requires child-process
 * @requires fs
 * @requires crypto

* @requires i18n-abide
 * @requires socket.io
 * @requires socket.io-clusterhub
 * @requires jade
 * @requires jade-filters
 * @requires markdown
 * @requires optomist

 * @requires flex
 * @requires totem
 * @requires engine
 */

function Trace(msg,arg) {
	
	if (msg.constructor == String)
		console.log("D>"+msg);
	else
		console.log("D>"+msg.sql);

	if (arg) console.log(arg);

	return msg;
}

var 									// globals
	SQLTYPES = {
		"varchar(32)": "t",
		"varchar(64)": "t",
		"varchar(128)": "t",
		"int(11)": "i",
		float: "n",
		mediumtext: "x",
		date: "d",
		datetime: "d"
	},		
	WINDOWS = process.platform == 'win32',		//< Is Windows platform
	CRUDE = {select:1,delete:1,insert:1,update:1,execute:1};

var 									// NodeJS modules
	CP = require("child_process"), 		//< Child process threads
	CLUSTER = require("cluster"), 		//< Support for multiple cores
	CRYPTO = require('crypto'), 		
	FS = require("fs"); 				//< NodeJS filesystem and uploads
	
var										// 3rd party modules
	OGEN = null, //require("officegen"), 	//< MS office generator
	LANG = require('i18n-abide'), 		//< I18 language translator
	ARGP = require('optimist'),			//< Command line argument processor
	TOKML = require("tokml"), 			//< geojson to kml concerter
	SKIN = require('jade');				//< using jade as the skinner
	
var 									// totem modules		
	ENGINE = require("engine"), 
	FLEX = require("flex"),
	TOTEM = require("totem");

var										// shortcuts and globals
	Copy = TOTEM.copy,
	Each = TOTEM.each;
	
var
	DEBE = module.exports = TOTEM.extend({
	
	builtins: {
		gaussmix: FLEX.execute.gaussmix
	},
		
	watch: "", //"public/uploads/", 
		
	"reqflags.traps." : {  //< trap ?_flag to reorder query/body parms
		save: function (req) {
			var cleanurl = req.url.replace(`_save=${req.flags.save}`,"");
			Trace(`PUBLISH ${cleanurl} AT ${req.flags.save}`);
			req.sql.query("INSERT INTO engines SET ?", {
				Name: req.flags.save,
				Enabled: 1,
				Engine: "url",
				Code: cleanurl
			});
		},
				
		browse: function(req) {	// folder navigator
			var query = req.query, flags = req.flags;
			query.NodeID = parseInt(query.init) ? "" : query.target || "";
			flags.nav = [query.NodeID, query.cmd];
			delete query.cmd;
			delete query.init;
			delete query.target;
			delete query.tree;
		},
		
		view: function (req) {   // correlate a ?_view=name flag to requested dataset
			req.sql.query("INSERT INTO openv.viewers SET ?", {
				Viewer: req.flags.view,
				Dataset: req.table
			});	
		}
	},
	
	"reqflags.edits.": {  //< intercept ?_flag=keys
		blog: function (keys,recs,req) {  	// blog on keys fields
			recs.each( function (n, rec) { 
				keys.each( function (m, key) {
					if (val = rec[key])
						if (val.constructor == String) 
							if (val.substr(0,2) == "//") 
								rec[key] = val.substr(2).render(req);
							
							else
							if (val.substr(0,1) == "/")
								rec[key] = "no iframes".tag("iframe",{src:val,width:1200,height:400});
							
							else
								rec[key] = (":markdown\n"+val).replace(/\n/g,"\n\t").render(req);
				});
			});
		},
		
		/*
		jade: function (keys,recs,req) {  	// jade markdown on keys fields

			recs.each( function (n, rec) { 
				keys.each( function (m, key) {
					rec[key] = "=$" + (rec[key]+"").render(req);
				});
			});
		},

		kjade: function (keys,recs,req) {  	// kludge jade markdown on keys fields

			recs.each( function (n, rec) {  
				keys.each( function (m, key) {
					rec[key] = (rec[key]+"").tag("iframe", {
						width: 400,
						height: 400,
						src: `/${req.table}.html?ID=${rec.ID}&_kjaded=${key}`
					});
					//console.log(rec[key]);
				});
			});
		},

		kjaderaw: function (keys,recs,req) {  // kludge jade markdown

			recs.each( function (n, rec) {
				var rtn = "";
				keys.each( function (m, key) {  
					rtn += (rec[key] + "").render(req);
				});
				recs[n] = rtn;
			});
		},
		
		mark: function (keys,recs,req) {  	// markdown keys fields
		
			recs.each( function (n, rec) {
				keys.each( function (m, key) {  
					rec[key] = 
`extends layout
append layout_body
	:markdown
		${rec[key] }` .render(req);
				});
			});
		},
		*/
		
		json: function json(keys,recs,req) {
			var id = 1;
			
			recs.each( function (n,rec) {
				var rtn = {ID: id++};
				
				keys.each( function (k,key) {
					var src = rec;
					key.split(".").each( function (k,idx) {
						if (src)
							if (k) 
								src = src[idx];

							else 
								try {
									src = JSON.parse( src[idx] || "null" );
								}
								catch (err) {
								}
					});
					
					rtn[key] = src;
				});
				
				recs[n] = rtn;
			});
		}
	},
	
	worker: {		//< reserved for worker endpoints defined on start
	},
	
	admitRule: null, 	//< admitRule all clients by default 	
		/*{ "u.s. government": "required",
		 * 	"us": "optional"
		 * }*/

	site: { 		//< initial site context

		get: function(recs, where, index, sub1, sub2) {
			var rtns = [];
			
			if (index && index.constructor == String) {
				var idx = {};
				index.split(",").each(function (n,key) {
					idx[key] = key;
				});
				index = idx;
			}
			
			recs.each(function (n,rec) {
				var match = true;

				if (where)
					for (var x in where) 
						if (rec[x] != where[x]) match = false;

				if (match) {
					if (sub2) {
						for (var idx in sub2) {
							var keys = sub2[idx];
							if ( rec[idx] )
								for (var key in keys)
									rec[idx] = (rec[idx] + "").replace("##" + key, keys[key]);
						}
					}

					if (sub1) {
						for (var idx in sub1) {
							var keys = sub1[idx];
							if ( rec[idx] )
								for (var key in keys)
									rec[idx] = (rec[idx] + "").replace("#" + key, keys[key]);
						}
					}
					
					if (index) {
						var rtn = new Object();
						for (var key in index) {
							var src = rec;
							key.split(".").each( function (k,idx) {
								src = src[idx];
							});
							rtn[ index[key] ] = src;
						}
						rec = rtn;
					}
					
					rtns.push( rec );
				}
			});
			
			return rtns;
		},
		
		json: function(recs) {  // dump dataset as json
			return JSON.stringify(recs);
		},
		
		show: function(recs) {	// dump dataset as html table
			function join(recs,sep) { 
				switch (recs.constructor) {
					case Array: 
						return this.join(sep);
					
					case Object:
						var rtn = [];
						for (var n in this) rtn.push(this[n]);
						return rtn.join(sep);
						
					default:
						return this;
				}
			}
			
			function table(recs) {  // generate an html table from given data or object
				switch (recs.constructor) {
					case Array:  // [ {head1:val}, head2:val}, ...]  create table from headers and values
					
						var rtn = "", head = true;
						
						recs.each( function (n,rec) {
							
							if (head) {
								var row = "";
								Each(rec, function (key,val) {
									row += key.tag("th");
								});
								rtn += row.tag("tr");
								head = false;
							}
							
							var row = "", intro = "";
							Each(rec, function (key,val) {
								if (val)
									row += (val.constructor == Array)
										? table(val)
										: (val+"").tag("td", intro ? {class:"intro"} : {});
								else
									row += (val+"").tag("td");
								
								intro = false;
							});
							rtn += row.tag("tr");
						});
						
						return rtn.tag("table",{}).tag("div",{style:"overflow-x:auto"});
						
					case Object: // { key:val, ... } create table dump of object hash
					
						var rtn = "";
						Each(recs, function (key,val) {
							if (val)
								rtn += (val.constructor == Array)
									? table(val)
									: (key.tag("td") + JSON.stringify(val).tag("td")).tag("tr");
						});
						
						return rtn.tag("table");
						
					default:
						return recs+"";
				}
			}
			
			function dump(x) {
				rtn = "";
				for (var n in x)  {
					switch ( x[n].constructor ) {
						case Object:
							rtn += dump( x[n] ); break;
						case Array:
							rtn += n+"[]"; break;
						case Function:
							rtn += n+"()"; break;
						default:
							rtn += n;
					}
					rtn += "; ";
				}
				return rtn;
			}
			
			return table( recs );
		},
				
		context: { // skinning contexts for each skin
			rtpsqd: {   // define DSVAR datasets available for the rtpsqd skin
				apps:"openv.apps",
				users: "openv.profiles",
				projs: "openv.milestones",
				QAs: "app1.QAs"
				//stats:{table:"openv.profiles",group:"client",index:"client,event"}
			}
		},

		classif: { level: "(U)", purpose: "nada" },
		asp: {},
		isp: {},
		info: {},
		filename: "./public/jade/ref.jade"	// jade reference path for includes, exports, appends					
	},
	
	"sender.": {		//< FILE.ATTR senders
		code: sendCode,
		jade: sendCode,		
		classif: sendAttr,
		readability: sendAttr,
		client: sendAttr,
		size: sendAttr,
		risk: sendAttr
	},
	
	"converters." : { // NODE.TYPE converters respond on current req-res thread with converted recs
		view: function (recs,req,res) {
			res( recs );
		},
		/*exe: function (recs,req,res) {
			res( recs );
		},*/
		kml: function (recs,req,res) {
			res( TOKML({}) );
		},
		flat: function index(recs,req,res) {
			recs.each( function (n,rec) {
				var rtns = new Array();
				for (var key in rec) rtns.push( rec[key] );
				recs[n] = rtns;
			});
			res( recs );
		},
		txt: function (recs,req,res) {
			var head = recs[0], cols = [], cr = String.fromCharCode(13), txt="", list = ",";

			if (head) {
				for (var n in head) cols.push(n);
				txt += cols.join(list) + cr;

				recs.each(function (n,rec) {
					var cols = [];
					for (var n in rec) cols.push(rec[n]);
					txt += cols.join(list) + cr;
				});
			}

			res( txt );
		},

		htm: function (recs,req,res) {
			res( DEBE.site.show( recs ) );
		},
		
		xdoc: genDoc,
		xxls: genDoc,
		xpps: genDoc,
		xppt: genDoc,
		
		tree: function (recs,req,res) {
			res( {
				name: "root", 
				weight: 1, 
				children: recs.treeify( 0, recs.length, 0, (req.flags.sort || "").split(",") )
			} );
		},
		
		delta: function (recs,req,res) {
			var sql = req.sql;
			var ctx = {
				src: {
					table: "baseline."+req.table
				}
			};

			sql.context(ctx, function (ctx) {   		// establish skinning context for requested table
				ctx.src.rec = function (Recs,me) {  // select the baseline records 
					
					if (Recs.constructor == Error)
						res( Recs );
					
					else
						res( recs.merge(Recs, Object.keys(Recs[0] || {})) );
				};
			});
		},

		encap: function encap(recs,req,res) {
			res({encap: recs});
		},
		
		nav: function (recs,req,res) {  	// navigate pivoted records

/*console.log({
	i: "nav",
	c: keys,
	f: req.flags,
	q: req.query
});*/
			var 
				keys = Object.keys(recs[0] || {}),
				flags = req.flags,
				query = req.query,
				Browse = flags.browse.split(","),
				Cmd = keys.pop(),
				Slash = "_",
				Parent = keys.pop(),
				Nodes  = Parent ? Parent.split(Slash) : [],
				Folder = Browse[Nodes.length],
				Parent = Parent || "root",
				Files  = [{	// prime the side tree area
					mime:"directory",
					ts:1334071677,
					read:1,
					write:0,
					size:recs.length,
					hash: Parent,
					volumeid:"v1",
					//phash: Back,	// cant do this for some reason
					name: Parent+ (Folder?":"+Folder:""),
					locked:1,
					dirs:1
				}];

Trace(`NAVIGATE Recs=${recs.length} Parent=${Parent} Nodes=${Nodes} Folder=${Folder}`);
			
			if (Folder)   	// at branch
				recs.each( function (n,rec) {
					Files.push({
						mime: "directory",	// mime type
						ts:1310252178,		// time stamp format?
						read: rec.read,				// read state
						write: rec.write,			// write state
						size: rec.NodeCount,			// size
						hash: rec.NodeID,	// hash name
						name: rec.name || "?"+n, // keys name
						phash: Parent, 		// parent hash name
						locked:rec.locked,			// lock state
						volumeid: rec.group,
						dirs: 1 			// place inside tree too
					});
				});
			
			else 				// at leaf
				recs.each( function (n,rec) {  // at leafs
					Files.push({
						mime: "application/tbd", //"application/x-genesis-rom",	//"image/jpg", // mime type
						ts:1310252178,		// time stamp format?
						read:rec.read,				// read state
						write:rec.write,			// write state
						size: rec.NodeCount,			// size
						hash: rec.NodeID,		// hash name
						name: rec.name || "?"+n,			// keys name
						phash: Parent,		// parent hash name
						volumeid: rec.group,
						locked:rec.locked			// lock state
					});	
				});
			
//console.log(Files);	

			switch (Cmd) {  	// Handle keys nav
				case "test":	// canonical test case for debugging					
					res({  
						cwd: { 
							"mime":"directory",
							"ts":1334071677,
							"read":1,
							"write":0,
							"size":0,
							"hash": "root",
							"volumeid":"l1_",
							"name":"Demo",
							"locked":1,
							"dirs":1},
							
						/*"options":{
							"path":"", //"Demo",
							"url":"", //"http:\/\/elfinder.org\/files\/demo\/",
							"tmbUrl":"", //"http:\/\/elfinder.org\/files\/demo\/.tmb\/",
							"disabled":["extract"],
							"separator":"\/",
							"copyOverwrite":1,
							"archivers": {
								"create":["application\/x-tar", "application\/x-gzip"],
								"extract":[] }
						},*/
						
						files: [
							{  // cwd again
								"mime":"directory",
								"ts":1334071677,
								"read":1,
								"write":0,
								"size":0,
								"hash":"root",
								"volumeid":"l1_",
								"name":"Demo",
								"locked":1,
								"dirs":1},
						
							/*{
							"mime":"directory",
							"ts":1334071677,
							"read":1,
							"write":0,
							"size":0,
							"hash":"root",
							"volumeid":"l1_",
							"name":"Demo",
							"locked":1,
							"dirs":1},*/
							
							{
								"mime":"directory",
								"ts":1340114567,
								"read":0,
								"write":0,
								"size":0,
								"hash":"l1_QmFja3Vw",
								"name":"Backup",
								"phash":"root",
								"locked":1},
							
							{
								"mime":"directory",
								"ts":1310252178,
								"read":1,
								"write":0,
								"size":0,
								"hash":"l1_SW1hZ2Vz",
								"name":"Images",
								"phash":"root",
								"locked":1},
							
							{
								"mime":"directory",
								"ts":1310250758,
								"read":1,
								"write":0,
								"size":0,
								"hash":"l1_TUlNRS10eXBlcw",
								"name":"MIME-types",
								"phash":"root",
								"locked":1},
							
							{
								"mime":"directory",
								"ts":1268269762,
								"read":1,
								"write":0,
								"size":0,
								"hash":"l1_V2VsY29tZQ",
								"name":"Welcome",
								"phash":"root",
								"locked":1,
								"dirs":1},
							
							{
								"mime":"directory",
								"ts":1390785037,
								"read":1,
								"write":1,
								"size":0,
								"hash":"l2_Lwxxyyzz",
								"volumeid":"l2_",
								"name":"Test here",
								"locked":1},
							
							{
								"mime":"application\/x-genesis-rom",
								"ts":1310347586,"read":1,
								"write":0,
								"size":3683,
								"hash":"l1_UkVBRE1FLm1k",
								"name":"README.md",
								"phash":"root",
								"locked":1}
						],
						
						api: "2.0","uplMaxSize":"16M","netDrivers":[],
						
						debug: {
							"connector":"php",
							"phpver":"5.3.26-1~dotdeb.0",
							"time":0.016080856323242,
							"memory":"1307Kb \/ 1173Kb \/ 128M",
							"upload":"",
							"volumes":[
								{	"id":"l1_",
									"name":"localfilesystem",
									"mimeDetect":"internal",
									"imgLib":"imagick"},
						
								{	"id":"l2_",
									"name":"localfilesystem",
									"mimeDetect":"internal",
									"imgLib":"gd"}],
						
							"mountErrors":[]}
					});
					break;
					
				/*case "tree": 	// not sure when requested
					return {
						tree: Files,

						debug: {
							connector:"php",
							phpver:"5.3.26-1~dotdeb.0",
							time:0.016080856323242,
							memory:"1307Kb \/ 1173Kb \/ 128M",
							upload:"",
							volumes:[{	id:"l1_",
										name:"localfilesystem",
										mimeDetect:"internal",
										imgLib:"imagick"},

									{	id:"l2_",
										name:"localfilesystem",
										mimeDetect:"internal",
										imgLib:"gd"}],

							mountErrors:[]
						}		
					};	
					break;*/
					
				case "size": 	// on directory info
					res({
						size: 222
					});
					break;
					
				case "parents": // not sure when requested
				case "rename":  // on rename with name=newname
				case "keys": 	// on open via put, on download=1 via get
					res({
						message: "TBD"
					});
					break;
				
				case "tree":
				case "open":	// on double-click to follow
					res({
						cwd: Files[0], 
						/*{ 
							mime:"directory",
							ts:1334071677,
							read:1,
							write:0,
							size:999,
							hash: flags.NodeID,
							phash: "", //cwdBack,
							volumeid:"tbd", //"l1_",
							name: Folder,
							locked:0,
							dirs:1},*/

						options: {
							path:"/", //cwdPath,
							url:"/", //"/root/",
							tmbUrl:"/root/.tmb/",
							disabled:["extract"],
							separator: Slash,
							copyOverwrite:1,
							archivers: {
								create:["application/x-tar", "application/x-gzip"],
								extract:[] }
						},
						
						files: Files,
						
						api:"2.0",
						uplMaxSize:"16M",
						netDrivers:[],

						debug: {
							connector:"php",
							phpver:"5.3.26-1~dotdeb.0",
							time:0.016080856323242,
							memory:"1307Kb \/ 1173Kb \/ 128M",
							upload:"",
							volumes:[
									{	id:"v1",
										name:"localfilesystem",
										mimeDetect:"internal",
										imgLib:"imagick"},
									{	id:"v2",
										name:"localfilesystem",
										mimeDetect:"internal",
										imgLib:"gd"}],
							mountErrors:[]
						}
					});
					break;
					
				default:
					res({
						message: "bad navigation command"
					});
			}
		}
		
	},
		
	"reader.": {	//< reader endpoint
		help: sysHelp,
		stop: sysStop,
		//kill: sysKill,
		alert: sysAlert,
		codes: sysCodes,
		ping: sysPing,
		bit: sysBIT,
		//start: sysStart,
		//checkpt: sysCheckpt,
		config: sysConfig,
		
		// Render a page using jade skinning engine
		//jade: readJade,
		view: readJade,
		
		// An exe TYPE will schedule (one-time or periodic) jobs matched by 
		// table, engine or file.		
		exe: runExe
	},
	
	"emulator.": {  //< emulation endpoints
	},
	
	"errors.": {  //< error messages
		pretty: function (err) {
			return "".tag("img",{src:"/shares/reject.jpg",width:40,height:60})
				+ (err+"").replace(/\n/g,"<br>").replace(process.cwd(),"")
				+ ".  See issues".tag("a",{href: "/issues.view"})
				+ " for further information";
		},
		badDataset: new Error("dataset does not exist"),
		noCode: new Error("failed engine code lookup"),
		unsupportedFeature: new Error("unsupported feature"),
		noOffice: new Error("office docs not enabled")
	},
	
	"paths.": {  //< paths to things
		default: "tour/",
		
		mime: {
			tour: ".",		 			//< enable totem touring 
			//jobs: "./public/jobs",		//< path to tau simulator job files
			stores: "./public", 		//< persistant scrape area
			uploads: "./public", 		//< one-time scrape area
			data: "./public", 			//< json data area
			chips: "./public/images",	//< chipped files
			tips: "./public/images",	//< tipped files
			shares: ".", 				//< cached file area
			socketio: ".",				//< path to socket.io
			clients: ".",				//< path to clients
			//icons: ".",				//< path to icons
			captcha: ".",				
			index: { 					//< allowed file indexers
				shares: "indexer",
				uploads: "indexer",
				stores: "indexer",
				tour: "indexer"
			}
		},
		
		skin: {
			org1: "./public/jade/Org1",
			org2: "./public/jade/Org2",
			mood1: "./public/jade/Mood1"
		},
		
		code: {
			py: "./public/py",
			js: "./public/js",
			mat: "./public/mat",
			jade: "./public/jade",
			html: "./public/htmls"
		}
	},
	
	Function: Initialize,  //< add to ENUM callback stack

	// Records processing protos
	
	String: [  // string prototypes
		function indentify(tag) {
			if (tag) 
				return tag + "\n\t" + this.split("\n").join("\n\t");
			else
				return "\t" + this.split("\n").join("\n\t");
		},
	
		function render(req) { 

			var jade = this;
			Copy(DEBE.site,req);  			
			
			try {
				var gen = SKIN.compile(jade,req);
				return gen ? rtn = gen(req) : "Bad skin";
			}
			catch (err) {
				return "skin - "+err;
			}
		}
	],
	
	Array: [  // array prototypes
		/**
		@method merge
		**/
		function merge(Recs,idx) {
			
			function changed(rec,Rec) {
				for (var n in rec)
					if (rec[n] != Rec[n]) 
						return true;
				
				return false;
			}
				
			var recs = this;
			// sort records on specified index
			Recs = Recs.sort( function (a,b) {
				return a[idx] > b[idx] ? 1 : -1;
			});
			recs = recs.sort( function (a,b) {
				return a[idx] > b[idx] ? 1 : -1;
			});

			// merge records based on specified index.
			var k=0,Rec = Recs[k],ID=10000;
			
			if (Rec)
			recs.each( function (n, rec) {
//console.log([n,k,recs.length, Recs.length, idx, rec[idx], Rec[idx]]);

				while (Rec && (rec[idx]  == Rec[idx])) {
					if ( changed(rec,Rec) ) { // return only changed records
						Rec.Baseline = 1;
						Rec.ID = ID++;
						recs.push( Rec );
					}
					Rec = Recs[++k];
				}

				rec.Baseline = 0;
			});	
			
			recs = recs.sort( function (a,b) {
				return a[idx] > b[idx] ? 1 : -1;
			});
			
			return recs;
		},
		
		/**
		@method treeify
		Return a tree = {name,weight,children: tree} from records having been sorted on keys=[key,...]
		*/
		function treeify(idx,kids,level,keys,wt) {
			var	
				recs = this,
				key = keys[level],
				len = 0,
				pos = idx, end = idx+kids,
				tar = [];
			
//console.log([level,keys,ref,idx]);
			
			if (key)
				for (var ref = recs[idx][key]; pos < end; ) {
					var rec = recs[idx];
					var stop = (idx==end) ? true : (rec[key] != ref);
					
					if ( stop ) {
						//console.log([pos,idx,end,key,ref,recs.length]);
						
						var node = {
							name: key+" "+ref, 
							weight: wt ? parseInt(rec[wt] || "0") : len,
							children: recs.treeify(pos,len,level+1,keys,wt)
						};

						tar.push( node );
						pos = idx;
						len = 0;
						ref = (idx==end) ? null : recs[idx][key];
					}
					else {
						idx++;
						len++;
					}
				}
			
			else
				while (pos < end) {
					var rec = recs[pos++];
					tar.push({
						name: "doc", 
						weight: 0, 
						doc: rec
					});
				}
				
			return tar;
		}
	],	
	
	// DEBE specific 
				
	isSpawned: false, 			//< Enabled when this is child server spawned by a master server
	soapCRUD : { 						//< action:route hash for XML-driven engines
		get: "",
		put: "",
		delete: "",
		post: "/service/algorithm/:proxy"		//< hydra endpoint
	},  		//< reserved for soap interfaces
	blindTesting : false,		//< Enable for double-blind testing (make FLEX susceptible to sql injection attacks)
	statefulViews : { 			//< Jade views that require  the stateful URL
		'workflow': 1,
		'workflows': 1
	}
});

/**
 * @method INGESTsession
 * @private
 * Ingest the supplied job when the specified event occurs.
 * 
 * @param {String} event generating this request
 * @param {String} job filename of job being requested
 */
/*
function _INGESTsession (area,file) { 
	Thread( function (sql) {
		
		Trace("INGESTING "+file+" INTO " + area);
		
		switch (area) {
			case "feed":
				sql.query("INSERT INTO simjobs SET ?", {job:job, toa:new Date()}, sql.release);
				break;
			
			case "poll": 		// polling heart beat
			case "rename":		// file rename
				sql.release();
				break;
				
			case "uploads":		// ingest job by indexing with associated engine with removal
			case "stores":		// ingest job by indexing with associated engine
			
				var
					idle, busy,
					job = {
						Client	: DEBE.site.Name,
						Class	: "index",
						Job		: file,
						State	: 0,
						Arrived	: new Date(),
						Work 	: 0,
						Notes	: file.tag("a",{href:"/queues.view"})
					};
				
				/-*
				sql.query("INSERT INTO queues SET ?", job, function (err,info) {
					var jobID = {ID:info.insertId};
				
					READER.job(sql,file,area, function (score) {
						Trace(score);
						
						Each(OS.cpus(), function (n,cpu) {
							idle = cpu.times.idle;
							busy = cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.user;
							job["Util"+n] = busy / (busy + idle);
						});
						
						sql.query(
							"UPDATE queues SET ? WHERE ?",
							[{Departed: new Date(), State:1, Notes:"finished"},jobID], 
							sql.release
						);
					});
				});
				* *-/
				
				break;
							
			case "jobs":		// ingest job by broadcasting job to all clients
			
				if (SOCKETIO) 
					if (!Each( SESSIONS, function (n,ses) { // look for next ses on ring
						if (ses.polled == SOCKETS.polled) {
							ses.polled = !ses.polled;
							sql.query("SELECT Job,min(toa),count(ID) AS Jobs FROM simjobs LIMIT 0,1")
							.on("result", function (job) {
								Trace(job);
								SOCKETIO.sockets.emit("import", {
									job: job.Job,
									to: ses.Client,
									jobs: job.Jobs,
									core: CLUSTER.isMaster ? 0 : CLUSTER.worker.id,
									from: DEBE.site.Name
								});
							});
							return true;
						}
					})) // flip ses state if ring completely traversed 
						SOCKETS.polled = !SOCKETS.polled;

				break;
		}
	});
}
*/

/**
 * @method SOAPsession
 * @private
 * Process an soapCRUD session peer-to-peer request.  Currently customized for Hydra-peer and 
 * could/should be revised to support more generic peer-to-peer soapCRUD interfaces.
 * 
 * @param {Object} req HTTP request
 * @param {Object} res HTTP response
 * @param {Function} proxy Name of APP proxy function to handle this session.
 * */
/*
function SOAPsession(req,res,peer,action) {
	Thread( function (sql) {
		req.addListener("data", function (data) {
			XML2JS.parseString(data.toString(), function (err,json) {  // hydra specific parse

				hydrareq = false
					? json["soapenv:Envelope"]["soapenv:Body"][0]["swag:SWAGRequest"][0]	// hydra soapui request
					: json["soap:Envelope"]["soap:Body"][0]["SWAGRequest"][0];				// hydra peer request

				for (var n in hydrareq)
					switch (n) {
						case "xmls":
						case "$":
						case "inFileName":
						case "outFileName":
						case "feature":
							ENV[n.toUpperCase()] = hydrareq[n][0];
							break;

						default:
							ENV[n.toUpperCase()] = parseFloat(hydrareq[n][0]);
					}
				
				var VTL = (APP[action]||{})[peer];
				
				Trace(action.toUpperCase() + peer + (VTL ? "LOCATED" : "MISSING"));
				
				if (VTL) 
					VTL(req, function (msg) {
						Trace("PEER " + peer + ":" + msg);
					});
					
			});
		});
		
		res.statusCode = 200;
		sql.reply(res,"0");
	});
}
*/

function icoFavicon(req,res) {   // extjs trap
	res("No icons here"); 
};

//==========================================
// Maintenance endpoints

/**
@class support.sys
sys.X endpoints
*/

/**
@method sysConfig
Totem(req,res) endpoint to render jade code requested by .table jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/

function sysConfig(req,res) {
	function Guard(query, def) {
		for (var n in query) return query;
		return def;
	}
	
	var query = Guard(req.query,false);
	
	if (query)
		req.sql.query("UPDATE config SET ?", query, function (err) {
			res( err || "parameter set" );
		});
}

/**
@method sysCheckpt
@deprecated
Totem(req,res) endpoint to render jade code requested by .table jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/
/*
function sysCheckpt(req,res) {
	CP.exec('source maint.sh checkpoint "checkpoint"');
	res("Checkpointing database");
}
*/

/**
@method sysStart
@deprecated
@param {Object} req Totem request
@param {Function} res Totem response
*/
/*
function sysStart(req, res) {
	req.sql.query("select * from openv.apps where least(?)",{Enabled:true,Name:req.query.name||"node0"})
	.on("result",function (app) {
		if (false)
			CP.exec("node $EXAPP/sigma --start "+app.Name, function (err,stdout,stderr) {
				if (err) console.warn(err);
			});
		else
			process.exit();				
	})
	.on("end", function () {
		res("restarting service");
	});
}
*/

/**
@method sysBIT
Totem(req,res) endpoint for builtin testing
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sysBIT(req, res) {
	var N = req.query.N || 20;
	var lambda = req.query.lambda || 2;
	
	var
		actions = ["insert","update","delete"],
		tables = ["test1","test2","test3","test4","test5"],
		users = ["simuser1","simuser2","simuser3","simuser4","simuser5"],
		f1 = ["sim1","sim2","sim3","sim4","sim5","sim6","sim7","sim","sim9","sim10","sim11","sim12","sim13"],
		f2 = ["a","b","c","d","e","f","g","h"],
		f3 = [0,1,2,3,4,5,6,7,,9,10];

	var t0 = 0;

	// Notify startup
	
	Trace(`BIT ${N} events at ${lambda} events/s with logstamp ${stamp}`);
	
	res("BIT running");

	// Setup sync for server blocking and notify both sides
	
	FLEX.BIT = new SYNC(N,{},function () { 
		FLEX.BIT = null; 
		Trace("BIT completed");
	});
	
	//DEBE.LOGSTAMP = Stamp;
	
	// Poisson load model.
	
	for (var n=0;n<N;n++) {
		var t = - 1e3 * Math.log(Math.random()) / lambda;			// [ms] when lambda [1/s]
		
		t0 += t;

		var taskID = setTimeout(function (args) {
			req.body = clone(args.parms);
			req.query = (args.action == "insert") ? {} : {f1: args.parms.f1};
			req.ses.source = "testdb."+args.table;
			req.ses.action = args.action;

			FLEX.open(req,res);  		// need cb?			
		}, t0, {	parms: {f1:f1.rand(),f2:f2.rand(),f3:f3.rand()}, 
					table: tables.rand(), 
					action: actions.rand(),
					client: users.rand()
				});
	}
}

/**
@method sysPing
Totem(req,res) endpoint to test client connection
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sysPing(req,res) {
	res("hello "+req.client);			
}

/**
@method sysCodes
Totem(req,res) endpoint to return html code for testing connection
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sysCodes(req,res) {
	res(HTTP.STATUS_CODES);
}

/**
@method sysAlert
Totem(req,res) endpoint to send notice to all clients
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sysAlert(req,res) {
	if (IO = DEBE.IO)
		IO.sockets.emit("alert",{msg: req.query.msg || "system alert", to: "all", from: DEBE.site.title});
			
	res("Broadcasting alert");
}

/**
@method sysKill
@deprecated
Totem(req,res) endpoint to render jade code requested by .table jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/
/*
function sysKill(req,res) {
	var killed = [];

	res("Killing jobs");

	req.sql.query("SELECT * FROM queues WHERE pid AND LEAST(?,1)", req.query)
	.on("result", function (job) {
		req.sql.query("UPDATE queues SET ? WHERE ?", [{
			Notes: "Stopped",
			pid: 0,
			Departed: new Date()}, 
			{ID: job.ID} ]);

		CP.exec("kill "+job.pid);
	});
}
*/

/**
@method sysStop
Totem(req,res) endpoint to send emergency message to all clients then halt totem
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sysStop(req,res) {
	if (IO = DEBE.IO)
		IO.sockets.emit("alert",{msg: req.query.msg || "system halted", to: "all", from: DEBE.site.title});
	
	res("Server stopped");
	process.exit();
}

/**
@method sysHelp
Totem(req,res) endpoint to return all sys endpoints
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sysHelp(req,res) {
	res(
		  "/ping.sys check client-server connectivity<br>"
		+ "/bit.sys built-in test with &N client connections at rate &lambda=events/s<br>"
		+ "/codes.sys returns http error codes<br>"
		+ "/alert.sys broadcast alert &msg to all clients<br>"
		+ "/stop.sys stops server with client alert &msg<br>"
	);
}

/**
@method sysEngine
@deprecated
Totem(req,res) endpoint to render jade code requested by .table jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/
/*
function sysEngine(req,res) {
	res( DEBE.errors.unsupportedFeature );
}
*/

/**
@class support.send
Totem sender endpoints
*/

/**
@method sendCode
Totem(req,res) endpoint to send engine code requested by (.name, .type) 
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sendCode(req,res) { // return file contents tagged as code

	var paths = DEBE.paths;
	
	FS.readFile(
		(paths.code[req.type] || paths.code.default ) + req.name,
		"utf-8",
		function (err,code) {
			
		if (err) 
			res( DEBE.errors.noCode );
		else
			res( code.tag("code",{class:req.type}).tag("pre") );
			
	});
}

/*
function sendCert(req,res) { // create/return public-private certs
			
	var owner = req.table,
		pass = req.type;
		
	DEBE.prime(owner, pass, {}, function () {
	
		CP.exec(
			`puttygen ${owner}.key -N ${pass} -o ${owner}.ppk`, 
			
			function (err) {
			
			if (err) {
				console.log(err);			
				res( new Error("Failed to create cert") );
			}
				
			else {
				
				var master = site.masterURL,
					paths = DEBE.paths,
					site = DEBE.site,
					FF = "Firefox".tag("a",{href:master+"/shares.firefox.zip"}),
					Putty = "Putty".tag("a",{href:master+"/shares.putty.zip"}),
					Cert = "Cert".tag("a",{href:`${master}/cert/${owner}`});
					
				res( function () {
					return {
						area: "",
						name: `${owner}.ppk`
					}
				});

				APP.sendMail({
					from:  DEBE.site.ASP,
					to:  DEBE.site.ISP,
					cc: name,
					subject: `${DEBE.site.Nick} account request`,
					html: 
`Greetings from ${site.Nick.tag("a",{href:master})}-

Please create an AWS EC2 account for ${owner} using attached cert.

To connect to ${site.Nick} from Windows:

1. establish gateway ${Putty} | SSH | Tunnels | (SourcePort, Destination):
	
	5001, ${site.Host}:22
	5100, ${site.Host}:3389
	5200, ${site.Host}:8080
	5910, ${site.Host}:5910
	5555, Dynamic

2. setup ${Putty} interface:
	
	Pageant | Add Keys | your private ppk cert

3. start a ${site.Nick} session using one of these methods:

	${Putty} | Session | Host Name = localhost:5001 
	Remote Desktop Connect| Computer = localhost:5100 
	${FF} | Options | Network | Settings | Manual Proxy | Socks Host = localhost, Port = 5555, Socks = v5
`.replace(/\n/g,"<br>"),
													
					attachments: [{
						filename: Cert,
						path: `${paths.certs+name}.pub`
					}],	
					alternatives: [{
						contentType: 'text/html; charset="ISO-59-1"',
						contents: ""
					}]
				});
	
			}
	
		});
		
	});
	
}
*/
/**
@method sendAttr
Totem(req,res) endpoint to send the .area attribute of a .table file 
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sendAttr(req,res) { // send file attribute
	
	var attr = req.area,
		table = req.table,
		sql = req.sql;

	sql.query("SELECT *,count(ID) AS count FROM files WHERE least(?) LIMIT 0,1",{Area:area,Name:table})
	.on("result", function (file) {
		res( ( "body {background-color:red;}".tag("style") 
				+ (file[attr]||"?").tag("body")).tag("html") );
	});

}

/**
@method sendFile
Totem(req,res) endpoint to response with mime file requested by .file
@param {Object} req Totem request
@param {Function} res Totem response
*/
function sendFile(req,res) {
	DEBE.sendFile(req,res);
}

/**
@class support.reader
Totem reader endpoints
*/

/**
@method readJade
Totem(req,res) endpoint to render jade code requested by .table jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/
function readJade(req,res) {
			
	var 
		sql = req.sql,
		paths = DEBE.paths,
		site = DEBE.site,  
		ctx = site.context[req.table]; 
		
	function renderJade() {  

		function skinDynamic(req, res, fields) {
			
			var cols = [];
			
			switch (fields.constructor) {
				case Array:
					fields.each(function (n,field) {
						if (field.Field != "ID")
							cols.push( field.Field + "." + (SQLTYPES[field.Type] || "t") );
					});
					break;
					
				case String:
					fields.split(",").each(function (n,field) {
						if (field.Field != "ID")
							cols.push( field.Field );
					});					
					break;
					
				case Object:
				default:
					
					try{
						Each(fields, function (n,rec) {
							if (n != "ID")
								cols.push( n );
						});	
					}
					catch (err) {
					}
			}
				
			var skin =
`extends base
append base_parms
	- tech = "extjs"
append base_body
	#grid.view.${req.table}(path="/${req.table}.db?${req.search}",cols="${cols.join()}",dims="1000,400",page=10,nowrap)
`;
//console.log(skin);
			
			res( skin.render(req) );
		}			
							  
		Trace("RENDER "+req.table);
		
		sql.query(paths.mysql.engine, { // Try a skin from the  engine db
			Name: req.table,
			Engine: req.type,
			Enabled: 1
		})
		.on("result", function (eng) {

			if (eng.Count) 			// render using skinning engine
				res( eng.Code.render(req) );
			
			else 						// render using skin from disk
				FS.readFile(paths.render+req.table+".jade", "utf-8", function (err,skin) {
					
					if (err)  // create dynamic skin for this dataset
						if ( select = FLEX.select[req.table] ) // try virtual table
							select(req, function (recs) {
								skinDynamic( req, res, recs[0] || {} );
							});

						else  // try sql table
							sql.query(
								"DESCRIBE ??", 
								(DEBE.dsAttrs[req.table] || {}).tx || req.table, 
								function (err,fields) {
									
									if (err) // might be an engine
										if (route = DEBE.worker[req.action])   // try engines CRUD
											route(req, function (ack) { // try the engine
												if (ack.constructor == Error) // noluck
													res( ack );

												else 
													skinDynamic( req, res, ack[0] || {} );
											});	
										
										else  // give up
											res( DEBE.errors.badDataset );

									else 
										skinDynamic( req, res, fields );
							});
					
					else  	// render skin
						res( skin.render(req) );
				});
		});

	}
		
	if (ctx) 					// render skin in extended context
		sql.context(ctx, function (ctx) {  // establish skinning context for requested table
			
			for (var n in ctx) { 		// enumerate thru all the datasets
				ctx[n].args = {n:n}; 	// hold ds name for use after select
				ctx[n].rec = function clone(recs,me) {  // select and clone the records 
					site[me.args.n] = recs; 		// save data into the context
				};
			}

			renderJade(); 			// render skin in this extended context
		});
	
	else
		renderJade();  		// render skin in default context

}

/**
@class support
Debe initializer.
*/

/**
@method runExe
Totem(req,res) endpoint to execute (import, sync, export, etc) a virtual database table.
@param {Object} req Totem request
@param {Function} res Totem response
*/
function runExe(req,res) {
	
	var 
		sql = req.sql,
		table = req.table,
		type = req.type,
		query = req.query,
		client = req.client,
		file = req.file,
		qos = Math.min(parseInt(query.qos || "0"), req.profile.QoS),
		priority = parseInt(query.priority || "0"),		
		jobname = `${file}?` + JSON.stringify(query),
		chips = query.chips;
	
	function debug(req,res) {
		res("processed "+[req.chip.name,req.chip.num]);
	}
	
	function queueExe(cls,name,exe) {
		
		res(`Submitted ${file} to `+"job queues".tag("a",{href:"/jobs.view"}));  
		
		for (var n=0; n<chips; n++)
			sql.insertJobs({
				class: cls,
				client: client,
				qos: qos,
				priority: priority,
				chip: {name:"chip"+n, num:n},
				name: name
			}, function (sql,job) {
				
				job.sql = sql;
				exe(job, function (ack) {
					console.log(ack);
				});
				
			});
	}

	if (exe = (false?debug:false))  	// execute debugging mode
		if (chips) {  		// fragmented job placed in job queue
			qos = 8;  		// 4 sec delivery
			priority = 0;
			queueExe("debug", jobname, exe);
		}
		else 				// bulk job executed now
			exe(req,res);
		
	else
	if (exe = FLEX.execute[table]) 		// execute flex virtual table
		if (chips)
			queueExe("flex", jobname, exe);
		else
			exe(req,res);
		
	else
	if (exe = ENGINE.read) 				// execute engine
		sql.query("SELECT * FROM engines WHERE ? AND Enabled",{Name: table})
		.on("result", function (eng) {

			if (chips)
				queueExe("engine", jobname, exe);
			else
				exe(req,res);
			
		});
		
	/*else
	if (exe = READER[type]) 		// execute reader
		DEBE.indexer( DEBE.paths.uploads, function (files) {
			
			files.each(function (n,file) {

				if (chips)
					queueExe("reader", jobname, exe);
				else
					exe(req,res);

			});
			
		});
		*/
}	

function genDoc (recs,req,res) {
	if (!OGEN) 
		return res(DEBE.errors.noOffice);
	
	var 
		types = {
			xdoc: "docx",
			xxls: "xlsx",
			xppt: "pptx",
			xpps: "ppsx"
		},
		type = types[req.type],
		docf = `./shares/${req.table}.${type}`;
	
	if (type) 
		docx = OGEN({
			type: type
			//onend: function (writeBytes) { 	}
		});
	
	else
		res(DEBE.errors.badOffice);
	
	var
		docs = FS.createWriteStream(docf);

	docx.generate( docs );
	docs.on("close", function () {
		console.log("CREATED "+docf);
	});

	if (false) {  // debugging
		var docp = docx.createP();
		docp.addText("hello there");
	
		docp.addTest(`
view || edit

this is a test go home

0.1. SYSTEM SECURITY PLAN PREPARED BY

0.2. REVISION HISTORY

Date
	

Description
	

System Version
	

Authors
	

Complete

Sun May 11 2014 00:00:00 GMT-0400 (EDT)
	

wash my face
	

0.33
	

pms: users: brian.james@guest.org,guest,guest@guest.org,selfsigned
	

0.5

1. INFORMATION SYSTEM NAME/TITLE

This System Security Plan (SSP) ... blah blah

ID	Role	Site	Address	Name
2	hawk	Totem	brian.d.james@comcast.net	null
3	moderator	Totem	brian.d.james@comcast.net	null

1.1 All my apps

ID	Ver	Released	Title	Cores	Sockets	Host	Port	PKI	DB	Name	Nick	Byline	Moderators	POC	Challenge	classif	Allocated	Started	Booted	Enabled	Spawn	App	Peers	Sessions	Protect	Credits	Hawks	EmailHost	EmailUser	Ping	asp	isp	Proxy	Cost	Parms	PM	ISSO	ATP	IATT	DAO	DTO	SORN	SPID	Info	Riddles	Warning
5	0.33	Sun May 11 2014 00:00:00 GMT-0400 (EDT)	Totem	0	0	localhost	8080	0	app1	app1	Totem			brian.d.james@comcast.net	null	{"level": "U", "purpose": "nada"}	0	null	null	1	0	app1	0	100	0	NGA/IIG	brian.d.james@comcast.net	smtp.comcast.net:587	brian.d.james:COMCASTsnivel1	1800000	{"org": "BOOZ", "addr": "nowhere", "name": "TBD", "title": "Ctr"}	{"org": "NGA-T", "addr": "nowhere", "name": "TBD", "title": "spend your money"}	0	5000		{"name":"TBD","title":"Program Mgr","addr":"nowheres"}	null	null	null	null	null	TBD	TBD	{"a": [{"ID": 0, "SORN": "TBD", "SPID": "TBD"}], "b": [{"ID": 1, "NISTid": "TBD", "NISTtype": "a1"}, {"ID": 2, "NISTid": "TBD", "NISTtype": "TBD"}, {"ID": 3, "NISTtype": "a2"}]}	0	Your ISP providing faulty browsers. bla bla
7	0.33	Sun May 11 2014 00:00:00 GMT-0400 (EDT)	Totem	2	0	localhost	8080	1	app1	node0				brian.d.james@comcast.net	null	{"level": "U", "purpose": "nada"}	0	null	null	1	0	app1	1	100	0	NGA/IIG	brian.d.james@comcast.net	smtp.comcast.net:587	brian.d.james:COMCASTsnivel1	1800000	{"org": "BOOZ", "addr": "nowhere", "name": "TBD", "title": "Ctr"}	{"org": "NGA-T", "addr": "nowhere", "name": "TBD", "title": "spend your money"}	0	5000		{"name":"TBD","title":"Program Mgr","addr":"nowheres"}	null	null	null	null	null	TBD	TBD	{"a": [{"ID": 0, "SORN": "TBD", "SPID": "TBD"}], "b": [{"ID": 1, "NISTid": "TBD", "NISTtype": "TBD"}, {"ID": 2, "NISTid": "TBD", "NISTtype": "TBD"}]}	0	null
8	0.33	Sun May 11 2014 00:00:00 GMT-0400 (EDT)	Totem	2	0	localhost	8080	0	app1	node3				brian.d.james@comcast.net	null	{"level": "U", "purpose": "nada"}	0	null	null	1	0	app1	1	100	0	NGA/IIG	brian.d.james@comcast.net	smtp.comcast.net:587	brian.d.james:COMCASTsnivel1	1800000	{"org": "BOOZ", "addr": "nowhere", "name": "TBD", "title": "Ctr"}	{"org": "NGA-T", "addr": "nowhere", "name": "TBD", "title": "spend your money"}	0	5000		{"name":"TBD","title":"Program Mgr","addr":"nowheres"}	null	null	null	null	null	TBD	TBD	{"a": [{"ID": 0, "SORN": "TBD", "SPID": "TBD"}], "b": [{"ID": 1, "NISTid": "TBD", "NISTtype": "TBD"}, {"ID": 2, "NISTid": "TBD", "NISTtype": "TBD"}]}	0	null
9	0.33	Sun May 11 2014 00:00:00 GMT-0400 (EDT)	Totem	2	0	localhost	8080	0	app1	node2				brian.d.james@comcast.net	null	{"level": "U", "purpose": "nada"}	0	null	null	1	0	app1	1	100	0	NGA/IIG	brian.d.james@comcast.net	smtp.comcast.net:587	brian.d.james:COMCASTsnivel1	1800000	{"org": "BOOZ", "addr": "nowhere", "name": "TBD", "title": "Ctr"}	{"org": "NGA-T", "addr": "nowhere", "name": "TBD", "title": "spend your money"}	0	5000		{"name":"TBD","title":"Program Mgr","addr":"nowheres"}	null	null	null	null	null	TBD	TBD	{"a": [{"ID": 0, "SORN": "TBD", "SPID": "TBD"}], "b": [{"ID": 1, "NISTid": "TBD", "NISTtype": "TBD"}, {"ID": 2, "NISTid": "TBD", "NISTtype": "TBD"}]}	0	null

1.2 All my users

ID	Client	Likeus	Updated	Banned	Liked	Joined	SnapInterval	SnapCount	Charge	Credit	QoS	Trusted	Captcha	Login	Email	Challenge	isHawk	Requested	Approved	Group	uid	gid	User	Journal	Message	IDs	Admin	Repoll	Timeout	Roles	Strength
34	brian.james@guest.org	0	Mon May 04 2015 05:52:50 GMT-0400 (EDT)		1	Mon Sep 28 2015 20:51:50 GMT-0400 (EDT)	null	null	null	0	0	0	0	null	null	0	1	null	null	app1	null	null	brian.james@guest.org	null	null	{"Login":"me","Password":"test","FavColor":"blue"}	Please contact joeschome to unlock your accout	0	30000	PM,R,X	1
37	selfsigned	null	null	null	null	Mon Sep 28 2015 20:51:50 GMT-0400 (EDT)	null	null	null	0	0	0	0	null	null	0	1	null	null	app1	null	null	me@guest.org	null	Hello there guest - riddle me this (riddle) and (riddle) and your (Birthdate) and (ids)	{"Login":"me","Password":"test","FavColor":"blue"}	Please contact joeschome to unlock your accout	0	30000		1
41	guest@guest.org	1	null	null	0	null	0	0	null	null	2	0	0	null	guest	0	1	null	null	app1	null	null	guest@guest.org	null	null	{"Login":"me","Password":"test","FavColor":"blue"}	Please contact joeschome to unlock your accout	0	30000	R,PM	1
42	guest	10	null		0	null	0	0	0	100	5	0	0	null	null	0	null	null	null		null	null	guest	null	Welcome guest - what is (riddle)?	null	null	0	0	R,X	1

System Plan Identifier (SPID)
	

Information System Name
	

System Abbreviation
	

System Dump
	

System of Record Notice (SORN)

TBD
	

Totem
	

Totem
	

{"a":[{"ID":0,"SORN":"TBD","SPID":"TBD"}],"b":[{"ID":1,"NISTid":"TBD","NISTtype":"a1"},{"ID":2,"NISTid":"TBD","NISTtype":"TBD"},{"ID":3,"NISTtype":"a2"}]}
	

TBD

1.1 SCOPE AND APPLICABILITY

This document applies to all NGA owned, controlled, outsourced, blah blah

2. INFORMATION SYSTEM CATEGORIZATION

2.1 INFORMATION TYPES
Chapter 1

The Lorenz Equations x2=0

x˙y˙z˙=σ(y−x)=ρx−y−xz=−βz+xy

Impressive 'eh

Jα(x)=∑m=0∞(−1)mm!Γ(m+α+1)(x2)2m+α
Chapter 2
`);
	}
	
	var cols = [];
	var rows = [cols];

	recs.each( function (n,rec) {
		if (n == 0) 
			for (var key in rec)
				rows.push({
					val: key,
					opts: {
						cellColWidth: 4261,
						b: true,
						sz: "48",
						shd: {
							fille: "7F7F7F",
							themeFill: "text1",
							themeFillTint: "80"
						},
						fontFamily: "Avenir Book"
					}
				});

		var row = new Array();

		rows.push(row);
		for (var key in rec)
			row.push( rec[key] );
	});

	if (false)
	docx.createTable(rows, {
		tableColWidth: 4261,
		tableSize: 24,
		tableColor: "ada",
		tableAlign: "left",
		tableFontFamily: "Comic Sans MS",
		borders: true
	});

	res( "Claim file "+"here".link(docf) );
}

/**
@method Initialize
Initialize DEBE on startup.
*/
function Initialize () {
		
	/**
	 * @method initSES
	 * @private
	 * Initialize the session environment
	 */
	function initSES(cb) {

		Trace(`INITIALIZING SESSIONS`);

		Each( CRUDE, function (n,routes) { // Map engine CRUD to DEBE workers
			DEBE.worker[n] = ENGINE[n];
		});	

		// i18n simply provide a industry standard framework for translating native -> foreign
		// phrases (defined my pot->po files under XLATE folder).  These pot->po are not free.
		// Indeed, wordpress, for example, provides a service that allows websites to register
		// for their services that crowd source translations from supplied pot files to their
		// delivered po files.

		if (path = DEBE.paths.mime.xlate) 
			EXAPP.use(LANG.abide({
				supported_languages: ['en', 'de', 'fr'],
				default_lang: 'en',
				translation_directory: path,
				translation_type: "json"
				//locale_on_url: true
			}));


		if (cb) cb();
	}

	/**
	 * @method initENV
	 * @private
	 * Initialize the runtime environment
	 */
	function initENV(cb) {

		Trace(`INTIALIZING ENVIRONMENT`);

		var 
			site = DEBE.site,
		
			args = ARGP
			.usage("$0 [options]")

			.default('spawn',DEBE.isSpawned)
			.boolean('spawn')
			.describe('spawn','internal hyper-threading option')
			.check(function (argv) {
				DEBE.isSpawned = argv.spawn;
			})

			.default('blind',DEBE.blindTesting)
			.boolean('blind')
			.describe('blind','internal testing flag')  
			.check(function (argv) {
				DEBE.blindTesting = argv.blind;
			})

			.default('dump',false)
			.boolean('dump')
			.describe('dump','display derived site parameters')  
			.check(function (argv) {
				console.log(site);
			})
		
			/*
			.default('start',DEBE.site.Name)
			.describe('start','service to start')  
			.check(function (argv) {
				DEBE.site.Name = argv.start;
			})
			* */

			.boolean('version')
			.describe('version','display current version')
			.check(function(argv) {
				if (argv.version) 
					Trace(DEBE.site);
			})

			/*
			.default('echo',DEBE.FLAGS.DEBUG)
			.boolean('echo')
			.describe('echo','echo adjusted http request parameters')
			.check(function(argv) {
				DEBE.FLAGS.DEBUG = argv.echo;
			})*/

			.boolean('help')
			.describe('help','display usage help')
			.check(function(argv) {
				if (argv.help) {
					Trace( ARGP.help() );

					Trace("Available services:");
					sql.query("SELECT * FROM openv.apps WHERE ?",{Enabled:1})
					.on("result", function (app) {
						Trace(app.Name+" v"+app.Ver+" url="+app.Host+":"+app.Port+" db="+app.DB+" nick="+app.Nick+" sockted="+(app.Sockets?"yes":"no")+" cores="+app.Cores+" pki="+app.PKI);
					})
					.on("error", function (err) {co
						Trace(err);
					})
					.on("end", function () {
						process.exit();
					});
				}
			})
			.argv;

		Trace(
			"HOSTING "+site.title+" ON "+(CLUSTER.isMaster ? "MASTER" : "CORE"+CLUSTER.worker.id)
			+ "\n- USING "+site.db 
			+ "\n- FROM "+process.cwd()
			+ "\n- RUNNING "+(DEBE.protected?"PROTECTED":"UNPROTECTED")
			+ "\n- WITH " + (DEBE.paths.url.socketio||"NO")+" SOCKETS"
			+ "\n- WITH " + (DEBE.SESSIONS||"UNLIMITED")+" CONNECTIONS"
			+ "\n- WITH " + (site.Cores||"NO")+" WORKERS@ "+site.workerURL+" MASTER@ "+site.masterURL
		);

		if (cb) cb();

	}

	/**
	 * @method initSQL
	 * @private
	 * Initialize the FLEX and ENGINE interfaces
	 */
	function initSQL(cb) {

		Trace(`INITIALIZING FLEX`);

		Each( CRUDE, function (n,routes) {  // redirect dataset crude calls
			DEBE[n] = FLEX[n].ds;
			DEBE.emulator[n] = FLEX[n];
		});	

		FLEX.config({ 
			thread: DEBE.thread,
			emitter: DEBE.IO ? DEBE.IO.sockets.emit : null,
			skinner: SKIN,
			fetcher: DEBE.fetchers.http,
			indexer: DEBE.indexer,
			uploader: DEBE.uploader,

			paths: {
				HOST: DEBE.site.masterURL,
				NEWSREAD: "http://craphound.com:80/?feed=rss2",
				AOIREAD: "http://omar.ilabs.ic.gov:80/tbd"
			},

			site: DEBE.site,						// Site parameters

			watch: DEBE.watch,
			
			statefulViews : { 					// Jade views that require the stateful URL
				'workflow': 1,
				'workflows': 1
			},	

			/*NEWSREAD: { 					// Establish news reader
				//JOB: APP.INGEST,
				PROXY: {
					hostname: 'http://omar.ilabs.ic.gov',
					port: 80,
					path: '/tbd',
					method: 'GET'
				}
			},*/

			mailer : {						// Email parameters
				TRACE 	: true,	
				ONSTART: true
			},

			likeus : {
				BILLING : 1,				// Billing cycle [days]
				PING : 0.5	 				// Check period [days]
			},

			pulse : {
				LIMITS: {
					Pigs : 2,
					Jobs : 5
				},
				STATUS: "", 
				COUNTS: {State:""},
				PING: 0						// Check period [minutes]
			}

		});

		Trace(`INITIALIZING ENGINES`);

		ENGINE.config({
			thread: DEBE.thread,
			cores: DEBE.core,
			builtins: DEBE.builtins	
		});

		if (cb) cb();	
	}
	
	initENV( function () {
	initSES( function () {
	initSQL( function () {

		// Ta Da!

	}); }); });
} 

// UNCLASSIFIED
