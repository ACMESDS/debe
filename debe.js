// UNCLASSIFIED 
/*
TODO
+ devin set meetup later 2pm?
+ lutheran photos return
+ estpr call during file grading should insert/update into estpr usecases testname=filename
+ make sure sw reqts are uptodate for stu. add swap ID and status to swStatus
+ check if forms are working
*/

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
@requires atomic
@requires geohack
@requires jslab
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
	ATOM = require("atomic"), 
	FLEX = require("flex"),
	TOTEM = require("totem"),
	JSLAB = require("jslab"),
	JSDB = require("jsdb"),
	HACK = require("geohack");

var										// shortcuts and globals
	Copy = TOTEM.copy,
	Each = TOTEM.each,
	sqlThread = TOTEM.thread,
	Log = console.log;
	
var
	DEBE = module.exports = TOTEM.extend({
	
	plugins: JSLAB.libs,
		
	onIngest: {   //< Ingest watchers with callbacks cb(evs)
		default: function (evs, cb) {
		}
	},

	onStartup: function () {
		var
			site = DEBE.site,
			pocs = site.pocs,
			sendMail = FLEX.sendMail;
		
		if (pocs.admin)
			sendMail({
				to: pocs.admin,
				subject: site.title + " started", 
				body: "Just FYI"
			});
	},
		
	// watchdog configuration
		
	dogs: {  //< watch dogs cycle time in secs (zero to disable)
		dogCatalog: Copy({
			//cycle: 1000,
			trace: ""
		}, function (opts) {
		}),
		
		dogDetectors: Copy({
			cycle: 0,
			trace: ""
		}, function (opts) {
		}),
						   
		dogVoxels: Copy({
			//cycle: 120,
			trace: "",
			atmage: 2 // days to age before refresh atm data
		}, function (opts) {
			var gets = {
				unused: "SELECT voxels.ID AS ID,aois.id AS aoiID FROM app.voxels LEFT JOIN app.aois ON aois.name=voxels.aoi HAVING aoiID IS null",
				refresh: "SELECT ID FROM app.voxels WHERE MBRcontains(ring, GeomFromText(?)) AND datediff(now(), added) > ?"
			};
			
			JSDB.forEach(opts.trace, gets.unused, [], function (voxel, sql) {
				sql.update("DELETE FROM app.voxels WHERE ?", {ID: voxel.ID});
			});
			
			if (opts.atmage)  // fetch new atm data from whatever service and loop over recs (grouped by Point(x y) grid location)
			JSDB.forEach(opts.trace, gets.refresh, [atm.gridLocation, opts.atmage], function (voxel, sql) {
				// update voxels with atm data
			});
			
		}),
						
		dogCache: Copy({
			//cycle: 120,
			trace: ""
		}, function (opts) {
		}),
		
		dogIngest: Copy({
			cycle: 30,
			trace: "DOG"
		}, function (opts) {		
			var 
				gets = {
					reingest: "SELECT ID,Ring,startTime,endTime,advanceDays,durationDays,sampleTime,Name FROM app.files WHERE now()>startTime AND now()<endTime"
					//artillery: "/ingest?src=artillery",
					//missile: "/ingest?src=missiles"
				},
				urls = DEBE.site.urls,
				fetcher = DEBE.fetcher;
			
			JSDB.forEach("", gets.reingest, [], function (file, sql) {
				Trace("INGEST "+file.Name);
				fetcher( (urls.master+file.Name).tag("&",{
					fileID: file.ID,
					from: file.startTime,
					to: file.startTime.addDays(file.durationDays),
					ring: file.Ring,
					durationDays: file.durationDays
				}), null, function (msg) {
					Log("INGEST", msg);
				});

				sql.query(
					"UPDATE app.files SET startTime=date_add(startTime, interval advanceDays day), endTime=date_add(startTime, interval durationDays day), Revs=Revs+1 WHERE ?", 
					{ ID: file.ID }
				);
			});
		}),
						
		dogFiles: Copy({
			//cycle: 300, // secs
			trace: "DOG",
			maxage: 90 // days
		}, function (opts) {
			
			function pretty(stats,sigfig) {
				var rtn = [];
				Each(stats, function (key,stat) {
					rtn.push( (stat||0).toFixed(sigfig) + " " + key );
				});
				return rtn.join(", ");
			}
			
			var 
				gets = {
					lowsnr: "SELECT events.ID AS ID FROM app.events LEFT JOIN app.voxels ON voxels.ID = events.voxelID WHERE ? < voxels.minSNR AND ?",
					unpruned: "SELECT ID,Name,snr FROM app.files WHERE NOT Pruned AND Voxels AND fetch_time IS NULL",
					ungraded: "SELECT ID,Name,Actors,States,Steps FROM app.files WHERE NOT Graded AND Voxels AND fetch_time IS NULL",
					expired: "SELECT ID,Name FROM app.files WHERE Expires AND now() > Expires AND fetch_time IS NULL",
					retired: "SELECT files.ID,files.Name,files.Client,count(events.id) AS evCount FROM app.events LEFT JOIN app.files ON events.fileID = files.id "
							+ " WHERE datediff( now(), files.added)>=? AND NOT files.Archived AND fetch_time IS NULL GROUP BY fileid"
				};

			JSDB.forEach( opts.trace, gets.expired, [], function (file, sql) { 
				Trace("EXPIRE "+file.Name);
				sql.query("DELETE FROM app.events WHERE ?", {fileID: file.ID});
			});
			
			if (opts.maxage)
			JSDB.forEach(opts.trace, gets.retired, opts.maxage, function (file, sql) {
				TRACE("RETIRE "+file.Name);

				var 
					site = DEBE.site,
					url = site.urls.worker,
					paths = {
						moreinfo: "here".tag("a", {href: url + "/files.view"}),
						admin: "totem resource manages".tag("a", {href: url + "/request.view"})
					},
					notice = `
Please note that ${site.nick} has moved your sample ${file.Name} to long term storage.  This sample 
contains ${file.eventCount} events.  Your archived sample will be auto-ingested should a ${site.nick} plugin
request this sample.  You may also consult ${paths.admin} to request additional resources.  
Further information about this file is available ${paths.moreinfo}. `;

				sql.query( "UPDATE app.files SET ?, Notes=concat(Notes,?)", [{
					Archived: true}, notice]);

				/*
				need to export events to output file, then archive this output file
				CP.exec(`git commit -am "archive ${path}"; git push github master; rm ${zip}`, function (err) {
				});*/

				if ( sendMail = FLEX.sendMail ) sendMail({
					to: file.client,
					subject: `TOTEM archived ${file.Name}`,
					body: notice
				}, sql);
			});
			
			JSDB.forEach(opts.trace, gets.unpruned, [], function (file, sql) {
				Trace("PRUNE "+file.Name);

				sql.forAll(opts.trace, gets.lowsnr, [ file.snr, {"events.fileID": file.ID} ], function (evs) {
					//Log("dog rejected", evs.length);
					sql.query("UPDATE app.files SET ? WHERE ?", [{
							Pruned: true,
							Rejects: evs.length
						}, {ID: file.ID}
					] );

					evs.each( function (n,ev) {
						sql.query("DELETE FROM app.events WHERE ?", {ID: ev.ID});
					});
				});
			});
			
			JSDB.forEach(opts.trace, gets.ungraded, [], function (file, sql) {
				Trace("GRADE "+file.Name);

				DEBE.gradeIngest( sql, file, function (stats) {

					Log("grade", stats);

					if (stats) {
						var unsup = stats.unsupervised;

						sql.forAll(
							opts.trace,
							"UPDATE app.files SET Graded=true, ?, Notes=concat(Notes,?) WHERE ?", [{
								tag: JSON.stringify(stats),
								coherence_time: unsup.coherence_time,
								coherence_intervals: unsup.coherence_intervals,
								degeneracy_param: unsup.degeneracy_param,
								//duration: stats.t,
								snr: unsup.snr
							},
							"Initial SNR assessment: " + (unsup.snr||0).toFixed(4),
							{ID: file.ID} 
						]);
					}

					else
						sql.query(
							"UPDATE apps.file SET Graded=true, snr=0, Notes=? WHERE ?", [
							"Grading failed", {ID: file.ID} 
						]);
				});
			});
		}),
		
		dogJobs: Copy({
			//cycle: 300,
			trace: ""
		}, function (opts) {
			var
				gets = {
					stuck: "UPDATE app.queues SET Departed=now(), Notes=concat(Notes, ' is ', link('billed', '/profile.view')), Age=Age + (now()-Arrived)/3600e3, Finished=1 WHERE least(Departed IS NULL,Done=Work)", 
				},
				queues = FLEX.queues;

			JSDB.forAll( opts.trace, gets.stuck, [], function (info, sql) {

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

			});	
		}),
			
		dogSystem: Copy({
			//cycle: 100,
			pigs : 2,
			jobs : 5,
			trace: ""
		}, function (opts) {  // system diag watch dog
			var 
				gets = {
					engs: "SELECT count(ID) AS Count FROM app.engines WHERE Enabled",
					jobs: "SELECT count(ID) AS Count FROM app.queues WHERE Departed IS NULL",
					pigs: "SELECT sum(DateDiff(Departed,Arrived)>1) AS Count from app.queues",
					logs: "SELECT sum(Delay>20)+sum(Fault != '') AS Count FROM app.dblogs"
				},
				diag = DEBE.diag;

			sqlThread( function (sql) {
				sql.forEach(opts.trace, gets.engs, [], function (engs) {
				sql.forEach(opts.trace, gets.jobs, [], function (jobs) {
				sql.forEach(opts.trace, gets.pigs, [], function (pigs) {
				sql.forEach(opts.trace, gets.logs, [], function (isps) {
					var rtn = diag.counts = {Engines:engs.Count,Jobs:jobs.Count,Pigs:pigs.Count,Faults:isps.Count,State:"ok"};

					for (var n in opts) 
						if ( rtn[n] > 5*opts[n] ) rtn.State = "critical";
						else
						if ( rtn[n] > opts[n] ) rtn.State = "warning";

					sql.release();
				});
				});
				});
				});
			});
		}),
			
		dogHawks: Copy({
			//cycle: 500,
			maxage: 10,
			trace: ""
		}, function (opts) { // job hawking watch dog
			/*
			Legacy capability overridden by these dogs:
			Hawk over jobs in the queues table given {Action,Condition,Period} rules 
			defined in the hawks table.  The rule is run on the interval specfied 
			by Period (minutes).  Condition in any valid sql where clause. Actions 
			supported:
			 		stop=halt=kill to kill matched jobs and update its queuing history
			 		remove=destroy=delete to kill matched jobs and obliterate its queuing history
			 		log=notify=flag=tip to email client a status of matched jobs
			 		improve=promote to increase priority of matched jobs
			 		reduce=demote to reduce priority of matached jobs
			 		start=run to run jobs against dirty records
			 		set expression to revise queuing history of matched jobs	 
			*/
			var
				gets = {
					unbilled: "SELECT * FROM app.queues WHERE Finished AND NOT Billed",
					unfunded: "SELECT * FROM app.queues WHERE NOT Funded AND now()-Arrived>?"
				};

			JSDB.forEach(opts.trace, gets.unbilled, [], function (job, sql) {
				//Trace(`BILLING ${job} FOR ${job.Client}`, sql);
				sql.query( "UPDATE openv.profiles SET Charge=Charge+? WHERE ?", [ 
					job.Done, {Client: job.Client} 
				]);

				sql.query( "UPDATE app.queues SET Billed=1 WHERE ?", {ID: job.ID})
			});

			if (opts.maxage)
				JSDB.forEach(trace, gets.unfunded, [opts.maxage], function (job, sql) {
					//Trace("KILLING ",job);
					sql.query(
						//"DELETE FROM app.queues WHERE ?", {ID:job.ID}
					);
				});

		}),
		
		dogClients: Copy({
			//cycle: 100000,
			trace: "",
			disk: 10,  //MB
			qos: 2,  //0,1,2,...
			unused: 4,  // days
			certage: 360 // days
		}, function (opts) {
			var 
				gets = {
					needy: "SELECT ID FROM openv.profiles WHERE useDisk>?",
					dormant: "",
					poor: "",
					naughty: "SELECT ID FROM openv.profiles WHERE Banned",
					uncert: "SELECT ID FROM openv.profiles LEFT JOIN app.quizes ON profiles.Client=quizes.Client WHERE datediff(now(), quizes.Credited)>?",
				};

			JSDB.forEach(opts.trace, gets.naughty, [], function (client, sql) {
			});

			if (opts.disk)
			JSDB.forEach(opts.trace, gets.needy, [opts.disk], function (client, sql) {
			});		

			if (opts.dormant)
			JSDB.forEach(opts.trace, gets.dormant, [opts.unused], function (client, sql) {
			});		

			if (opts.poor)
			JSDB.forEach(opts.trace, gets.poor, [opts.qos], function (client, sql) {
			});		

			if (opts.certage)
			JSDB.forEach(opts.trace, gets.uncert, [opts.certage], function (client, sql) {
			});		
			
		}),
			
		dogEngines: Copy({
			//cycle: 600,
			trace: "",
			"undefined": 123,
			bugs: 10
		}, function (sql, opts) {
			var 
				gets = {
					"undefined": "",
					buggy: ""
				};

			if (opts.undefined)
			JSDB.forEach(opts.trace, gets.undefined, [opts.undefined], function (client, sql) {
			});
		}),
			
		dogUsers: Copy({
			//cycle: 1000,
			trace: "",
			inactive: 1,
			bugs: 10
		}, function (opts) {
			var 
				gets = {
					inactive: "",
					buggy: ""
				};

			if (opts.inactive)
			JSDB.forEach(opts.trace, gets.inactive, [opts.inactive], function (client, sql) {
			});		
		})
	},
	
	diag: {  //< reserved for self diag parms
		status: "", 
		counts: {State:""}
	},

	// request configuration

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
		
		blog: function (recs,req,res) {  //< renders dataset records
			recs.blogify( req.flags.blog.split(","), req.table, res );
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
		
		// events from engine usecase or engine code
		default: function (recs,req,res) {
			var 
				filename = req.table + "." + req.type,
				group = req.group,
				type = req.type,
				sql = req.sql;

			sql.forFirst( type, "SELECT ID FROM ??.files WHERE ?", [group, {Name: filename}], function (file) {
				
				if (file)
					sql.forAll( type, "SELECT * FROM ??.events WHERE ?", [group, {fileID: file.ID}], res );
							  
				else
				sql.forFirst( type, "SELECT Code FROM ??.engines WHERE least(?)", [group, {
					Name: req.table,
					Type: req.type
				}], function (eng) {
					
					if (eng) 
						res( eng.Code);
					
					else
						res( null );
				});
				
			});
		},
		
		// MS office doc reqTypes
		xdoc: genDoc,
		xxls: genDoc,
		xpps: genDoc,
		xppt: genDoc,
		
		tree: function (recs,req,res) { //< dataset.tree treeifies records sorted with _sort=keys
			res({
				name: "root", 
				weight: 1, 
				children: req.flags.sort 
					? recs.treeify( 0, recs.length, 0, req.flags.sort.split(",") )
					: []
			});
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

	// endpoint configuration
		
	"byArea.": { //< routers for endpoints at /AREA/file ...
	},

	"byTable.": {	//< routers for endpoints at /TABLE
		help: sysHelp,
		stop: sysStop,
		alert: sysAlert,
		ping: sysPing,
		bit: sysBIT,
		ingest: sysIngest,
		atom: ATOM.exe
		//kill: sysKill,
		//start: sysStart,
		//checkpt: sysCheckpt,
		//codes: sysCodes,
		//agent: sysAgent
		//config: sysConfig
	},
	
	"byType.": { //< routers for endpoint types at /DATASET.TYPE
		// file attributes
		//code: sendCode,
		//jade: sendCode,		
		classif: sendAttr,
		readability: sendAttr,
		client: sendAttr,
		size: sendAttr,
		risk: sendAttr,
		
		// doc generators
		xpdf: sendDoc,
		xjpg: sendDoc,
		xgif: sendDoc,
		
		// skins
		view: renderSkin,
		run: renderSkin,
		plugin: renderSkin,
		site: renderSkin,
		brief: renderSkin,
		pivot: renderSkin,
		gridbrief: renderSkin,
		runbrief: renderSkin,
		pivbrief: renderSkin,
		
		// plugins
		exe: exeEngine,
		add: extendPlugin,
		sub: retractPlugin
	},

	"byActionTable.": {  //< routers for CRUD endpoints at /DATASET 
	},
	
	// private parameters
		
	admitRule: null, 	//< admitRule all clients by default 	
		/*{ 
			"u.s. government": "required",
			"us": "optional"
		}*/

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
							}).end();
							//sql.release();
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
		
		gridify: function (recs,noheader) {	//< dump dataset as html table
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
		@member context
		Defines site context keys to load skinning context before a skin is rendered.
		Each skin has its own {key: "SQL DB.TABLE" || "/URL?QUERY", ... } spec.
		*/
		context: { 
			swag: {  // context keys for swag.view
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
		noIngest: new Error("invalid/missing ingest dataset"),
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
		ingest: {
			artillery: ENV.SRV_ARTILLERY,
			missiles: ENV.SRV_MISSILES
		},

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
				shares: "",
				uploads: "",
				stores: "",
				tour: "",
				data: ""
			},
			extensions: {  // extend mime types as needed
				rdp: "application/mstsc",
				run: "text/html",
				exe: "text/html",
				js: "text/plain",
				py: "text/plain",
				ma: "text/plain"
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
		},
		
		function hyper(ref) { 
			return [this].linkify(ref);
		}
		
		/*
		function hyper(ref) {
		/ **
		@private
		@member String
		Return a hyperlink of given label string.
		* /
			if (ref)
				if (ref.charAt(0) == ":")
					return this.link( "/"+(ref.substr(1)||this.toLowerCase())+".view" );
				else
					return this.link(ref);
			else
				return this.link(ref || "/"+this.toLowerCase()+".view");
		} */
	],
	
	Array: [  // array prototypes
		/*
		function hyper(refs, arg) {
		/ **
		@private
		@member Array
		Returns list containing hyperlink list joined by an arg spearator.
		@param {Function} cb callback(val) returns item for join
		* /		
			var rtns = [], ref = ref[0];
			this.each( function (n,lab) {
				rtns.push( lab.hyper(refs[n] || ref) );
			});
			return rtns.join(arg);
		}, */

		function clone() {
			/*
			@member Array
			@method clone
			Return a cloned copy of this records
			*/
			
			var recs = this, copyRecs = [];
			recs.forEach( function (rec) {  // clone ds recs
				copyRecs.push( new Object(rec) );
			});
			return recs;
		},
		
		function blogify( keys, ds, cb ) {
			/*
			@member Array
			@method blogify
			@param [List] keys list of keys to blogify
			@param [String] ds Name of dataset being blogged
			@param [Function] cb callback(recs) blogified version of records
			*/
			
			function renderRecord(rtn, rec, ds, cb) {  // blog=key,... request flag
				function renderJAX(jaxList,rtn,cb) {
					var 
						rendered = 0, renders = jaxList.length;

					//Log("jax",renders);
					jaxList.each( function (n,jax) {

						JAX.typeset({
							math: jax.jax,
							format: jax.fmt, //"TeX",  // TeX, inline-TeX, AsciiMath, MathML
							//html: true,
							mml: true
						}, function (d) {
							rtn = rtn.replace("!jax"+n+".", d.mml);

							//Log(rendered, renders);
							if ( ++rendered == renders ) cb(rtn);
						});

					});

					if ( !renders ) cb(rtn);
				}
				
				var jaxList = [], cache = {}, $ = {};

				for (var key in rec) try { $[key] = JSON.parse( rec[key] ); } catch (err) {};
				
				renderJAX( 
					jaxList, 

					rtn
						.replace(/\$\$\{(.*?)\}/g, function (str,key) {  // $${ TeX matrix key } markdown
							function texify(recs) {
								var tex = [];
								recs.forEach( function (rec) {
									if (rec.forEach) {
										rec.forEach( function (val,idx) {
											rec[idx] = val.toFixed ? val.toFixed(2) : val.toUpperCase ? val : JSON.stringify(val);
										});
										tex.push( rec.join(" & ") );
									}
									else
										tex.push( rec.toFixed ? rec.toFixed(2) : rec.toUpperCase ? rec : JSON.stringify(rec) );
								});	
								return  "\\begin{matrix}" + tex.join("\\\\") + "\\end{matrix}";
							}
							
							if (  key in cache )
								return cache[key];
							
							else {
								try {
									var val = eval( `$.${key}` );
								}
								catch (err) {
									var val =  rec[key];
								}
								return cache[key] = val.toFixed ? val.toFixed(2) : val.toUpperCase ? val : texify(val);
							}							
						})
						.replace(/\$\{(.*?)\}\((.*?)\)/g, function (str,key,short) {  // ${ key }( short ) markdown
							if (  key in cache )
								return cache[key];
							
							else {
								try {
									var val = eval( `$.${key}` );
								}
								catch (err) {
									var val =  rec[key];
								}
								return cache[key] = cache[short] = val.toFixed ? val.toFixed(2) : val.toUpperCase ? val : val+"";
							}							
						})
						.replace(/\$\{(.*?)\}/g, function (str,key) {  // ${ key } markdown
							if (  key in cache )
								return cache[key];
							
							else {
								try {
									var val = eval( `$.${key}` );
								}
								catch (err) {
									var val =  rec[key];
								}
								return cache[key] = val.toFixed ? val.toFixed(2) : val.toUpperCase ? val : val+"";
							}							
						})
						.replace(/\!{(.*?)\}/g, function (str,expr) { // !{ cexpression } markdown
							function Eval(expr) {
								try {
									return eval(expr);
								} 
								catch (err) {
									return err+"";
								}
							}
							return Eval(expr);
						})
						.replace(/\$\$(.*?)\$\$/g, function (str,jax) {  //  $$ standalone TeX $$ markdown
							jaxList.push({ jax: jax, fmt:"TeX"});
							return "!jax"+(jaxList.length-1)+".";
						})
						.replace(/a\$(.*?)\$/g, function (str,jax) {  // a$ ascii math $ markdown
							jaxList.push({ jax: jax, fmt:"asciiMatch"});
							return "!jax"+(jaxList.length-1)+".";
						})
						.replace(/m\$(.*?)\$/g, function (str,jax) {  // m$ math ML $ markdown
							jaxList.push({ jax: jax, fmt:"MathML"});
							return "!jax"+(jaxList.length-1)+".";
						})
						.replace(/!\$(.*?)\$/g, function (str,jax) {  // !$ inline TeX $ markdown
							jaxList.push({ jax: jax, fmt:"inline-TeX"});
							return "!jax"+(jaxList.length-1)+".";
						})				
						.replace(/\[(.*?)\]\((.*?)\)/g, function (str,link,src) {  // [link](src) or [view;w;h;...](src) markdown
							var
								links = link.split(";"),
								view = links[0],
								w = links[1] || 100,
								h = links[2] || 100,
								keys = {},
								path = ds.parsePath(keys),
								path = src.replace(/;/g,"&").parsePath(keys) || path,
								opsrc =  `/${view}.view`.tag( "?", Copy({w:w,h:h,src:path}, keys) );
							
							//Log(view, keys, opsrc);
							switch (view) {
								case "image":
								case "img":
									return "".tag("img", { src:src, width:w, height:h });
								case "post":
								case "iframe":
									return "".tag("iframe", { src:src, width:w, height:h });
								default:
									return (view == link)
											? link.tag("a",{ href:src }) 
											: "".tag("iframe",{ src: opsrc, width:w, height:h } ) ;
							}
						})
						.replace(/href=(.*?)\>/g, function (str,ref) { // follow <a href=REF>A</a> links
							var q = (ref.charAt(0) == "'") ? '"' : "'";
							return `href=${q}javascript:navigator.follow(${ref},BASE.user.client,BASE.user.source)${q}>`;
						}) 	,  
					
					cb
				); 
			}
		
			var recs = this, rendered = 0, renders = recs.length;

			keys.each(function (n,key) {
				recs.each( function (n, rec) {
					if ( val = rec[key] )
						if (val.constructor == String)
							renderRecord( val, rec, "/"+ds+"?ID="+rec.ID, function (html) {
								rec[key] = html;
								//Log("rec",rendered, renders);
								if ( ++rendered == renders ) cb(recs);
							});
				});
			});
			if ( !renders ) cb(recs);								
		},
		
		function isEmpty() {
			return this.length == 0;
		},
		
		function stashify(watchKey, targetPrefix, ctx, stash, cb) {
			/*
			@member Array
			@method stashify
			@param [String] watchKey  this = [ { watchKey:"KEY", x:X, y: Y, ...}, ... }
			@param [String] targetPrefix  stash = { targetPrefix: { x: [X,...], y: [Y,...], ... }, ... } 
			@param [Object] ctx plugin context keys
			@param [Object] stash refactored output suitable for a Save_KEY
			@param [Function] cb callback(ev,stat) returns refactored result to put into stash
			Used by plugins for refactoring process output into Save_KEY stashes
			*/
			
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
			@member Array
			@method merge
			@param [Array] Recs Source records to merge into this records
			@param [String] idx Key name to use for detecting record changes
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
			@member Array
			@method treeify
			@param [Number] idx starting index (0 on first call)
			@param [Number] kids number of leafs following starting index (this.length on first call)
			@param [Number] level current depth (0 on first call)
			@param [Array] keys pivot keys
			@param [String] wt key name that contains leaf weight (defaults to "size")
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
		},
		
		function listify( cb ) {
			/*
			@member Array
			@method listify
			@param {Function} cb callback(rec) returns recordresults to append
			Returns a sample of each record from this records using a callback to sample
			*/
			var rtns = [];
			this.forEach( function (rec) {
				rtns.push( cb(rec) );
			});
			return rtns;
		},
						 
		function joinify(sep, cb) {
			/* 
			@member Array
			@method joingify
			@param [String] sep seperator
			@param [Function] cb callback(rec) returns sample of supplied record
			*/
			
			if (cb) {
				var recs = [];
				if (cb.constructor == Function) 
					this.each( function (n,rec) {
						recs.push( cb(rec) );
					});
			
				else 
					this.each( function (n,rec) {
						recs.push( rec[cb] );
					});

				return recs.join(sep);
			}
				
			else
				return this.join(sep);
		},
		
		function linkify(ref) {
			/*
			@member Array
			@method linkify
			@param {String} ref
			Returns a ref-joined list of links
			*/
			
			return this.joinify(",", function (label) {
				
				if (ref)
					if (ref.charAt(0) == ":")
						return label.link( "/"+(ref.substr(1) || label.toLowerCase())+".view" );
					else
						return label.link(ref);
				else
					return label.link(ref || "/"+label.toLowerCase()+".view");
				
			});
		}
	],	
	
	Date: [  // date prototypes
		function addDays(days) {
			this.setDate( this.getDate() + days);
			return this;
		}		
	],
		
	/**
	@cfg {Boolean}
	@member DEBE
	Enabled when this is child server spawned by a master server
	*/
	isSpawned: false, 			//< Enabled when this is child server spawned by a master server

	gradeIngest: function (sql, file, cb) {  //< callback cb(stats) or cb(null) if error
		
		var ctx = {
			//Batch: 10, // batch size in steps
			Solve: {
				Batch: 50,
				lma: [70]
			},
			_File: {
				Actors: file.Actors,  // ensemble size
				States: file.States, // number of states consumed by process
				Steps: file.Steps, // number of time steps
			},
			_Events: sql.format(  // event query
				"SELECT * FROM app.events WHERE fileID=? ORDER BY t LIMIT 10000", [file.ID] )
		};
		
		Log("ingest stats ctx", ctx);
		
		if (estpr = JSLAB.plugins.estpr) 
			estpr( ctx, function (ctx) {  // estimate/learn hidden process parameters
				
				if ( ctx ) {
					var stats = ctx.Save.pop() || {};  // retain last estimate at end
					Log("ingest stats", stats);

					cb(stats);
				}
				
				else
					cb(null);
			}); 
		
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
		
	/*
	loader: function (url,fetcher,req,res) { // generic data loader
	/ **
	@member DEBE
	@private
	@method loader
	@param {String} url path to source
	@param {String} fetcher data fetcher
	@param {Object} req http request
	@param {Function} res Totom response callback
	* /
		fetcher( url.tag("?",req), null, res );
	},

	loaders: { // data loading services
		catalog: function (req,res) { DEBE.loader( DEBE.paths.wfs.spoof, DEBE.fetcher, req, res ); },
		image: function (req,res) { DEBE.loader( DEBE.paths.wms.spoof, DEBE.fetcher, req, res ); },
		events: function (req,res) { DEBE.loader( DEBE.paths.sss.spoof, DEBE.fetcher, req, res ); },
		stats: function (req,res) { DEBE.loader( DEBE.paths.sss.stats, DEBE.fetcher, req, res ); },
		gaussmix: function (req,res) { DEBE.loader( DEBE.paths.sss.gaussmix, DEBE.fetcher, req, res ); },
		save: {}
	},
	*/
		
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
		sql.eachTable( group, function (table) {  // look for plugins that have a data loader and a Pipe key
			var tarkeys = [], srckeys = [], hasJob = false;

			// if (table == "gaussmix") // debug filter
			if ( loader = DEBE.loaders[table] )
				sql.query(  // get plugin usecase keys
					"SHOW FIELDS FROM ??.?? WHERE Field != 'ID' ", 
					[ group, table ], 
					function (err,keys) {

					keys.each( function (n,key) { // look for Pipe key
						var keyesc = "`" + key.Field + "`";
						switch (key.Field) {
							case "Save":
								break;
							case "Pipe":
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
		
	ingestFile: function(sql, filePath, fileName, fileID, cb) {  // ingest events from file with callback cb(aoi).
		
		//var trace = "INGEST";
		
		Log("ingest file", filePath, fileName, fileID);
		
		HACK.ingestFile(sql, filePath, fileID, function (aoi) {
			
			Log("ingest aoi", aoi);
			var
				ctx = {
					Pipe: JSON.stringify({
						file: fileName, limit: 1000, aoi: [ [0,0], [0,0], [0,0], [0,0], [0,0] ]
					}),
					Name: "ingest."+fileName,
					Description: "see " + fileName.tag("a",{href:`/files.view?ID=${fileID}`}) + " for details"
				};

			if (false)  // add use case to ingested file in all listening plugins
			FLEX.eachPlugin( sql, "app", function (eng) {
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
}

/**
@class MAINT service maintenance endpoints
*/

/*
function sysAgent(req,res) {
	var 
		query = req.query,
		cb = ATOM.mw.cb[query.job];
	
	Log("AGENT", query);
	cb(0);
}
*/

function sysIngest(req,res) {
	var 
		sql = req.sql,
		query = req.query,
		body = req.body,
		src = query.src,
		fileID = query.fileID,
		path = DEBE.paths.ingest[src],
		onIngest = DEBE.onIngest[src],
		fetcher = DEBE.fetcher;
	
	Log("INGEST", query, body, path);
	res("submitted");
	
	if ( path && onIngest ) {
		sql.query("DELETE FROM app.events WHERE ?", {fileID: fileID});
		fetcher( path.parseJS(query), null, function (evs) {
			if (evs)
				onIngest( evs, function (evs) {
					HACK.ingestList( sql, evs, fileID, function (aoi) {
						Log("INGEST aoi", aoi);
					});
				});
		
			else
				Log("INGEST no events");
		});
	}
	
	else
		Trace("INGEST bad src");

}

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
					paths = DEBE.paths,
					site = DEBE.site,
					master = site.urls.master,
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
		
		function saveKey(sql, key, args) {
			sql.query(`UPDATE ??.?? SET ${key}=? WHERE ?`, args, function (err) {
				Log("SAVE", key, err?"failed":"");
			});
		}

		var 
			status = "", // returned status
			filename = `${table}.${ctx.Name}`, // export/ingest file name
			stash = { };  // ingestable keys stash
			
		if ( !stats )
			return "empty";
		
		else
		if ( stats.constructor == Error )
			return stats+"";
		
		else
		if ( stats.constructor == Array ) {  // keys in the plugin context are used to create save stashes
			var rem = [], stash = { remainder: rem };  // stash for saveable keys 
			
			stats.stashify("at", "Save_", ctx, stash, function (ev, stat) {  // add {at:"KEY",...} stats to the Save_KEY stash
				
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

				if ( ctx.Export ) {   // export to ./public/stores/FILENAME
					var
						evidx = 0,
						evs = rem,  // point event source to remainder
						srcStream = new STREAM.Readable({    // establish source stream for export pipe
							objectMode: false,
							read: function () {  // read event source
								if ( ev = evs[evidx++] )  // still have an event
									this.push( JSON.stringify(ev)+"\n" );
								else 		// signal events exhausted
									this.push( null );
							}
						});
					
					DEBE.uploadFile( "", srcStream, `stores/${filename}.${group}.${client}` );
					status += " Exported";
				}

				if ( ctx.Ingest )  {
					DEBE.getFile( client, `ingest/${filename}`, function (fileID) {
						HACK.ingestList( sql, rem, fileID, function (aoi, evs) {
							Log("INGESTED ",aoi);
						});
					});
					status += " Ingested";
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

		status += " Saved"
		for (var key in stash) 
			saveKey(sql, key, [ 
				group, table, JSON.stringify(stash[key]), {ID: ctx.ID}
			]);

		return ctx.Share ? stats : status.tag("a",{href: "/files.view"});
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
			if (ctx.constructor == Error)
				res( ctx );
			
			else
			if ( Pipe = ctx.Pipe )  { // Intercept job request to run engine via regulator
				res("Regulating");
				var
					profile = req.profile,
					job = { // job descriptor for regulator
						qos: 1, //profile.QoS, 
						priority: 0,
						client: req.client,
						class: req.table,
						credit: profile.Credit,
						name: req.table,
						task: Pipe.task || "",
						notes: [
								req.table.tag("?",req.query).tag("a", {href:"/" + req.table + ".run"}), 
								((profile.Credit>0) ? "funded" : "unfunded").tag("a",{href:req.url}),
								"RTP".tag("a", {
									href:`/rtpsqd.view?task=${Pipe.task}`
								}),
								"PMR brief".tag("a", {
									href:`/briefs.view?options=${Pipe.task}`
								})
						].join(" || ")
					};

				HACK.chipEvents(req, Pipe, function ( specs ) {  // create job for these Pipe parameters

					sql.insertJob( Copy(specs,job), function (sql, job) {  // put job into the job queue
						req.query = Copy({  // engine request query gets copied to its context
							_Host: req.table,
							_File: job.File,
							_Voxel: job.Voxel,
							_Collects: job.Collects,
							_Flux: job.Flux,
							_Events: job.Events || "",
							_Flush: job.Flush,
							_Chip: job.Chip
						}, ctx);

						ATOM.select(req, function (ctx) {  // run plugin's engine
							if (ctx) {
								if ( "Save" in ctx )
									saveResults( Array.from(ctx.Save || [] ), ctx );
							}

							else
								Log( `REG ${job.name} HALTED` );
						});
					});
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
		ATOM.select(req, res);
	
	else
		res(DEBE.errors.noUsecase);

}

function sendDoc(req, res) {
	var
		site = DEBE.site,
		master = "http://localhost:8080", //site.urls.master,	
		query = req.query,
		type = req.type.substr(1),
		name = req.table,
		docf = `./shares/${req.table}.${type}`;	

	res( "Claim file "+"here".link(docf) );

	switch (type) {
		case "pdf":
		case "jpg":
		case "gif":
			
			var 
				url = `${master}/${name}.view`.tag("?", query),
				res = (type != "pdf") ? "1920px" : "";
			
			Trace("SCRAPE "+url);
			CP.execFile( "node", ["phantomjs", "rasterize.js", url, docf, res], function (err,stdout) { 
				if (err) Log(err,stdout);
			});
			break;

		default:

	}
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
		query = req.query,
		paths = DEBE.paths,
		site = DEBE.site,  
		urls = site.urls,
		ctx = site.context[req.table]; 
		
	function dsContext(sql, ctx, cb) { // callbacl cb() after loading datasets required for this skin
		
		if (ctx) // render in extended context
			Each(ctx,  function (siteKey, ds, isLast) {
				if ( ds.charAt(0) == "/" ) 
					DEBE.fetcher( (urls.master+ds).parseJS(query), null, function (data) {
						switch ( (data||0).constructor ) {
							case Array:
								site[siteKey] = data.clone();
								break;
							case Object:
								site[siteKey] = Copy( data, {} );
								break;
							default:
								site[siteKey] = data;
								break;
						}
						if ( isLast ) cb();	
					});

				else
					sql.forAll("CTX-"+siteKey, "SELECT * FROM ??", [ds], function (recs) {
						site[siteKey] = recs.clone();
						if ( isLast ) cb();
					});
			});
				
			/*
			sql.context(ctx, function (ctx) {  // establish a sql dsvar context

				var isEmpty = Each(ctx, function (ds, x, isLast) {
					x.args = {ds:ds}; 	// hold ds name for use after select
					x.rec = function clone(recs,me) {  // select and clone the records 
						site[me.args.ds] = recs; 		// save data into the context
						if (isLast) cb();  // all ds loaded so can render with cb
					};
				});

				if ( isEmpty ) cb();

			}); */
		
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
					//search: req.search,
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
		
		sql.forFirst("", paths.engine, { // Try a jade engine
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
	
	if (type) {	
		res( "Claim file "+"here".link(docf) );
		
		var
			docx = ODOC({
				type: type
				//onend: function (writeBytes) { 	}
			}),			
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
	}
	
	else
		res(DEBE.errors.badOffice);
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
			DEBE.byTable[n] = ATOM[n];
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
	 * Initialize the FLEX and ATOM interfaces
	 */

		//Trace(`INIT FLEX`);
		
		Each( CRUDE, function (n,routes) {  // redirect dataset crude calls
			DEBE[n] = FLEX[n].ds;
			DEBE.byActionTable[n] = FLEX[n];
		});	

		FLEX.config({ 
			thread: sqlThread,
			emitter: DEBE.IO ? DEBE.IO.sockets.emit : null,
			skinner: JADE,
			fetcher: DEBE.fetcher,
			indexer: DEBE.indexFile,
			uploader: DEBE.uploadFile,

			createCert: DEBE.createCert,
			
			dbRoutes: {
				roles: "openv",
				aspreqts: "openv",
				ispreqts: "openv",
				swreqts: "openv",
				hwreqts: "openv",
				tta: "openv",
				trades: "openv",
				milestones: "openv",
				journal: "openv",
				hawks: "openv",
				attrs: "openv",
				issues: "openv"
			},
			
			diag: DEBE.diag,
			
			site: DEBE.site						// Site parameters

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

			/*
			likeus : {
				BILLING : 1,				// Billing cycle [days]
				PING : 0.5	 				// Check period [days]
			},
			*/
			
		});

		//Trace(`INIT ATOMS`);

		HACK.config({
			//source: "",
			taskPlugin: null,
			fetcher: DEBE.fetcher,
			thread: sqlThread
		});
		
		JSLAB.config({
			thread: sqlThread,
			fetcher: DEBE.fetcher
		});
		
		ATOM.config({
			thread: sqlThread,
			cores: DEBE.cores,
			watchFile: DEBE.watchFile,
			plugins: Copy({   // share selected FLEX and other modules with engines
				MAIL: FLEX.sendMail,
				RAN: require("randpr"),
				TASK: DEBE.tasker
			}, JSLAB.libs)
		});
		
		if (cb) cb();	
	}
	
	initENV( function () {  // init the global environment
	initSES( function () {	// init session handelling
	initSQL( function () {	// init the sql interface

		JAX.config({
			MathJax: {
				tex2jax: {
					//displayMath: [["$$","$$"]]
				}
			}
		});
		JAX.start();
		
		sqlThread( function (sql) {
			
			if (onStartup = DEBE.onStartup) onStartup();
			
			var path = DEBE.paths.render;
			
			if (false)
			DEBE.indexFile( path, function (files) {  // publish new engines
				var ignore = {".": true, "_": true};
				files.each( function (n,file) {
					if ( !ignore[file.charAt(0)] )
						try {
							Trace("PUBLISHING "+file);
	
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
			
			sql.release();
		});
		

	}); }); }); 
} 

function Trace(msg,arg) {
	TOTEM.trace("D>",msg,arg);
}

function siteContext(req, cb) {
	
	cb( Copy(DEBE.site, {
		table: req.table,
		dataset: req.table,
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
		//search: req.search,
		session: req.session,
		util: {
			cpu: (req.log.Util*100).toFixed(0),
			disk: ((req.profile.useDisk / req.profile.maxDisk)*100).toFixed(0)
		},
		started: DEBE.started,
		filename: DEBE.paths.jaderef,
		url: req.url
	}) );
	
}

// UNCLASSIFIED
