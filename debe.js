// UNCLASSIFIED 

/**
@class DEBE
@requires child_process
@requires cluster
@requires child-process
@requires fs
@requires stream

@requires i18n-abide
@requires socket.io
@requires socket.io-clusterhub
@requires jade
@requires jade-filters
@requires markdown
@requires optimist
@requires tokml
@requires mathjax-node

@requires flex
@requires totem
@requires engine
*/

var 									// globals
	ENV = process.env,
	WINDOWS = process.platform == 'win32',		//< Is Windows platform
	CRUDE = {select:1,delete:1,insert:1,update:1,execute:1};

var 									// NodeJS modules
	CP = require("child_process"), 		//< Child process threads
	CLUSTER = require("cluster"), 		//< Support for multiple cores
	STREAM = require("stream"), 		//< pipe streaming
	FS = require("fs"); 				//< NodeJS filesystem and uploads
	
var										// 3rd party modules
	ODOC = require("officegen"), 	//< office doc generator
	LANG = require('i18n-abide'), 		//< I18 language translator
	ARGP = require('optimist'),			//< Command line argument processor
	TOKML = require("tokml"), 			//< geojson to kml convertor
	JAX = require("mathjax-node"),   //< servde side mathjax parser
	JADE = require('jade');				//< using jade as the skinner
	
var 									// totem modules		
	ENGINE = require("engine"), 
	FLEX = require("flex"),
	TOTEM = require("totem"),
	JSLAB = require("jslab"),
	CHIPS = require("chipper");

var										// shortcuts and globals
	Copy = TOTEM.copy,
	Each = TOTEM.each,
	sqlThread = TOTEM.thread,
	Log = console.log;
	
var
	DEBE = module.exports = TOTEM.extend({
	
	// watchdog config parameters
		
	dogs: {  // watch dog timers [secs] (zero to disable)
		dogFiles: 0,
		dogJobs: 300,
		dogSystem: 100,
		dogHawks: 0,
		dogClients: 0,
		dogEngines: 0,
		dogUsers: 0
	},
	
	dogEngines: function (sql) {
		var 
			trace = "",
			engines = {
				"undefined": "",
				buggy: ""
			},
			limits = {
				"undefined": 1,
				bugs: 10
			};
		
		sql.each(trace, engines.undefined, [limits.undefined], function (client) {
		});		
	},
		
	dogUsers: function (sql) {
		var 
			trace = "",
			users = {
				inactive: "",
				buggy: ""
			},
			limits = {
				inactive: 1,
				bugs: 10
			};
		
		sql.each(trace, users.inactive, [limits.inactive], function (client) {
		});		
	},

	dogClients: function (sql) {
		var 
			trace = "",
			clients = {
				low: "SELECT * FROM openv.profiles WHERE useDisk>?",
				dormant: "",
				poor: "",
				naughty: ""
			},
			limits = {
				disk: 10,
				qos: 2,
				unused: 4
			};
		
		sql.each(trace, clients.naughty, [], function (client) {
		});		
		
		sql.each(trace, clients.low, [limits.disk], function (client) {
		});		
		
		sql.each(trace, clients.dormant, [limits.unused], function (client) {
		});		

		sql.each(trace, clients.poor, [limits.qos], function (client) {
		});		
		
	},
		
	dogFiles: function (sql) {
		var 
			trace = "",
			files = {
				update: "UPDATE files SET canDelete=?,Notes=concat(Notes,?)",
				old: "SELECT files.*,count(events.id) AS evCount FROM events LEFT JOIN files ON events.fileid = files.id WHERE datediff( now(), files.added)>=? AND NOT files.canDelete GROUP BY fileid"
			},
			maxage = 20;
		
		/*
		CP.exec(`git commit -am "archive ${path}"; git push github master; rm ${zip}`, function (err) {
		});		  */
		sql.each(trace, files.old, maxage, function (file) {
			
			var 
				site = DEBE.site,
				url = site.urls.worker,
				paths = {
					info: "here".tag("a", {href: url + "/files.view"}),
					admin: "totem resource manages".tag("a", {href: url + "/request.view"})
				},
				notice = `
${file.client} has been notified that ${file.Name}, containing ${file.eventCount} events, has been flagged for delete as it is older than ${maxage} days.
Consult ${paths.admin} to request additional resources.  Further information about this file is available ${paths.info}. `;
			
			sql.query(files.update, [true,notice]);
			
			if ( sendMail = FLEX.sendMail ) sendMail({
				to: file.client,
				subject: `TOTEM will be removing ${file.Name}`,
				body: notice
			}, sql);
		})
		.on("end", function () {
			sql.release();
		});
	},

	dogJobs: function (sql) {
		var
			trace = "",
			jobs = {
				stuck: "UPDATE app.queues SET Departed=now(), Notes=concat(Notes, ' is ', link('billed', '/profile.view')), Age=Age + (now()-Arrived)/3600e3, Finished=1 WHERE least(Departed IS NULL,Done=Work)", 
			},
			queues = FLEX.queues;
		
		sql.all( trace, jobs.stuck, [], function (info) {

			Each(queues, function (rate, queue) {  // save collected queuing charges to profiles
				Each(queue.client, function (client, charge) {

					if ( charge.bill ) {
						if ( trace ) Trace(`${trace} ${client} ${charge.bill} CREDITS`, sql);

						sql.query(
							"UPDATE openv.profiles SET Charge=Charge+?,Credit=greatest(0,Credit-?) WHERE ?" , 
							 [ charge.bill, charge.bill, {Client:client} ], 
							function (err) {
								Log({charging:err});
						});
						charge.bill = 0;
					}

				});
			});

			sql.release();
		});		
	},

	dogHawks: function (sql) { // job hawking watch dog
		/*
		 * Hawk over jobs in the queues table given {Action,Condition,Period} rules 
		 * defined in the hawks table.  The rule is run on the interval specfied 
		 * by Period (minutes).  Condition in any valid sql where clause. Actions 
		 * supported:
		 * 		stop=halt=kill to kill matched jobs and update its queuing history
		 * 		remove=destroy=delete to kill matched jobs and obliterate its queuing history
		 * 		log=notify=flag=tip to email client a status of matched jobs
		 * 		improve=promote to increase priority of matched jobs
		 * 		reduce=demote to reduce priority of matached jobs
		 * 		start=run to run jobs against dirty records
		 * 		set expression to revise queuing history of matched jobs	 
		 * */
		var
			trace = "",
			jobs = {
				unbilled: "SELECT * FROM app.queues WHERE Finished AND NOT Billed",
				unfunded: "SELECT * FROM app.queues WHERE NOT Funded AND now()-Arrived>?"
			},
			maxage = 10;

		sql.each(trace, jobs.unbilled, [], function (job) {
			//Trace(`BILLING ${job} FOR ${job.Client}`, sql);
			sql.query( "UPDATE openv.profiles SET Charge=Charge+? WHERE ?", [ 
				job.Done, {Client: job.Client} 
			]);

			sql.query( "UPDATE app.queues SET Billed=1 WHERE ?", {ID: job.ID})
		});

		sql.each(trace, jobs.unfunded, [maxage], function (job) {
			//Trace("KILLING ",job);
			sql.query(
				//"DELETE FROM app.queues WHERE ?", {ID:job.ID}
			);
		});

		sql.release();
	},

	diag: {  // self diag parms
		limits: {
			pigs : 2,
			jobs : 5
		},
		status: "", 
		counts: {State:""}
	},

	dogSystem: function (sql) {  // system diag watch dog
		var 
			trace = "",
			sys = {
				engs: "SELECT count(ID) AS Count FROM app.engines WHERE Enabled",
				jobs: "SELECT count(ID) AS Count FROM app.queues WHERE Departed IS NULL",
				pigs: "SELECT sum(DateDiff(Departed,Arrived)>1) AS Count from app.queues",
				logs: "SELECT sum(Delay>20)+sum(Fault != '') AS Count FROM app.dblogs"
			},
			diag = DEBE.diag;

		sql.each(trace, sys.engs, [], function (engs) {
		sql.each(trace, sys.jobs, [], function (jobs) {
		sql.each(trace, sys.pigs, [], function (pigs) {
		sql.each(trace, sys.logs, [], function (isps) {
			var rtn = diag.counts = {Engines:engs.Count,Jobs:jobs.Count,Pigs:pigs.Count,Faults:isps.Count,State:"ok"};
			var limits = diag.limits;

			for (var n in limits) 
				if ( rtn[n] > 5*limits[n] ) rtn.State = "critical";
				else
				if ( rtn[n] > limits[n] ) rtn.State = "warning";

			sql.release();
		});
		});
		});
		});
	}, 
		
	// request config parameters

	"reqFlags." : {  //< endpoint request flags
		
		traps: {  // TRAP=name flags can modify the request flags
			save: function (req) {  //< _save=name retains query in named engine
				var 
					sql = req.sql,
					cleanurl = req.url.replace(`_save=${req.flags.save}`,"");

				Trace(`PUBLISH ${cleanurl} AT ${req.flags.save} FOR ${req.client}`, sql);
				sql.query("INSERT INTO app.engines SET ?", {
					Name: req.flags.save,
					Enabled: 1,
					Type: "url",
					Code: cleanurl
				});
			},

			browse: function(req) {	//< _browse=name navigates named folder
				var query = req.query, flags = req.flags;
				query.NodeID = parseInt(query.init) ? "" : query.target || "";
				flags.nav = [query.NodeID, query.cmd];
				delete query.cmd;
				delete query.init;
				delete query.target;
				delete query.tree;
			},

			view: function (req) {   //< ?_view=name correlates named view to request dataset
				req.sql.query("INSERT INTO openv.viewers SET ?", {
					Viewer: req.flags.view,
					Dataset: req.table
				});	
			}
		},
		
		blog: function (src, ds, dsname, cb) {  // blog=key,... request flag
			function renderEmac(ds,src) {
				try {
					return eval("`" + src + "`");
				}
				catch (err) {
					return src;
				}
			}
			function renderMath(tex,src,cb) {
				var 
					rtn = src,
					isEmpty = tex.each(function (n,tex,isLast) {

						JAX.typeset({
							math: tex,
							format: "TeX",  // TeX, inline-TeX, AsciiMath, MathML
							mml: true
						}, function (d) {
							rtn = rtn.replace("$math"+n, d.mml);
							if ( isLast ) cb(rtn);
						});

					});

				if (isEmpty) cb(rtn);
			}
			
			var tex = [];
			
			renderMath( tex, 
				//renderEmac(ds,src)
				src
				.replace(/\$\$(.|\n)*\$\$/g, function (m,i) {  // tex markfown
					tex.push(m.substr(2,m.length-4));
					return "$math"+(tex.length-1);
				})
				.replace(/\[.*\]\((.*?)\)/g, function (m,i) {  // [x,w,h,s](u) markdown
					m = m.substr(1,m.length-2).split("]("); 
					var 
						v = m[0].split(","),
						u = m[1] || "missing url",
						x = v[0] || "",
						w = v[1] || 100,
						h = v[2] || 100,
						s = v[3] || `${dsname}?ID=${ds.ID}` ,
						p = u.split(";").join("&") ;

					switch (x) {
						case "update":
							return x.tag("a",{href:dsname+".exe?ID="+ds.ID}) + "".tag("iframe",{ src:u, width:w, height:h });
						case "image":
							return "".tag("img",{ src:u, width:w, height:h });
						case "post":
							return "".tag("iframe",{ src:u, width:w, height:h });
						case "nada":
							return `[nada](${u})`;
						case "link":
							return x.tag("a",{href:u});
						default:
							return "".tag("iframe",{ src: `/${x}.view?${p}&w=${w}&h=${h}&ds=${s}`, width:w, height:h } );
					}
				})
				
				.replace(/href=.*>/g, function (m,i) { // follow <a href=B>A</a> links
					var q = (i.charAt(0) == "'") ? '"' : "'";
					return `href=${q}javascript:navigator.follow(${i},BASE.user.client,BASE.user.source)${q}>`;
				}), 
			cb); 
		}

	},
											 
	"reqTypes." : { //< endpoint types to convert dataset recs on specifed req-res thread
		view: function (recs,req,res) {  //< dataset.view returns rendered skin
			res( recs );
		},
		
		exe: function (recs,req,res) {
			res( recs );
		},
		
		kml: function (recs,req,res) {  //< dataset.kml converts to kml
			res( TOKML({}) );
		},
		
		flat: function index(recs,req,res) { //< dataset.flat flattens records
			recs.each( function (n,rec) {
				var rtns = new Array();
				for (var key in rec) rtns.push( rec[key] );
				recs[n] = rtns;
			});
			res( recs );
		},
		
		txt: function (recs,req,res) { //< dataset.txt convert to text
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

		json: function (recs,req,res) {
			res(recs);
		},
		
		stat: function (recs,req,res) { // dataset.stat provide info
			var 
				table = req.table,
				group = req.group,
				uses = [
					"db", "xml", "csv", "txt", "tab", "view", "tree", "flat", "delta", "nav", "encap", "html", "json",
					"view","pivot","site","spivot","brief","gridbrief","pivbrief","run","plugin","runbrief",
					"exe", "stat"];

			uses.each( function (n, use) {
				uses[n] = use.tag("a",{href: "/"+table+"."+use});
			});
			
			req.sql.query("DESCRIBE ??.??", [group,table], function (err, stats) {
				
				if (err)
					res(err);
				
				else {
					stats.each( function (n,stat) {
						stats[n] = stat.Field.tag("a",{href: "/"+table+"?_index="+stat.Field});
					});
					
					res(`
Records: ${recs.length}<br>
Fields: ${stats.join(",")}<br>
Usage: ${uses.join(",")}  `);
				}
			});
			
		},
		
		html: function (recs,req,res) { //< dataset.html converts to html
			res( DEBE.site.gridify( recs ).tag("table") );
		},
		
		// MS office doc reqTypes
		xdoc: genDoc,
		xxls: genDoc,
		xpps: genDoc,
		xppt: genDoc,
		
		tree: function (recs,req,res) { //< dataset.tree treeifies records sorted with _sort=keys
			res( {
				name: "root", 
				weight: 1, 
				children: recs.treeify( 0, recs.length, 0, (req.flags.sort || "").split(",") )
			} );
		},
		
		delta: function (recs,req,res) { //< dataset.delta adds change records from last baseline
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

		encap: function encap(recs,req,res) {  //< dataset.encap to encap records
			res({encap: recs});
		},
		
		nav: function (recs,req,res) {  //< dataset.nav to navigate records pivoted with _browse=keys

			/*
			Log({
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
			
//Log(Files);	

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

	// endpoint router config parameters
		
	"byArea.": { //< routers for endpoints at /AREA/file ...
	},

	"byTable.": {	//< routers for endpoints at /TABLE
		help: sysHelp,
		stop: sysStop,
		alert: sysAlert,
		ping: sysPing,
		bit: sysBIT,
		matlab: sysMatlab
		//kill: sysKill,
		//start: sysStart,
		//checkpt: sysCheckpt,
		//codes: sysCodes,
		//agent: sysAgent
		//config: sysConfig
	},
	
	"byType.": { //< routers for endpoint types at /DATASET.TYPE
		code: sendCode,
		jade: sendCode,		
		classif: sendAttr,
		readability: sendAttr,
		client: sendAttr,
		size: sendAttr,
		risk: sendAttr,
		
		view: renderSkin,
		run: renderSkin,
		plugin: renderSkin,
		site: renderSkin,
		brief: renderSkin,
		pivot: renderSkin,
		gridbrief: renderSkin,
		runbrief: renderSkin,
		pivbrief: renderSkin,
		
		//sim: simEngine,
		exe: exeEngine,
		add: extendPlugin,
		sub: retractPlugin
	},

	"byActionTable.": {  //< routers for CRUD endpoints at /DATASET 
	},
	
	// private parameters
		
	admitRule: null, 	//< admitRule all clients by default 	
		/*{ "u.s. government": "required",
		 * 	"us": "optional"
		 * }*/

	"site.": { 		//< initial site context

		classif: {
			level: "",
			purpose: "",
			banner: ""
		},
		
		info: {
		},
		
		get: function(recs, where, index, subs) {  //< index dataset
		/**
		@member SKINS
		@method get
		Provides a data indexer when a skin is being rendered.
		@param {Array} recs Record source
		@param {Array} where {recKey:value, ...} to match recs
		@param {Array} index "recKey,..." keys to retain from recs
		@param {Array} subs {hash: {recKey: {key:value, ...}. ...}, ...} replace record values
		*/
		
			function select(keys) {
				
				switch ( (keys||0).constructor) {
					case Object:
						for (var key in keys) 
							return "SELECT * FROM ??.?? WHERE least(?,1)";
						
						return "SELECT * FROM ??.??";
						
					case Array:
						return "";
						
					case String:
						return "SELECT * FROM ??.? WHERE " + keys;
						
					case Function:
						return "";
						
					default:
						return "";
				}
			}
			
			var rtns = [];
			
			switch ( (index||0).constructor ) {
				case String: 
					var idx = {};
					index.split(",").each(function (n,key) {
						idx[key] = key;
					});
					index = idx;
					break;
					
				case Array:
					return null;
					break;
					
				case Function:
					sqlThread( function (sql) {
						try {
							sql.query( select(where), [req.group, recs, where], function (err,recs) {								
								index( err ? [] : recs );
							});
							sql.release();
						}
						
						catch (err) {
							index( [] );
						}
					});
					return null;					
			}
			
			recs.each(function (n,rec) {
				var match = true;

				if (where)
					for (var x in where) 
						if (rec[x] != where[x]) match = false;

				if (match) {
					if (subs)
						Each(subs, function (pre, sub) {  // make #key and ##kEy substitutions
							for (var idx in sub) {
								var keys = sub[idx];
								if ( rec[idx] )
									for (var key in keys)
										rec[idx] = (rec[idx] + "").replace(pre + key, keys[key]);
							}
						});

					/*
					if (sub1) {
						for (var idx in sub1) {
							var keys = sub1[idx];
							if ( rec[idx] )
								for (var key in keys)
									rec[idx] = (rec[idx] + "").replace("#" + key, keys[key]);
						}
					}*/
					
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
		
		json: function(recs) {  //< jsonize dataset
		/**
		@member SKINS
		@method json
		Jsonize records.
		@param {Array} recs Record source
		*/
			return JSON.stringify(recs);
		},
		
		tag: function (src,el,tags) {
		/**
		@member SKINS
		@method tag
		*/
			return tags ? src.tag(el,tags) : src.tag("a",{href:el});;
		},
		
		hover: function (ti,fn) {
		/**
		@member SKINS
		@method hover
		Title ti fileName fn
		*/
			if (fn.charAt(0) != "/") fn = "/shares/"+fn;
			return ti.tag("p",{class:"sm"}) 
				+ (
					   "".tag("img",{src:fn+".jpg"})
					+ "".tag("iframe",{src:fn+".html"}).tag("div",{class:"ctr"}).tag("div",{class:"mid"})
				).tag("div",{class:"container"});
		},
		
		gridify: function(recs,noheader) {	//< dump dataset as html table
		/**
		@member SKINS
		@method gridify
		*/
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
					
						var rtn = "", head = !noheader, heads = {};
						
						recs.each( function (n,rec) {
							Each(rec, function (key,val) {
								heads[key] = key;
							});
						});
						
						recs.each( function (n,rec) {
							
							if (head) {
								var row = "";
								Each(heads, function (key,val) {
									row += key.tag("th");
								});
								rtn += row.tag("tr");
								head = false;
							}
							
							var row = "", intro = "";
							Each(heads, function (key,val) {
								if (val = rec[key])
									row += (val.constructor == Array)
										? table(val)
										: (val+"").tag("td", intro ? {class:"intro"} : {});
								else
									row += "".tag("td");
								
								intro = false;
							});
							rtn += row.tag("tr");
						});
						
						return rtn; //.tag("table",{}); //.tag("div",{style:"overflow-x:auto"});
						
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
			
			return  table( recs );
		},
				
		/**
		@private
		@cfg {Object}
		@member SKINS
		*/
		context: { // defines DSVAR contexts when a skin is rendered
			swag: {
				projs: "openv.milestones"
			},
			airspace: {
				projs: "openv.milestones"
			},
			plugin: {
				projs: "openv.milestones"
			},
			briefs: {
				projs: "openv.milestones"
			},
			rtpsqd: {
				apps:"openv.apps",
				users: "openv.profiles",
				projs: "openv.milestones",
				QAs: "app.QAs"
				//stats:{table:"openv.profiles",group:"client",index:"client,event"}
			}
		}
	},
	
	"errors.": {  //< error messages
		pretty: function (err) {
			return "".tag("img",{src:"/shares/reject.jpg",width:40,height:60})
				+ (err+"").replace(/\n/g,"<br>").replace(process.cwd(),"").replace("Error:","")
				+ "; see "
				+ "issues".tag("a",{href: "/issues.view"})
				+ " for further information";
		},
		badSkin: new Error("skin contains invalid jade"),
		badDataset: new Error("dataset does not exist"),
		noCode: new Error("engine has no code file"),
		badFeature: new Error("unsupported feature"),
		noOffice: new Error("office docs not enabled"),
		noExe: new Error("no execute interface"),
		noContext: new Error("no engine context") ,
		noUsecase: new Error("no usecase provided to plugin"),
		certFailed: new Error("could not create pki cert"),
		badEntry: new Error("sim engines must be accessed at master url")
	},
	
	"paths.": {  //< paths to things
		default: "home.view",
		
		jaderef: "./public/jade/ref.jade",	// jade reference path for includes, exports, appends
		
		engine: "SELECT * FROM app.engines WHERE least(?,1) LIMIT 1",
		render: "./public/jade/",
		
		sss: { // some streaming services
			spoof: ENV.DEBUG + "/sss.exe?Name=spoof1&",
			stats: ENV.DEBUG + "/gaussmix.exe?",
			gaussmix: ENV.DEBUG + "/gaussmix.exe?",
			thresher: ENV.SSS_THRESHER
		},

		wfs: { // wfs services
			spoof: ENV.DEBUG + "/wfs.exe?Name=spoof1&",
			ess: ENV.WFS_ESS,
			dglobe: ENV.WFS_DGLOBE,
			omar: ENV.WFS_OMAR,
			geosrv: ENV.WFS_GEOSRV
		},

		wms: { // wms services
			spoof: ENV.DEBUG + "/wms.exe?Name=spoof1&",
			ess: ENV.WMS_ESS,
			dglobe: ENV.WMS_DGLOBE,
			omar: ENV.WMS_OMAR,
			geosrv: ENV.WMS_GEOSRV
		},
		
		mime: {
			tour: ".",		 			//< enable totem touring 
			//jobs: "./public/jobs",		//< path to tau simulator job files
			stores: "./public", 		//< persistant scrape area
			uploads: "./public", 		//< one-time scrape area
			chips: "./public/images",	//< chipped files
			tips: "./public/images",	//< tipped files
			data: "./public",  //< debug data
			jade: "./public",
			shares: ".", 				//< cached file area
			docs: ".", 					//< html documents
			socketio: ".",				//< path to socket.io
			clients: ".",				//< path to 3rd party ui clients
			uis: ".", 					//< path to debe ui drivers
			//icons: ".",				//< path to icons
			captcha: ".",				
			index: { 					//< allowed file indexers
				shares: "indexer",
				uploads: "indexer",
				stores: "indexer",
				tour: "indexer",
				data: "indexer"
			},
			extensions: {  // extend mime types as needed
				rdp: "application/mstsc",
				run: "text/html",
				exe: "text/plain",
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
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enable to give-away plugin services
	*/
	probono: false,  //< enable to run plugins unregulated
		
	Function: Initialize,  //< added to ENUM callback stack

	// Prototypes
	
	String: [  // string prototypes
		/*
		function indentify(tag) {
			if (tag) 
				return tag + "\n\t" + this.split("\n").join("\n\t");
			else
				return "\t" + this.split("\n").join("\n\t");
		},*/
	
		function renderJade(req,res) { 
		/**
		@private
		@method render
		Render Jade string this to res( err || html ) in a new context created for this request. 
		**/
			var jade = this+"";
			siteContext( req, function (ctx) {
				try {
					if ( generator = JADE.compile(jade, ctx) )
						res( generator(ctx) );
					else
						res( DEBE.errors.badSkin );
				}
				catch (err) {
					return res( err );
				}
			});
		},
		
		function renderFile(req,res) { 
		/**
		@private
		@method render
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/
			var file = this+"";
			siteContext( req, function (ctx) {
				try {
					res( JADE.renderFile( file, ctx ) );  // js gets confused so force string
				}
				catch (err) {
					res(  err );
				}
			});
		}
		
	],
	
	Array: [  // array prototypes
		function getStash(watchKey, targetPrefix, ctx, stash, cb) {
			// this = [ { watchKey:"KEY", x:X, y: Y, ...}, ... }
			// stash = { targetPrefix: { x: [X,...], y: [Y,...], ... }, ... }
			
			var rem = stash.remainder;
			
			this.each( function (n,stat) {  // split-save all stashable keys
				var 
					key = targetPrefix + stat[watchKey],  // target ctx key 
					ev = ( key in stash )
						? stash[key]  // stash was already primed
						: (key in ctx)  // see if its in the ctx
								? stash[key] = cb(null,stat, ctx[key]) // prime stash
								: null;  // not in ctx so stash in remainder

				if ( ev )  { // found a ctx target key to save results
					delete stat[watchKey];
					cb(ev, stat);
				}
				
				else  
				if (rem)  // stash remainder 
					rem.push( stat );
			});
		},
		
		function merge(Recs,idx) {
		/**
		@method merge
		Merge changes when doing table deltas from their baseline versions.
		**/
			
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
//Log([n,k,recs.length, Recs.length, idx, rec[idx], Rec[idx]]);

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
		
		function treeify(idx,kids,level,keys,wt) {
		/**
		@method treeify
		Return a tree = {name,weight,children: tree} from records having been sorted on keys=[key,...]
		*/
			var	
				recs = this,
				key = keys[level],
				len = 0,
				pos = idx, end = idx+kids,
				tar = [];
			
//Log([level,keys,ref,idx]);
			
			if (key)
				for (var ref = recs[idx][key]; pos < end; ) {
					var rec = recs[idx];
					var stop = (idx==end) ? true : (rec[key] != ref);
					
					if ( stop ) {
						//Log([pos,idx,end,key,ref,recs.length]);
						
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
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enabled when this is child server spawned by a master server
	*/
	isSpawned: false, 			//< Enabled when this is child server spawned by a master server

	gradeIngest: function (sql, aoi, fileID, cb) {
		
		var ctx = {
			Batch: 10, // batch size in steps
			File: {
				Actors: aoi.Actors,  // ensemble size
				States: aoi.States, // number of states consumed by process
				Steps: aoi.Steps, // number of time steps
			},
			Load: sql.format(  // event query
				"SELECT * FROM app.events WHERE fileID=? ORDER BY t LIMIT 10000", [fileID] )
		};
		
		if (estpr = JSLAB.plugins.estpr) 
			estpr( ctx, function (ctx) {  // estimate/learn hidden process parameters
				var stats = ctx.Save.pop() || {};  // retain last estimate at end
				cb({
					coherence_time: stats.coherence_time || 0,
					coherence_intervals: stats.coherence_intervals || 0,
					degeneracy: stats.degeneracy || 0,
					snr: stats.snr || 0,
					mean_jump_rate: stats.mean_jump_rate || 0
				});
			}); 
		
		else
			cb( {} );
		
		/*
		var 
			stats = {},
			ran = new RAN({ // configure the random process generator
				N: aoi.Actors,  // ensemble size
				K: aoi.States, 		// number of states
				batch: 20,  // batch size in steps
				events: function batchEvents(maxbuf, maxstep, cb) {  // ingest plugin inputs
					FLEX.batchEvents(evs,maxbuf,maxstep,cb);
				},
				store: [], 	// use sync pipe() since we are running a web service
				steps: aoi.Steps, // process steps
				filter: function (str, ev) {  // retain only step info
					switch ( ev.at ) {
						case "end":
							Copy(ev, stats);
							break;

						default:
							//Log(ev);
					}
				}  // on-event callbacks to retain desired process stats
			});

		Log("grader",aoi);
		ran.pipe( [], function (evs) {
			Log("grader",stats);
			cb({
				coherence_time: stats.coherence_time || 0,
				coherence_intervals: stats.coherence_intervals || 0,
				degeneracy: stats.degeneracy || 0,
				snr: stats.snr || 0,
				mean_jump_rate: stats.mean_jump_rate || 0
			});
		}); 
		*/
	},
		
	/**
	@cfg {Object}
	@member DEBE
	@private
	reserved for soap interfaces
	*/
	bySOAP : { 						//< action:route hash for XML-driven engines
		get: "",
		put: "",
		delete: "",
		post: "/service/algorithm/:proxy"		//< hydra endpoint
	},  		//< reserved for soap interfaces
		
	loader: function (url,met,req,res) { // generic data loader
	/**
	@member DEBE
	@private
	@method loader
	@param {String} url path to source
	@param {String} met method GET/POST/... to use
	@param {Object} req http request
	@param {Function} res Totom response callback
	*/
		met( url.tag("?",req), res );
	},

	loaders: { // data loading services
		catalog: function (req,res) { DEBE.loader( DEBE.paths.wfs.spoof, DEBE.fetchers.http, req, res ); },
		image: function (req,res) { DEBE.loader( DEBE.paths.wms.spoof, DEBE.fetchers.wget, req, res ); },
		events: function (req,res) { DEBE.loader( DEBE.paths.sss.spoof, DEBE.fetchers.http, req, res ); },
		stats: function (req,res) { DEBE.loader( DEBE.paths.sss.stats, DEBE.fetchers.http, req, res ); },
		gaussmix: function (req,res) { DEBE.loader( DEBE.paths.sss.gaussmix, DEBE.fetchers.http, req, res ); },
		save: {}
	},

	/*
	autoRuns: function (sql, group, aoi, cb) {  // task and run ingestable plugins

		var
			ring = aoi.ring;
		
		FLEX.taskPlugins( sql, group, function (taskID, pluginName) {

			cb( pluginName, ring );

			if (0)
			FLEX.runPlugin({
				sql: sql,
				table: pluginName,
				query: {ID:taskID}
			}, function (err, rtn, ctx) {
			});

		});
		
		/ *
		var 
			group = "app",
			TL = [aoi.yMax, aoi.xMin],   // [lon,lat] degs
			TR = [aoi.yMax, aoi.xMax],
			BL = [aoi.yMin, aoi.xMin],
			BR = [aoi.yMin, aoi.xMax], 
			ring = {voiring:[ TL, TR, BR, BL, TL ]};

		// add this aoi as a usecase to all applicable plugins 
		sql.eachTable( group, function (table) {  // look for plugins that have a data loader and a Job key
			var tarkeys = [], srckeys = [], hasJob = false;

			// if (table == "gaussmix") // debug filter
			if ( loader = DEBE.loaders[table] )
				sql.query(  // get plugin usecase keys
					"SHOW FIELDS FROM ??.?? WHERE Field != 'ID' ", 
					[ group, table ], 
					function (err,keys) {

					keys.each( function (n,key) { // look for Job key
						var keyesc = "`" + key.Field + "`";
						switch (key.Field) {
							case "Save":
								break;
							case "Job":
								hasJob = true;
							case "Name":
								srckeys.push("? AS "+keyesc);
								tarkeys.push(keyesc);
								break;
							default:
								srckeys.push(keyesc);
								tarkeys.push(keyesc);
						}
					});

					if (hasJob) {
						Trace( `TASKING AOI ${ring.voiring} TO ${table} PLUGIN` );

						sql.query( // add usecase to plugin by cloning its Name="ingest" usecase
							"INSERT INTO ??.?? ("+tarkeys.join()+") SELECT "+srckeys.join()+" FROM ??.?? WHERE name='ingest' ", [
								group, table,
								"ingest " + new Date(),
								JSON.stringify(ring),
								group, table
						], function (err, info) {

							if ( !err && info.insertId )  // relay a fetch request to load the data with the usecase that was just added 
								loader( {ID:info.insertId}, function (rtn) {
									Trace(`AUTORUN ${table}`);  // rtn = json parsed or null
								});
						});
					}
				});
		});
		* /
	},
	*/
		
	ingestFile: function(sql, filePath, fileName, fileID, group, notes, cb) {  // ingest events from file with callback cb(aoi).
		
		CHIPS.ingestFile(sql, filePath, fileID, function (aoi) {
			
			DEBE.gradeIngest( sql, aoi, fileID, function (stats) {

				function pretty(stats,sigfig) {
					var rtn = "";
					Each(stats, function (key,stat) {
						rtn += key + ": " + stat.toFixed(sigfig) + "<br>";
					});
					return rtn;
				}
				
				Log("grader", stats, aoi);
				cb( Copy(stats, aoi) );

				sql.all(
					"INGEST",
					"UPDATE app.files SET ?,Notes=? WHERE ?", [{
						coherence_time: aoi.coherence_time,
						coherence_intervals: aoi.coherence_intervals,
						mean_jump_rate: aoi.mean_jump_rate,
						degeneracy: aoi.degeneracy,
						snr: aoi.snr
					},
					notes + "Initial quality assessment: " + pretty(stats,4),
					{ID: fileID} 
				]).on("error", function (err) {
					Log("grader save",err);
				});
				
				var
					ctx = {
						Job: JSON.stringify({
							file: fileName, limit: 1000, aoi: [ [0,0], [0,0], [0,0], [0,0], [0,0] ]
						}),
						Name: "ingest."+fileName,
						Description: "see " + fileName.tag("a",{href:`/files.view?ID=${fileID}`}) + " for details"
					};
				
				if (false)  // add use case to ingested file in all listening plugins
				FLEX.eachPlugin( sql, group, function (eng) {

					sql.query( 
						"INSERT INTO ??.?? SET ? ON DUPLICATE KEY UPDATE ?", [ 
							group, eng.Name, ctx, {Description: ctx.Description} 
						], function (err, info) {
							if (false)
								FLEX.runPlugin({  // run the plugin
									sql: sql,
									table: eng.Name,
									group: group,
									client: client,
									query: { ID:info.insertId }
								}, function (ctx) {
									Log("TASKED ",eng.Name,err || rtn);
								});	
					});
				});
			});
			
		});
	},
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enable for double-blind testing 
	*/
	blindTesting : false		//< Enable for double-blind testing (eg make FLEX susceptible to sql injection attacks)
});

/**
 * @method SOAPsession
 * @private
 * Process an bySOAP session peer-to-peer request.  Currently customized for Hydra-peer and 
 * could/should be revised to support more generic peer-to-peer bySOAP interfaces.
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

/**
@class MAINT service maintenance endpoints
*/

/*
function sysAgent(req,res) {
	var 
		query = req.query,
		cb = ENGINE.mw.cb[query.job];
	
	Log("AGENT", query);
	cb(0);
}
*/

function sysConfig(req,res) {
/**
@method sysConfig
@deprecated
@param {Object} req Totem request
@param {Function} res Totem response
*/
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

function sysCheckpt(req,res) {
/*
@method sysCheckpt
@deprecated
@param {Object} req Totem request
@param {Function} res Totem response
*/
	CP.exec('source maint.sh checkpoint "checkpoint"');
	res("Checkpointing database");
}

function sysStart(req, res) {
/*
@method sysStart
@deprecated
@param {Object} req Totem request
@param {Function} res Totem response
*/
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

function sysBIT(req, res) {
/**
@method sysBIT
Totem(req,res) endpoint for builtin testing
@param {Object} req Totem request
@param {Function} res Totem response
*/
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
	
	//Trace(`BIT ${N} events at ${lambda} events/s with logstamp ${stamp}`);
	
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

function sysPing(req,res) {
/**
@method sysPing
Totem(req,res) endpoint to test client connection
@param {Object} req Totem request
@param {Function} res Totem response
*/
	res("hello "+req.client);			
}

function sysCodes(req,res) {
/**
@method sysCodes
@deprecated
Totem(req,res) endpoint to return html code for testing connection
@param {Object} req Totem request
@param {Function} res Totem response
*/
	res( HTTP.STATUS_CODES );
}

function sysAlert(req,res) {
/**
@method sysAlert
Totem(req,res) endpoint to send notice to all clients
@param {Object} req Totem request
@param {Function} res Totem response
*/
	if (IO = DEBE.IO)
		IO.sockets.emit("alert",{msg: req.query.msg || "system alert", to: "all", from: DEBE.site.title});
			
	res("Broadcasting alert");
}

function sysKill(req,res) {
/*
@method sysKill
@deprecated
@param {Object} req Totem request
@param {Function} res Totem response
*/
	var killed = [];

	res("Killing jobs");

	req.sql.query("SELECT * FROM app.queues WHERE pid AND LEAST(?,1)", req.query)
	.on("result", function (job) {
		req.sql.query("UPDATE queues SET ? WHERE ?", [{
			Notes: "Stopped",
			pid: 0,
			Departed: new Date()}, 
			{ID: job.ID} ]);

		CP.exec("kill "+job.pid);
	});
}

function sysStop(req,res) {
/**
@method sysStop
Totem(req,res) endpoint to send emergency message to all clients then halt totem
@param {Object} req Totem request
@param {Function} res Totem response
*/
	if (IO = DEBE.IO)
		IO.sockets.emit("alert",{msg: req.query.msg || "system halted", to: "all", from: DEBE.site.title});
	
	res("Server stopped");
	process.exit();
}

function sysHelp(req,res) {
/**
@method sysHelp
Totem(req,res) endpoint to return all sys endpoints
@param {Object} req Totem request
@param {Function} res Totem response
*/
	res(
		  "/ping.sys check client-server connectivity<br>"
		+ "/bit.sys built-in test with &N client connections at rate &lambda=events/s<br>"
		+ "/codes.sys returns http error codes<br>"
		+ "/alert.sys broadcast alert &msg to all clients<br>"
		+ "/stop.sys stops server with client alert &msg<br>"
	);
}

/**
@class ATTRIB get and send dataset attributes
*/

function sendCode(req,res) { // return file contents tagged as code
/**
@method sendCode
Totem(req,res) endpoint to send engine code requested by (.name, .type) 
@param {Object} req Totem request
@param {Function} res Totem response
*/

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

function sendCert(req,res) { // create/return public-private certs
			
	var owner = req.table,
		pass = req.type;
		
	DEBE.prime(owner, pass, {}, function () {
	
		CP.exec(
			`puttygen ${owner}.key -N ${pass} -o ${owner}.ppk`, 
			
			function (err) {
			
			if (err) 
				res( DEBE.errors.certFailed );
				
			else {
				
				var 
					master = site.urls.master,
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
						fileName: Cert,
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

function sendAttr(req,res) { // send file attribute
/**
@method sendAttr
Totem(req,res) endpoint to send the .area attribute of a .table file 
@param {Object} req Totem request
@param {Function} res Totem response
*/
	
	var attr = req.area,
		table = req.table,
		sql = req.sql;

	sql.query("SELECT *,count(ID) AS count FROM app.files WHERE least(?) LIMIT 0,1",{Area:area,Name:table})
	.on("result", function (file) {
		res( ( "body {background-color:red;}".tag("style") 
				+ (file[attr]||"?").tag("body")).tag("html") );
	});

}

/*
function sendFile(req,res) {
/ **
@method sendFile
Totem(req,res) endpoint to response with mime file requested by .file
@param {Object} req Totem request
@param {Function} res Totem response
* /
	DEBE.sendFile(req,res);
}
*/

/**
@class PLUGIN support for dataset-engine plugins
*/

function extendPlugin(req,res) {
/**
@private
@method extendPlugin
@param {Object} req http request
@param {Function} res Totem response callback
*/
	
	var
		sql = req.sql,
		ds = req.table,
		query = req.query;
	
	res("ok");
	
	Each(query, function (key, val) {
		var type = "varchar(32)";
		
		if ( parseFloat(val) ) type = "float";
		else
		if ( parseInt(val)) type = "int(11)";
		else 
			try {
				var val = JSON.parse(val);
				type = (val === true || val === false) ? "boolean" : "json";
			}
			catch (err) {
				type = (val=="doc") ? "mediumtext" : `varchar(${val.length})` ;
			}
			
		sql.query("ALTER TABLE ??.?? ADD ?? "+type, [req.group,ds,key]);
		
	});
}

function retractPlugin(req,res) {
/**
@private
@method retractPlugin
@param {Object} req http request
@param {Function} res Totem response callback
*/
	
	var
		sql = req.sql,
		ds = req.table,
		query = req.query;
	
	res("ok");
	
	Each(query, function (key, val) {
			
		sql.query("ALTER TABLE ??.?? DROP ?? ", [req.group,ds,key]);
		
	});
}
	
function exeEngine(req,res) {
/**
@private
@method exeEngine
Interface to execute a dataset-engine plugin with a specified usecase as defined in [api](/api.view).
@param {Object} req http request
@param {Function} res Totem response callback
*/	
	
	function saveResults( stats, ctx ) {  // save stats to the Save/Save_KEY keys, an Export file, or the Ingest db
		var 
			status = "", // returned status
			stash = { };  // ingestable keys stash
			
		function getFile(sql, cb) {  // allocate an output export file with callback cb(fileID)

			var filename = table + "." + ctx.Name;
			sql.first( "", "SELECT ID FROM app.files WHERE least(?,1) LIMIT 1", {
				Name: filename,
				Client: table,
				Area: group
			}, function (file) {

				if ( file )
					cb( file.ID );

				else
					sql.all( "", "INSERT INTO app.files SET ?", {
						Name: filename,
						Client: table,
						Area: group,
						Added: new Date()
					}, function (info) {
						cb( info.insertId );
					});

			});
		}

		if ( !stats )
			return "empty";
		
		else
		if ( stats.constructor == Error )
			return stats+"";
		
		else
		if ( stats.constructor == Array ) {  // keys in the plugin context are used to create save stashes
			var rem = [], stash = { remainder: rem };  // stash for saveable keys 
			stats.getStash("at", "Save_", ctx, stash, function (ev, stat) {  // add {at:"KEY",...} stats to the Save_KEY stash
				
				if (ev)
					for (var key in stat) ev[key].push( stat[key] );

				else {
					var ev = new Object();
					for (var key in stat) ev[key] = [ ];
					return ev;
				}

			});
			
			if (rem.length) {  // there is a remainder to save
				if ( "Save" in ctx ) {  // dump to Save key
					sql.query("UPDATE ??.?? SET ? WHERE ?", [
						group, table, {Save: JSON.stringify(rem)}, {ID: ctx.ID}
					]);
					status += " Saved";
				}

				if ( ctx.Export ) {
					getFile( sql, function (fileID) {
						var 
							evidx = 0,
							evs = rem,
							filePath = ENV.PUBLIC+"/stores/"+group+"."+table+"."+ctx.Name+"."+client,
							srcStream = new STREAM.Readable({  
								objectMode: false,
								read: function () {  
									if ( ev = evs[evidx++] )
										this.push( JSON.stringify(ev)+"\n" );
									else
										this.push( null );
								}
							}),
							sinkStream = FS.createWriteStream( filePath, "utf8").on("finish", function() {
								Trace("EXPORTED "+filePath);
							});

						srcStream.pipe(sinkStream);
					});
					status += " Exported";
				}

				if ( ctx.Ingest ) {
					getFile( sql, function (fileID) {
						CHIPS.ingestList( sql, rem, fileID, function (aoi, evs) {
							Log("INGESTED ",aoi);
						});
					});
					status += "Ingested";
				}
			}
			
			delete stash.remainder;	
		}
		
		else  { // keys in the plugin context are used to create the stash
			var stash = {};
			Each(stats, function (key, val) {  // remove splits from bulk save
				if ( key in ctx ) stash[key] = val;
			});
		}
		
		for (var key in stash) 
			stash[key] = JSON.stringify(stash[key]);
		
		if ( !Each(stash) ) {   // split save stats across shared keys
			sql.query("UPDATE ??.?? SET ? WHERE ?", [ 
				group, table, stash, {ID: ctx.ID}
			]);
			status += " Saved";
		}

		return ctx.Share ? stats : status;
	}

	var
		dot = ".",
		sql = req.sql,
		client = req.client,
		group = req.group,
		table = req.table,
		query = req.query;

	if ("ID" in query || "Name" in query)  
		FLEX.runPlugin(req, function (ctx) {  // run engine using requested usecase via the job regulator 

			//Log("run ctx", ctx);
			
			if ( !ctx)
				res( DEBE.errors.noContext );
					
			else
			if ( Job = ctx.Job )  { // Intercept job request to run engine via regulator

				res("Regulating");
				
				/*
				var 
					job = Copy(ctx, { // job descriptor for regulator
						//thread: req.client.replace(/\./g,"") + "." + req.table,
						qos: req.profile.QoS, 
						priority: 0,
						client: req.client,
						class: req.client+"."+req.table+".qos"+req.profile.QoS,
						credit: req.profile.Credit,
						name: req.table,
						task: Job.task || "",
						notes: [
								(req.table+"?").tagurl({Name:query.Name}).tag("a", {href:"/" + req.table + ".run"}), 
								((req.profile.Credit>0) ? "funded" : "unfunded").tag("a",{href:req.url}),
								"RTP".tag("a", {
									href:`/rtpsqd.view?task=${Job.task}`
								}),
								"PMR brief".tag("a", {
									href:`/briefs.view?options=${Job.task}`
								})
						].join(" || ")
					});

				delete job.ID;
				delete job.Job;
				*/
				
				//req.query = ctx;
				
				if (Job.constructor == Object)  {  // regulate
					if (Job.voi) // regulate a VOI
						CHIPS.chipVOI(Job, job, function (voxel,stats,sql) {
							sqlThread( function (sql) {
								//Log({save:stats});
								saveResults( stats, voxel );
							});
						});

					else
					if (Job.divs) { // create VOI
						var offs = Job.offs, dims = Job.dims, divs = Job.divs, t = 0;
						
						sql.beginBulk();
						
						for (var z=offs[2], zmax=z+dims[2], zinc=(zmax-z) / divs[2]; z<zmax; z+=zinc)
						for (var y=offs[1], ymax=y+dims[1], yinc=(ymax-y) / divs[1]; y<ymax; y+=yinc)
						for (var x=offs[0], xmax=x+dims[0], xinc=(xmax-x) / divs[0]; x<xmax; x+=xinc) {
							var ring = [
								[y,x],
								[y+yinc,x],
								[y+yinc,x+xinc],
								[y,x+xinc],
								[y,x]
							];

							sql.query(
								"INSERT INTO ??.voxels SET ?,Ring=st_GeomFromText(?)", [
								group, {
									t: t,
									minAlt: z,
									maxAlt: z+zinc
								},

								'POLYGON((' + [  // [lon,lat] degs
									ring[0].join(" "),
									ring[1].join(" "),
									ring[2].join(" "),
									ring[3].join(" "),
									ring[0].join(" ") ].join(",") +'))' 
							]);
						}
						
						sql.endBulk();						
					}
				
					else
					if (false)  // regulate a AOI ring [ [lat,lon], ... ]
						CHIPS.chipAOI(Job, job, function (chip,dets,sql) {
							var updated = new Date();

							//Log({save:dets});
							sql.query(
								"REPLACE INTO ??.chips SET ?,Ring=st_GeomFromText(?),Point=st_GeomFromText(?)", [ 
									group, {
										Thread: job.thread,
										Save: JSON.stringify(dets),
										t: updated,
										x: chip.pos.lat,
										y: chip.pos.lon
									},
									chip.ring,
									chip.point
							]);

							// reserve voxel detectors above this chip
							for (var vox=CHIPS.voxelSpecs,alt=vox.minAlt, del=vox.deltaAlt, max=vox.maxAlt; alt<max; alt+=del) 
								sql.query(
									"REPLACE INTO ??.voxels SET ?,Ring=st_GeomFromText(?),Point=st_GeomFromText(?)", [
									group, {
										Thread: job.thread,
										Save: null,
										t: updated,
										x: chip.pos.lat,
										y: chip.pos.lon,
										z: alt
									},
									chip.ring,
									chip.point
								]);

						});

					else // regulate an event stream
						CHIPS.chipEvents(req, ctx, function (job) {  // job info for this chip

							//Trace(`REGULATING ${evs.length} EVENTS`);
							/*
							ctx.Select = function batchEvents(maxbuf, maxstep, cb) {  // provide event getter
								FLEX.batchEvents(evs,maxbuf,maxstep,cb);
							};*/
							
							req.query = Copy({  // engine request query gets copied to its context
								File: job.File || {},
								Voxel: job. Voxel || {},
								Load: job.Load || "",
								Dump: job.Dump || ""
							},ctx);
							
							ENGINE.select(req, function (ctx) {  // run plugin's engine
								if (ctx) {
									if ( "Save" in ctx )
										saveResults( Array.from(ctx.Save || [] ), ctx );
								}
								
								else
									Log( `REG ${job.name} HALTED` );
							});
						});
				}
				
				else
					ENGINE.select(req, function (ctx) {
						if (ctx)
							if ( "Save" in ctx)
								saveResults( Array.from( ctx.Save || [] ), ctx );
					});

			}
					
			else
			if ( "Save" in ctx )
				res( saveResults( Array.from( ctx.Save || [] ), ctx ) );

			else
				res( "ok" );
			
		});
		
	else  
	if (DEBE.probono)  // run engine using its query usecase w/o submitting a job
		ENGINE.select(req, res);
	
	else
		res(DEBE.errors.noUsecase);

}

function renderSkin(req,res) {
/**
@method renderSkin
@member DEBE
Totem(req,res) endpoint to render jade code requested by .table jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/
			
	var 
		sql = req.sql,
		paths = DEBE.paths,
		site = DEBE.site,  
		ctx = site.context[req.table]; 
		
	function dsContext(sql, ctx, cb) { // callbacl cb() after loading datasets required for this skin
		
		if (ctx) // render in extended context
			sql.context(ctx, function (ctx) {  // establish a sql dsvar context

				var isEmpty = Each(ctx, function (ds, x, isLast) {
					x.args = {ds:ds}; 	// hold ds name for use after select
					x.rec = function clone(recs,me) {  // select and clone the records 
						site[me.args.ds] = recs; 		// save data into the context
						if (isLast) cb();  // all ds loaded so can render with cb
					};
				});

				if ( isEmpty ) cb();

			});
		
		else  // render in default site context
			cb();
	}
	
	
	dsContext(sql, ctx, function () {  

		function renderPlugin(fields) { // render using plugin skin
			
			function acceptable(field) {
				var types = {
					"?": "t",
					"varchar(32)": "t",
					"varchar(64)": "t",
					"varchar(128)": "t",
					"int(11)": "i",
					float: "n",
					json: "x",
					mediumtext: "h",
					json: "x",
					date: "d", 
					datetime: "d",
					"tinyint(1)": "c"
				};				
				
				return 	(field.Field != "ID" && field.Type != "geometry") 
					? field.Field + "." + ( types[ field.Type ] || "t" )
					: null;	
			}

			var
				pluginPath = paths.render+"plugin.jade",
				cols = [],
				query = req.query,
				sql = req.sql,
				query = Copy({
					mode: req.parts[1],
					search: req.search,
					cols: cols,
					page: query.page,
					dims: query.dims || "100%,100%",
					ds: req.table
				},req.query),
				ctx = site.context.plugin;
			
			//Log([query, req.search]);
			
			switch (fields.constructor) {
				case Array:
					fields.each(function (n,field) {
						if ( col = acceptable(field) ) cols.push( col );
					});
					break;
					
				case String:
					fields.split(",").each(function (n,field) {
						if ( col = acceptable( { Field: field, Type: "?"} ) ) cols.push( col );
					});					
					break;
					
				case Object:
				default:
					
					try{
						Each(fields, function (n,rec) {
							if ( col = acceptable( { Field: n, Type: "?"} ) ) cols.push( n );
						});	
					}
					catch (err) {
					}
			}
				
			/*if ( query.mode == "gbrief" ) // better to add this to site.context.plugin
				sql.query("SELECT * FROM ??.??", [req.group, query.ds], function (err,recs) {
					if (err)
						res( DEBE.errors.badSkin );
					
					else {
						recs.each( function (n,rec) {
							delete rec.ID;
						});

						query.data = recs;
						pluginPath.render(req, res);
					}
				});

			else	*/
			
			dsContext(sql, ctx, function () {  // render plugin in its plugin context
				pluginPath.renderFile(req, res);
			});
			
		}		
		
		function renderTable( ) {
			sql.query(
				"DESCRIBE ??.??", 
				[ FLEX.dbRoutes[req.table] || req.group, req.table ] , 
				function (err,fields) {

					if (err) // might be a file
						( paths.render+req.table+".jade" ).renderFile(req, res);

					else 
						renderPlugin( fields );
			});	
		}
		
		sql.first("", paths.engine, { // Try a jade engine
			Name: req.table,
			Type: "jade",
			Enabled: 1
		}, function (eng) {
			
			if (eng)  // render view with this jade engine
				dsContext(sql, ctx, function () {
					eng.Code.renderJade( req, res );
				});

			else 	// try to get engine from sql table or from disk
			if ( route = DEBE.byActionTable.select[req.table] ) // try virtual table
				route(req, function (recs) {
					renderPlugin( recs[0] || {} );
				});

			else
			if ( route = DEBE.byAction.select ) // may have an engine interface
				route(req, function (recs) { 
					//Log({eng:recs, ds:req.table});
					if (recs)
						renderPlugin( recs[0] || {} );

					else
						renderTable( );
				});	

			else  // try sql table
				renderTable( );		
						
		});

	});
}

function genDoc(recs,req,res) {
/**
@method genDoc
@member DEBE
Convert recods to requested req.type office file.
@param {Array} recs list of records to be converted
@param {Object} req Totem request
@param {Function} res Totem response
*/
	
	if (!ODOC) 
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
		docx = ODOC({
			type: type
			//onend: function (writeBytes) { 	}
		});
	
	else
		res(DEBE.errors.badOffice);
	
	var
		docs = FS.createWriteStream(docf);

	docx.generate( docs );
	docs.on("close", function () {
		Trace("CREATED "+docf);
	});

	if (false) {  // debugging
		var docp = docx.createP();
		docp.addText("hello there");
	
		docp.addTest(`
view || edit

1.2 All my users

ID	Client	Likeus	Updated	Banned	Liked	Joined	SnapInterval	SnapCount	Charge	Credit	QoS	Trusted	Captcha	Login	Email	Challenge	isHawk	Requested	Approved	Group	uid	gid	User	Journal	Message	IDs	Admin	Repoll	Timeout	Roles	Strength
34	brian.james@guest.org	0	Mon May 04 2015 05:52:50 GMT-0400 (EDT)		1	Mon Sep 28 2015 20:51:50 GMT-0400 (EDT)	null	null	null	0	0	0	0	null	null	0	1	null	null	app	null	null	brian.james@guest.org	null	null	{"Login":"me","Password":"test","FavColor":"blue"}	Please contact joeschome to unlock your accout	0	30000	PM,R,X	1

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

function Initialize () {
/**
@method Initialize
@member DEBE
Initialize DEBE on startup.
*/
		
	function initSES(cb) {
	/**
	 * @method initSES
	 * @private
	 * @member DEBE
	 * Initialize the session environment
	 */

		Trace(`INIT SESSIONS`);

		/*
		Each( CRUDE, function (n,routes) { // Map engine CRUD to DEBE workers
			DEBE.byTable[n] = ENGINE[n];
		});	
		*/
		
		/*
		The i18n simply provides an industry standard framework for translating native -> foreign
		phrases (defined my pot->po files under XLATE folder).  These pot->po translations are 
		not free.  Wordpress, for example, provides a service that allows websites to register
		for their services that crowd source translations from supplied pot files to their
		delivered po files.
		*/
		
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

	function initENV(cb) {
	/**
	 * @method initENV
	 * @private
	 * @member DEBE
	 * Initialize the runtime environment
	 */

		Trace(`INIT ENVIRONMENT`);

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
				//Log(site);
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
					.on("error", function (err) {
						Trace(err);
					})
					.on("end", function () {
						process.exit();
					});
				}
			})
			.argv;

		Trace(
			"HOST " + site.title+" ON "+(CLUSTER.isMaster ? "MASTER" : "CORE"+CLUSTER.worker.id)
			+ "\n- USING " + site.db 
			+ "\n- FROM " + process.cwd()
			+ "\n- RUNNING " + (DEBE.nofaults?"PROTECTED":"UNPROTECTED")
			+ "\n- WITH " + (site.urls.socketio||"NO")+" SOCKETS"
			+ "\n- WITH " + (DEBE.SESSIONS||"UNLIMITED")+" CONNECTIONS"
			+ "\n- WITH " + (DEBE.cores||"NO")+" WORKERS@ "+site.urls.worker+" MASTER@ "+site.urls.master
		);

		if (cb) cb();

	}

	function initSQL(cb) {
	/**
	 * @method initSQL
	 * @private
	 * @member DEBE
	 * Initialize the FLEX and ENGINE interfaces
	 */

		Trace(`INIT FLEX`);
		
		Each( CRUDE, function (n,routes) {  // redirect dataset crude calls
			DEBE[n] = FLEX[n].ds;
			DEBE.byActionTable[n] = FLEX[n];
		});	

		FLEX.config({ 
			thread: sqlThread,
			emitter: DEBE.IO ? DEBE.IO.sockets.emit : null,
			skinner: JADE,
			fetcher: DEBE.fetchers.http,
			indexer: DEBE.indexer,
			uploader: DEBE.uploader,

			createCert: DEBE.createCert,
			
			dbRoutes: {
				roles: "openv",
				aspreqts: "openv",
				ispreqts: "openv",
				tta: "openv",
				milestones: "openv",
				journal: "openv",
				hawks: "openv",
				attrs: "openv",
				issues: "openv"
			},
			
			diag: DEBE.diag,
			
			site: DEBE.site,						// Site parameters

			/*
			statefulViews : { 					// Jade views that require the stateful URL
				'workflow': 1,
				'workflows': 1
			},*/	

			/*NEWSREAD: { 					// Establish news byType
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
				ONSTART: true,
				SOURCE: "tbd"
			},

			/*
			likeus : {
				BILLING : 1,				// Billing cycle [days]
				PING : 0.5	 				// Check period [days]
			},
			*/
			
		});

		Trace(`INIT ENGINES`);

		CHIPS.config({
			fetch: DEBE.loaders,
			source: "",
			taskPlugin: null,
			thread: sqlThread
		});
		
		JSLAB.config({
			thread: sqlThread,
			fetcher: DEBE.fetchers.http
		});
		
		ENGINE.config({
			thread: sqlThread,
			cores: DEBE.cores,
			watchFile: DEBE.watchFile,
			plugins: Copy({   // share selected FLEX and other modules with engines
				MAIL: FLEX.sendMail,
				RAN: require("randpr")
			}, JSLAB.libs)
		});
		
		if (cb) cb();	
	}
	
	function initDOG( cb ) {
		Each( DEBE.dogs, function (dog, timer) {
			if ( timer )
				if ( watchDog = DEBE[dog] )
					setInterval( function (args) {

						Trace("DOG "+args.name);
						
						sqlThread( function (sql) {
							watchDog(sql);
						});

					}, timer*1e3, {
						name: dog
					});

				else
					Trace("MISSING WATCH DOG "+dog);
		});
	}

	initENV( function () {  // init the global environment
	initSES( function () {	// init session handelling
	initSQL( function () {	// init the sql interface
	initDOG( function () { // init watch dogs

		JAX.config({
			MathJax: {
				tex2jax: {
					//displayMath: [["$$","$$"]]
				}
			}
		});
		JAX.start();
		
		sqlThread( function (sql) {
			var path = DEBE.paths.render;
			
			DEBE.indexer( path, function (files) {  // publish new engines
				var ignore = {".": true, "_": true};
				files.each( function (n,file) {
					if ( !ignore[file.charAt(0)] )
						try {
							//Trace("PUBLISH SKIN "+file);							
							sql.query( "REPLACE INTO app.engines SET ?", {
								Name: file.replace(".jade",""),
								Code: FS.readFileSync( path+file, "utf-8"),
								Type: "jade",
								Enabled: 0
							});
						}
						catch (err) {
							//Trace(err);
						}
				});
				
				sql.release();
			});
		});
		

	}); }); }); });
} 

/*
function simEngine(req,res) {
	//Log("simengine",req.action,req.table,req.filepath,req.area);
	if (CLUSTER.isMaster)
		ENGINE[req.action](req,res);
	
	else
		res( DEBE.errors.badEntry );
}*/

function Trace(msg,arg) {
	TOTEM.trace("D>",msg,arg);
}

function siteContext(req, cb) {
	
	cb( Copy(DEBE.site, {
		table: req.table,
		type: req.type,
		parts: req.parts,
		action: req.action,
		org: req.org,
		client: req.client,
		flags: req.flags,
		query: req.query,
		joined: req.joined,
		profile: req.profile,
		group: req.group,
		search: req.search,
		session: req.session,
		util: {
			cpu: (req.log.Util*100).toFixed(0),
			disk: ((req.profile.useDisk / req.profile.maxDisk)*100).toFixed(0)
		},
		started: DEBE.started,
		fileName: DEBE.paths.jaderef,
		url: req.url
	}) );
	
}
	
function sysMatlab(req,res) {
	var
		sql = req.sql,
		query = req.query;
	
	if ( query.flush )
		ENGINE.matlab.flush(sql, query.flush);
	
	else
	if ( query.save ) {
		var
			thread =  query.save,
			parts = thread.split("_"),
			id = parts.pop(),
			plugin = "app." + parts.pop(),
			results = ENGINE.matlab.path.save + thread + ".out";
		
		Log("SAVE MATLAB",query.save,plugin,id,results);

		FS.readFile(results, "utf8", function (err,json) {

			sql.query("UPDATE ?? SET ? WHERE ?", [plugin, {Save: json}, {ID: id}], function (err) {
				Log("save",err);
			});

		});			
	}
	
	res("flushed");
		
}

// UNCLASSIFIED
