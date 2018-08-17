// UNCLASSIFIED 
/**
@class DEBE
@requires child_process
@requires cluster
@requires child-process
@requires fs
@requires stream
@requires crypto

@requires i18n-abide
@requires socket.io
@requires socket.io-clusterhub
@requires jade
@requires jade-filters
@requires optimist
@requires tokml
@requires mathjax-node

@requires flex
@requires totem
@requires atomic
@requires geohack
@requires jslab
@requires jsdb
@requires randpr

@requires strdif
@requires string-similarity

Required env vars: none

Required openv.datasets:
	profiles, viewers, apps
	
Required app.datasets:
	voxels, files, events, queues, engines, dblogs, quizes
	
*/

var 									
	// globals
	ENV = process.env,
	TRACE = "D>",
	WINDOWS = process.platform == 'win32',		//< Is Windows platform

	// NodeJS modules
	CP = require("child_process"), 		//< Child process threads
	CLUSTER = require("cluster"), 		//< Support for multiple cores
	STREAM = require("stream"), 		//< pipe streaming
	CRYPTO = require("crypto"), 		//< crypto package
	FS = require("fs"), 				//< NodeJS filesystem and uploads
	URL = require("url"),
	
	// 3rd party modules
	ODOC = require("officegen"), 	//< office doc generator
	LANG = require('i18n-abide'), 		//< I18 language translator
	ARGP = require('optimist'),			//< Command line argument processor
	TOKML = require("tokml"), 			//< geojson to kml convertor
	JAX = require("mathjax-node"),   //< servde side mathjax parser
	JADE = require('jade'),				//< using jade as the skinner
	
	// totem modules		
	ATOM = require("atomic"), 
	FLEX = require("flex"),
	TOTEM = require("totem"),
	LAB = require("jslab"),
	JSDB = require("jsdb"),
	RAN = require("randpr"),
	HACK = require("geohack");

const { Copy,Each,Log } = require("enum");

var										// shortcuts and globals
	Thread = TOTEM.thread;
	
var
	DEBE = module.exports = Copy({
	
	init: Initialize,
		
	plugins: LAB.libs,
		
	autoTask: {  //< reserved for autorun plugins determined at startup
	},
		
	ingester: function ingester( opts, query, cb ) {
		function flowEvents(data, cb){
			var evs = [];
			if (recs = opts.get ? data[opts.get] : data) {
				Log("ingest recs", recs.length);
				recs.forEach( function (rec, idx) {
					if (ev = opts.ev) 
						if ( ev.constructor == String ) {
							var 
								ctx = VM.createContext({rec: rec, query: query, evs: evs}),
								reader = `evs.push( (${opts.ev})(rec, evs.length) );` ;

							VM.runInContext( reader, ctx );
						}

						else
							evs.push( ev(rec, evs.length) );

					else
						evs.push( rec );
				});
			}
			cb(evs);
		}
		
		var fetcher = DEBE.fetch.fetcher;
		
		try {
			if (url = opts.url)
				switch (url.constructor) {
					case String:
						fetcher( url, query, opts.put||null, function (data) {
							if ( data = data.parseJSON() ) 
								flowEvents(data, cb);
						});
						break;
						
					case Function:
						url( function (data) {
							flowEvents(data, cb );
						});
						break;
						
					default:
						flowEvents(url, cb);
				}
		}
		
		catch(err) {
			Log("INGESTER",err);
		}
	},
		
	onIngest: require("./ingesters"),

	onStartup: function (sql) {
		var
			site = DEBE.site,
			pocs = site.pocs,
			sendMail = FLEX.sendMail,
			autoTask = DEBE.autoTask;
		
		if (pocs.admin)
			sendMail({
				to: pocs.admin,
				subject: site.title + " started", 
				body: "Just FYI"
			});
		
		sql.getTables("app", function (tables) {  // scan through all tables looking for plugins participating w ingest
			tables.forEach( function (dsn) {
				sql.forFirst(
					"",
					"SELECT * FROM app.?? WHERE Name='ingest' LIMIT 1", 
					[dsn], function (ctx) {

					if (ctx) {
						autoTask[dsn] = Copy(ctx, {});
						Trace("AUTOADD "+dsn);
					}
				});
			});
		});
		
	},
		
	// watchdog configuration
		
	dogs: {  //< watch dogs cycle time in secs (zero to disable)
		dogCatalog: Copy({
			//cycle: 1000
		}, function dogCatalog(dog) {
		}),
		
		dogDetectors: Copy({
			//cycle: 400
		}, function dogDetectors(dog) {
		}),
						   
		dogVoxels: Copy({
			get: {
				//unused: 
				//	"SELECT voxels.ID AS ID,aois.ID AS aoiID FROM app.voxels "
				//+ " LEFT JOIN app.aois ON aois.name=voxels.class HAVING aoiID IS null"
				//, refresh: "SELECT ID FROM app.voxels WHERE MBRcontains(ring, GeomFromText(?)) AND datediff(now(), added) > ?"
			},
			cycle: 120,
			atmage: 2 // days to age before refresh atm data
		}, function dogVoxels(dog) {
			
			if (dog.get.unused)
				JSDB.forEach(dog.trace, dog.get.unused, [], function (voxel, sql) {
					sql.query("DELETE FROM app.voxels WHERE ?", {ID: voxel.ID});
				});
			
			if (dog.get.refresh)  // fetch new atm data from whatever service and loop over recs (grouped by Point(x y) grid location)
				JSDB.forEach(dog.trace, dog.get.refresh, [atm.gridLocation, dog.atmage], function (voxel, sql) {
					// update voxels with atm data
				});
			
		}),
						
		dogCache: Copy({
			//cycle: 120
		}, function dogCache(dog) {
		}),
		
		dogStats: Copy({
			get: {
				lowsnr: 
					"SELECT count(events.ID) AS Rejects, events.voxelID AS voxelID, events.fileID AS fileID FROM app.events"
					+ " LEFT JOIN app.voxels ON voxels.ID = events.voxelID"
					+ " LEFT JOIN app.files ON files.ID = events.fileID"
					+ " WHERE files.snr < voxels.minsnr"
					+ " GROUP BY events.voxelID, events.fileID"
			}
		}, function dogStats(dog) {
			
			if (dog.get.lowsnr)
			JSDB.forEach(dog.trace, dog.get.lowsnr, [], function (prune, sql) {
				Trace("PRUNE "+[prune.fileID, prune.voxelID]);

				sql.query(
					"UPDATE app.files SET Rejects=Rejects+?,Relevance=1-Rejects/Samples WHERE ?", 
					[ prune.Rejects, {ID: prune.fileID} ] 
				);

				sql.query(
					"DELETE FROM app.events WHERE least(?)", 
					{fileID: prune.fileID, voxelID: prune.voxelID}
				);

				/*sql.forAll(dog.trace, dog.get.lowsnr, [ file.snr, {"events.fileID": file.ID} ], function (evs) {
					//Log("dog rejected", evs.length);
					sql.query(
						"UPDATE app.files SET Rejects=Rejects+?,Relevance=1-Rejects/Samples WHERE ?", 
						[ evs.length, {ID: file.ID} ] 
					);

					evs.each( function (n,ev) {
						sql.query("DELETE FROM app.events WHERE ?", {ID: ev.ID});
					}); 
				}); */
			});
			
		}),
					   
		dogFiles: Copy({
			get: {
				ungraded: "SELECT ID,Name FROM app.files WHERE _State_graded IS null AND _Ingest_Time>_Ingest_End AND Enabled",
				unread: "SELECT ID,Ring, st_centroid(ring) as Anchor, _Ingest_Time,advanceDays,PoP_durationDays,sampleTime,Name FROM app.files WHERE _Ingest_Time>=_Ingest_Start AND _Ingest_Time<=_Ingest_End AND Enabled",
				//finished: "SELECT ID,Name FROM app.files WHERE _Ingest_Time>_Ingest_End",
				expired: "SELECT ID,Name FROM app.files WHERE PoP_Expires AND now() > PoP_Expires AND Enabled"
				//retired: "SELECT files.ID,files.Name,files.Client,count(events.id) AS evCount FROM app.events LEFT JOIN app.files ON events.fileID = files.id "
						//+ " WHERE datediff( now(), files.added)>=? AND NOT files.Archived AND Enabled GROUP BY fileID"
			},		
			cycle: 30, // secs
			maxage: 90 // days
		}, function dogFiles(dog) {
			
			function pretty(stats,sigfig) {
				var rtn = [];
				Each(stats, function (key,stat) {
					rtn.push( (stat||0).toFixed(sigfig) + " " + key );
				});
				return rtn.join(", ");
			}
			
			var 
				urls = DEBE.site.urls,
				fetcher = DEBE.fetch.fetcher;

			/*
			JSDB.forEach(dog.trace, dog.get.ungraded, [], function (file, sql) {
				Trace("GRADE "+file.Name);

				DEBE.gradeIngest( sql, file, function (stats) {

					Log("grade", stats);

					if (stats) {
						var unsup = stats.unsupervised;

						sql.forAll(
							dog.trace,
							"UPDATE app.files SET _State_graded=true, ?, _State_Notes=concat(_State_Notes,?) WHERE ?", [{
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
							"UPDATE apps.file SET _State_graded=true, snr=0, _State_Notes=? WHERE ?", [
							"Grading failed", {ID: file.ID} 
						]);
				});
			});
			*/
			
			if (dog.get.expired)
				JSDB.forEach(dog.trace, dog.get.expired, [], function (file, sql) { 
					Trace("EXPIRE "+file.Name);
					sql.query("DELETE FROM app.events WHERE ?", {fileID: file.ID});
				});
			
			if (dog.get.retired)
				JSDB.forEach(dog.trace, dog.get.retired, dog.maxage, function (file, sql) {
					Trace("RETIRE "+file.Name);

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

					sql.query( "UPDATE app.files SET ?, _State_Notes=concat(_State_Notes,?)", [{
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
			
			if (dog.get.finished)
				JSDB.forEach(dog.trace, dog.get.finished, [], function (file, sql) {
					Trace("FINISHED "+file.Name);
					//sql.query("UPDATE app.files SET _State_ingested=1 WHERE ?",{ID:file.ID});
				});
			
			if (dog.get.unread)
				JSDB.forEach(dog.trace, dog.get.unread, [], function (file, sql) {
					Trace("INGEST "+file.Name);
					var
						zero = {x:0, y:0},
						ring = file.Ring || [[ zero, zero, zero, zero, zero]],
						anchor = file.Anchor || zero,
						from = new Date(file._Ingest_Time),
						to = from.addDays(file.PoP_durationDays),
						path = urls.master + file.Name;

					fetcher( path.tag("&", {
						fileID: file.ID,
						from: from.toLocaleDateString("en-US"),
						to: to.toLocaleDateString("en-US"),
						lat: anchor.x,
						lon: anchor.y,
						radius: HACK.ringRadius(ring),
						ring: ring,
						durationDays: file.PoP_durationDays
					}), null, null, function (msg) {
						Log("INGEST", msg);
					});

					if (1)
					sql.query(
						"UPDATE app.files SET _Ingest_Time=date_add(_Ingest_Time, interval advanceDays day), Revs=Revs+1 WHERE ?", 
						{ ID: file.ID }
					);
				});
			
		}),
		
		dogJobs: Copy({
			get: {
				unbilled: "SELECT * FROM app.queues WHERE Finished AND NOT Billed",
				unfunded: "SELECT * FROM app.queues WHERE NOT Funded AND now()-Arrived>?",				
				stuck: "UPDATE app.queues SET Departed=now(), Notes=concat(Notes, ' is ', link('billed', '/profile.view')), Age=Age + (now()-Arrived)/3600e3, Finished=1 WHERE least(Departed IS NULL,Done=Work)", 
				polled: "SELECT * FROM app.queues WHERE Class='polled' AND Now() > Departed"
			},
			maxage: 10,
			cycle: 300
		}, function dogJobs(dog) {
			var
				queues = FLEX.queues,
				fetcher = DEBE.fetch.fetcher;

			if (dog.get.unbilled)
				JSDB.forEach(dog.trace, dog.get.unbilled, [], function (job, sql) {
					//Trace(`BILLING ${job} FOR ${job.Client}`, sql);
					sql.query( "UPDATE openv.profiles SET Charge=Charge+? WHERE ?", [ 
						job.Done, {Client: job.Client} 
					]);

					sql.query( "UPDATE app.queues SET Billed=1 WHERE ?", {ID: job.ID})
				});

			if (dog.get.unfunded)
				JSDB.forEach(dog.trace, dog.get.unfunded, [dog.maxage], function (job, sql) {
					//Trace("KILLING ",job);
					sql.query(
						//"DELETE FROM app.queues WHERE ?", {ID:job.ID}
					);
				});
			
			if (dog.get.stuck)
				JSDB.forAll( dog.trace, dog.get.stuck, [], function (info, sql) {

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
			
			if (dog.get.polled)
				JSDB.forEach( dog.trace, dog.get.polled, [], function (job, sql) {
					sql.query(
						"UPDATE app.queues SET ?,Age=Age+Work,Departed=Date_Add(Departed,interval Work day) WHERE ?", [
						{ID:job.ID}
					] );
					
					fetcher( job.Notes, null, null, function (rtn) {
						Trace("dogjobrun "+msg);
					});
				});
		}),
			
		dogSystem: Copy({
			//cycle: 100,
			get: {
				engs: "SELECT count(ID) AS Count FROM app.engines WHERE Enabled",
				jobs: "SELECT count(ID) AS Count FROM app.queues WHERE Departed IS NULL",
				pigs: "SELECT sum(DateDiff(Departed,Arrived)>1) AS Count from app.queues",
				logs: "SELECT sum(Delay>20)+sum(Fault != '') AS Count FROM app.dblogs"
			},
			pigs : 2,
			jobs : 5
		}, function dogSystem(dog) {  // system diag watch dog
			var 
				diag = DEBE.diag;

			if (dog.get.engs)
				Thread( function (sql) {
					sql.forEach(dog.trace, dog.get.engs, [], function (engs) {
					sql.forEach(dog.trace, dog.get.jobs, [], function (jobs) {
					sql.forEach(dog.trace, dog.get.pigs, [], function (pigs) {
					sql.forEach(dog.trace, dog.get.logs, [], function (isps) {
						var rtn = diag.counts = {Engines:engs.Count,Jobs:jobs.Count,Pigs:pigs.Count,Faults:isps.Count,State:"ok"};

						for (var n in dog) 
							if ( rtn[n] > 5*dog[n] ) rtn.State = "critical";
							else
							if ( rtn[n] > dog[n] ) rtn.State = "warning";

						sql.release();
					});
					});
					});
					});
				});
		}),
			
		dogClients: Copy({
			//cycle: 100000,
			get: {
				needy: "SELECT ID FROM openv.profiles WHERE useDisk>?",
				dormant: "",
				poor: "",
				naughty: "SELECT ID FROM openv.profiles WHERE Banned",
				uncert: "SELECT ID FROM openv.profiles LEFT JOIN app.quizes ON profiles.Client=quizes.Client WHERE datediff(now(), quizes.Credited)>?",
			},
			disk: 10,  //MB
			qos: 2,  //0,1,2,...
			unused: 4,  // days
			certage: 360 // days
		}, function dogClients(dog) {

			if (dog.get.naughty)
				JSDB.forEach(dog.trace, dog.get.naughty, [], function (client, sql) {
				});

			if (dog.get.needy)
				JSDB.forEach(dog.trace, dog.get.needy, [dog.disk], function (client, sql) {
				});		

			if (dog.get.dormant)
				JSDB.forEach(dog.trace, dog.get.dormant, [dog.unused], function (client, sql) {
				});		

			if (dog.get.poor)
				JSDB.forEach(dog.trace, dog.dog.get.poor, [dog.qos], function (client, sql) {
				});		

			if (dog.get.uncert)
				JSDB.forEach(dog.trace, dog.get.uncert, [dog.certage], function (client, sql) {
				});		
			
		}),
			
		dogAutoruns: Copy({
			//cycle: 600
		}, function dogAutoruns(sql, dog) {

			for (var dsn in DEBE.autoTask) {
				sql.query("SELECT ID, ? AS _Plugin FROM app.? WHERE Autorun", [dsn, dsn])
				.on("result", (run) => {
					exePlugin({
						sql: sql,
						client: "watchdog",
						group: "app",
						table: run._Plugin,
						query: {ID: run.ID}
					}, function (msg) {
						Log(dsn,msg);
					});
				});
				
				sql.query("UPDATE app.? SET Autorun=0", [dsn]);
			}
		}),
			
		dogEngines: Copy({
			//cycle: 600,
			get: {
				"undefined": "",
				buggy: ""
			},
			"undefined": 123,
			bugs: 10
		}, function dogEngines(sql, dog) {
			
			if (dog.get.undefined)
				JSDB.forEach(dog.trace, dog.get.undefined, [dog.undefined], function (client, sql) {
				});
		}),
			
		dogUsers: Copy({
			get: {
				inactive: "",
				buggy: ""
			},			
			//cycle: 1000,
			inactive: 1,
			bugs: 10
		}, function dogUsers(dog) {
			if (dog.get.inactive)
				JSDB.forEach(dog.trace, dog.get.inactive, [dog.inactive], function (client, sql) {
				});		
		})
	},
	
	diag: {  //< reserved for self diag parms
		status: "", 
		counts: {State: ""}
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
			recs.blogify( req.sql, req.client, req.flags.blog.split(","), req.table, res );
		}
		
	},
											 
	"reqTypes." : { //< endpoint types to convert dataset recs on specifed req-res thread
		
		/*
		view: function (recs,req,res) {  //< dataset.view returns rendered skin
			res( recs );
		},*/
		
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
			res( DEBE.site.gridify( recs ).tag("table", {border: "1"}) );
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
		agent: sysAgent,
		//help: sysHelp,
		alert: sysAlert,
		//ping: sysPing,
		ingest: sysIngest
		//stop: sysStop,
		//bit: sysBIT,
		//atom: ATOM.exe
		//kill: sysKill,
		//start: sysStart,
		//checkpt: sysCheckpt,
		//codes: sysCodes,
		//config: sysConfig
	},
	
	"byType.": { //< routers for endpoint types at /DATASET.TYPE
		// file attributes
		//code: sharePlugin,
		//jade: sharePlugin,		
		classif: sendAttr,
		readability: sendAttr,
		client: sendAttr,
		size: sendAttr,
		risk: sendAttr,
		
		// doc generators
		xpdf: sendDoc,
		xjpg: sendDoc,
		xgif: sendDoc,
		
		// plugin attributes
		tou: sharePlugin,
		state: sharePlugin,
		js: sharePlugin,
		py: sharePlugin,
		m: sharePlugin,
		me: sharePlugin,
		jade: sharePlugin,
		get: sharePlugin,
		
		// skins
		view: renderSkin,
		calc: renderSkin,
		run: renderSkin,
		plugin: renderSkin,
		site: renderSkin,
		brief: renderSkin,
		pivot: renderSkin,
		gridbrief: renderSkin,
		runbrief: renderSkin,
		pivbrief: renderSkin,
		
		// plugins
		exe: exePlugin,
		add: extendPlugin,
		sub: retractPlugin
		//get: probePlugin
		
	},

	"byActionTable.": {  //< routers for CRUD endpoints at /DATASET 
	},
	
	// private parameters
		
	admitRule: { 	//< admitRule all clients by default 	
	},
		
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
					Thread( function (sql) {
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
			if (fn.charAt(0) != "/") fn = "/shares/hover/"+fn;
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
						
						recs.forEach( function (rec) {
							Each(rec, function (key,val) {
								heads[key] = key;
							});
						});
						
						recs.forEach( function (rec) {
							
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
									row += (val+"").tag("td");
								
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
			return "".tag("img",{src:"/stash/reject.jpg",width:40,height:60})
				+ (err+"").replace(/\n/g,"<br>").replace(process.cwd(),"").replace("Error:","")
				+ "; see "
				+ "issues".tag("a",{href: "/issues.view"})
				+ " for further information";
		},
		badAgent: new Error("bad agent request"),
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
		default: "home.view",
		
		jaderef: "./public/jade/ref.jade",	// jade reference path for includes, exports, appends
		
		engine: "SELECT * FROM app.engines WHERE least(?,1) LIMIT 1",
		jades: "./public/jade/",
		
		/*
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
		*/
		
		mime: {
			tour: ".",		 			//< enable totem touring 
			//jobs: "./public/jobs",		//< path to tau simulator job files
			stash: ".", 		//< totem static reserve
			stores: "./public", 		//< persistant scrape area
			uploads: "./public", 		//< one-time scrape area
			chips: "./public/images",	//< chipped files
			tips: "./public/images",	//< tipped files
			data: "./public",  //< debug data
			jade: "./public",
			shares: "./public", 				//< cached file area
			docs: ".", 					//< html documents
			socketio: ".",				//< path to socket.io
			clients: ".",				//< path to 3rd party ui clients
			uis: ".", 					//< path to debe ui drivers
			//icons: ".",				//< path to icons
			captcha: ".",				
			index: { 					//< paths for allowed file indexers ("" to use url path)
				shares: "",
				uploads: "",
				stores: "",
				public: "",
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
		}
		
		/*
		code: {
			py: "./public/py",
			js: "./public/js",
			mat: "./public/mat",
			jade: "./public/jade",
			html: "./public/htmls"
		} */
	},
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enable to give-away plugin services
	*/
	probono: false,  //< enable to run plugins unregulated
		
	//Function: Initialize,  //< added to ENUM callback stack

	/**
	@cfg {Boolean}
	@member DEBE
	Enabled when this is child server spawned by a master server
	*/
	isSpawned: false, 			//< Enabled when this is child server spawned by a master server

	/*
	gradeIngest: function (sql, file, cb) {  //< callback cb(stats) or cb(null) if error
		
		var ctx = {
			Flow: {
				F: "tbd",
				N: file._Ingest_Actors,  // ensemble size
				T: file.Steps  // number of time steps
			}, 
			lma: [70],
			Events: sql.format(  // event query
				"SELECT * FROM app.events WHERE fileID=? ORDER BY t LIMIT 10000", [file.ID] )
		};
		
		Log("ingest stats ctx", ctx);
		
		if (cints = LAB.plugins.cints) 
			cints( ctx, function (ctx) {  // estimate/learn hidden process parameters
				
				if ( ctx ) {
					var stats = ctx.Save.pop() || {};  // retain last estimate at end
					Log("ingest stats", stats);

					cb(stats);
				}
				
				else
					cb(null);
			}); 
		
	}, */
		
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
		
		//Log("ingest file", filePath, fileName, fileID);
		
		HACK.ingestFile(sql, filePath, fileID, function (aoi) {
			
			Log("INGESTED", aoi);
			/*
			var
				ctx = {
					Pipe: JSON.stringify({
						file: fileName, limit: 1000, aoi: [ [0,0], [0,0], [0,0], [0,0], [0,0] ]
					}),
					Name: "ingest."+fileName,
					Description: "see " + fileName.tag("a",{href:`/files.view?ID=${fileID}`}) + " for details"
				};

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
			}); */
			Each(DEBE.autoTask, function (dsn, ctx) {
				sql.query(
					"INSERT INTO app.?? SET ? ON DUPLICATE KEY UPDATE Autorun=1",
					[dsn, Copy({
						Pipe: `{ "file": ${fileName}, "limit": 150e3}`,
						Autorun: 1,
						Name: fileName
					}, ctx)]
				);
			});
		});
	},
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enable for double-blind testing 
	*/
	blindTesting : false		//< Enable for double-blind testing (eg make FLEX susceptible to sql injection attacks)
}, TOTEM, ".");

/*
function SOAPsession(req,res,peer,action) {
/ **
@method SOAPsession
@private
Process an bySOAP session peer-to-peer request.  Currently customized for Hydra-peer and 
could/should be revised to support more generic peer-to-peer bySOAP interfaces.
 
@param {Object} req HTTP request
@param {Object} res HTTP response
@param {Function} proxy Name of APP proxy function to handle this session.
* /
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
@class ATTRIB get and send dataset attributes
*/

function sendCert(req,res) { // create/return public-private certs
			
	var 
		owner = req.table,
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
					FF = "Firefox".tag("a",{href:master+"/stash/firefox.zip"}),
					Putty = "Putty".tag("a",{href:master+"/stash/putty.zip"}),
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
	
function exePlugin(req,res) {
/**
@private
@method exePlugin
Interface to execute a dataset-engine plugin with a specified usecase as defined in [api](/api.view).
@param {Object} req http request
@param {Function} res Totem response callback
*/	
	
	var
		flowEvents = LAB.libs.FLOW.batch,
		now = new Date(),
		sql = req.sql,
		client = req.client,
		group = req.group,
		table = req.table,
		query = req.query;

	//Log("exe", query );
	if ( days = parseInt(query.days||"0") +parseInt(query.hours||"0")/24 ) {
		res("queueing polled job");
		delete query.days;
		delete query.hours;
		sql.query("INSERT INTO app.queues SET ?",  {
			Client: client,
			Class: "polled",
			QoS: 0,
			Task: table,
			Work: days,
			Notes: "/"+table.tag("?", query),
			Age: 0,
			Arrived: now,
			Departed: now.addDays(days)
		});	
	}
			
	else
	if ("ID" in query || "Name" in query)  // execute plugin
		FLEX.runPlugin(req, function (ctx) {  // run engine using requested usecase via the job regulator 

			//Log("run ctx", ctx);
			
			if ( !ctx)
				res( DEBE.errors.noContext );
			
			else
			if (ctx.constructor == Error)
				res( ctx );
			
			else
			if ( Pipe = ctx.Pipe )  { // intercept piped for learning workflows and to regulate event stream
				res("Piped");
				
				var
					profile = req.profile,
					job = { // job descriptor for regulator
						qos: 1, //profile.QoS, 
						priority: 0,
						client: req.client,
						class: "plugin",
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

				HACK.chipEvents(sql, Pipe, function ( specs ) {  // create job for these Pipe parameters

					sql.insertJob( Copy(specs,job), function (sql, job) {  // put voxel into job regulation queue
						
						var 
							Query = req.query = Copy({  // engine query when selected
								File: job.File,  // file linked to this voxel
								Voxel: job.Voxel,	// voxel being processed
								Collects: job.Collects,	// sensor collects available for this voxel
								Flux: job.Flux,		// surface solar flux under this voxel
								Events: job.Events || "",	// sql to get events for this voxel
								Stats: job.Stats,		// plugin stats available for this voxel
								Chip: job.Chip,		// surface chip selector under this voxel
								Host: "app." + job.name		// ds.plugin name hosting this voxel
							}, ctx),
							File = job.File,
							Supervisor = new RAN({ 	// learning supervisor
								learn: function (supercb) {  // event getter callsback supercb(evs) or learsupercbncb(null,onEnd) at end
									var flow = this;

									//Log("learning ctx", ctx);

									flowEvents(ctx, function (evs, sinkcb) {  // callsback sinkcb(output events) when evs goes null
										Log("supervising ", evs ? evs.length : "done!" );

										if (evs) 
											supercb(evs);

										else // terminate 
											supercb(null, function onEnd( flowctx ) {  // accept flow context
												Query.Flow = flowctx;

												//Log("end flow ctx", flowctx);
												ATOM.select(req, function (ctx) {  // run plugin's engine
													if (ctx) 
														flow.end( ctx.Save || [], sinkcb );

													else
														Log( `HALTED ${job.name}` );
												});
											});					
									});
								},  

								N: ctx.Actors || File._Ingest_Actors,  // ensemble size
								keys: ctx.Keys || File.Stats_stateKeys,
								symbols: ctx.Symbols || File.Stats_stateSymbols || File._Ingest_States,
								steps: ctx.Steps || File._Ingest_Steps, // process steps
								batch: ctx.Batch || 0,  // steps to next supervised learning event 
								//trP: {states: File._Ingest_States}, // trans probs
								trP: {},
								filter: function (str, ev) {  // filter output events
									switch ( ev.at ) {
										case "batch":
											Log("filter", ev);
										case "config":
										case "end":
											str.push(ev);
									}
								}  
							});
						
						Supervisor.pipe( function (evs) { // pipe supervisor to this callback
							saveEvents( evs, ctx );
						}); 
					});
				});
			}
					
			else
			if ( "Save" in ctx )  // event generation engines do not participate in supervised workflow
				res( saveEvents( ctx.Save, ctx ) );
				
			else
				res( "ok" );
			
		});
		
	else  
	if ( engine = FLEX.execute[table] )	// execute flex engine
		engine(req,res);
	
	else
	if (DEBE.probono)  // execute unregulated engine using query as usecase
		ATOM.select(req, res);
	
	else
		res(DEBE.errors.noUsecase);

}

function saveEvents(evs, ctx) {
	var
		autoTask = DEBE.autoTask,
		host = ctx.Host,
		client = "guest",
		fileName = `${host}.${ctx.Name}`;
	
	return LAB.libs.SAVE ( evs, ctx, function (evs,sql) {
		
		if ( ctx.Export ) {   // export remaining events to filename
			var
				evidx = 0,
				srcStream = new STREAM.Readable({    // establish source stream for export pipe
					objectMode: false,
					read: function () {  // read event source
						if ( ev = evs[evidx++] )  // still have an event
							this.push( JSON.stringify(ev)+"\n" );
						else 		// signal events exhausted
							this.push( null );
					}
				});

			DEBE.uploadFile( "", srcStream, `stores/${fileName}.${host}` );
		}

		if ( ctx.Ingest )  // ingest remaining events
			DEBE.getFile( client, `plugins/${fileName}`, function (area, fileID) {
				sql.query("DELETE FROM app.events WHERE ?", {fileID: fileID});

				HACK.ingestList( sql, evs, fileID, function (aoi) {
					Log("INGESTED",aoi);
					Each(autoTask, function (dsn,ctx) {
						sql.query(
							"INSERT INTO app.?? SET ? ON DUPLICATE KEY UPDATE Autorun=1",
							[dsn, Copy({
								Pipe: `{ "file": ${fileName}, "limit": 150e3}`,
								Autorun: 1,
								Name: fileName
							}, ctx)]
						);
					});
				});
			});

	}); 
}

function sendDoc(req, res) {
	var
		site = DEBE.site,
		master = "http://localhost:8080", //site.urls.master,	
		query = req.query,
		type = req.type.substr(1),
		name = req.table,
		docf = `./temps/docs/${req.table}.${type}`;	

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

/*
function renderAttr(req,res) {
	var 
		sql = req.sql,
		query = req.query,
		//paths = FLEX.paths.publish,
		//mdpath = paths[req.type] + req.name + ".xmd",
		errors = DEBE.errors;

	//Log(mdpath);
	sql.query("SELECT * FROM app.engines WHERE least(?,1) LIMIT 1",  { name: req.table }, (err, engs) => {
	});
			
	FS.readFile( mdpath, "utf8" , function (err,xmd) {
		if (err) 
			res( errors.badSkin );

		else
			xmd.Xfetch( res );
	}); 
}  */

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
		error = DEBE.errors,
		urls = site.urls,
		query = req.query,
		fetcher = DEBE.fetch.fetcher,
		dsname = FLEX.reroute[req.table] || (req.group + "." + req.table),
		jadepath = paths.jades+req.table+".jade",
		ctx = site.context[req.table]; 
		
	function dsContext(sql, ctx, cb) { // callback cb() after loading datasets required for this skin
		
		if (ctx) // render in extended context
			Each(ctx,  function (siteKey, ds, isLast) {
				if ( ds.charAt(0) == "/" ) // url dataset
					fetcher( urls.master+ds, query, null, function (data) {
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

				else // local dataset
					sql.forAll("CTX-"+siteKey, "SELECT * FROM ??", [ds], function (recs) {
						site[siteKey] = recs.clone();
						if ( isLast ) cb();
					});
			});
					
		else  // render in default site context
			cb();
	}
	
	dsContext(sql, ctx, function () {  

		function renderFile(file) { 
		/**
		@private
		@method render
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/
			//var file = this+"";  // js get confused so force string
			siteContext( req, function (ctx) {
				try {
					res( JADE.renderFile( file, ctx ) );  
				}
				catch (err) {
					res(  err );
				}
			});
		}

		function renderPlugin(fields) { // render using plugin skin
			
			var
				pluginPath = paths.jades+"plugin.jade",
				query = req.query,
				sql = req.sql,
				query = Copy({
					mode: req.parts[1],
					//search: req.search,
					//cols: [],
					page: query.page,
					dims: query.dims || "100%,100%",
					ds: req.table
				}, req.query),
				cols = [],
				ctx = site.context.plugin;
			
			//Log([query, req.search]);
			
			switch (fields.constructor) {
				case Array:
					fields.forEach( function (field,n) {
						var 
							key = field.Field, 
							type = field.Type.split("(")[0];
							//group = key.split("_");
						
						if ( key != "ID" && type != "geometry") {
							var
								doc = escape(field.Comment).replace(/\./g, "$dot"),
								qual = "short";
							
							if ( key.indexOf("Save") == 0) qual += "hideoff" ;
							
							else
							if ( key.charAt(0) == "_" ) qual += "off";
							
							//Log(key,qual);
							cols.push( key + "." + type + "." + doc + "." + qual );
						}
					});
					//Log("plugin cols", cols, cols.groupify() );
					//Log(cols);
					break;
					
				case String:
					fields.split(",").each(function (n,field) {
						if ( field != "ID") cols.push( field );
					});	
					break;
					
				case Object:
				default:
					Each(fields, function (field) {
						if (field != "ID") cols.push( field );
					});	
			}
				
			query.cols = cols.groupify();
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
				renderFile(pluginPath);
			});
			
		}		
		
		function renderStage( dsname, jadepath ) {
			sql.query( "SHOW FULL COLUMNS FROM ??", dsname, function (err,fields) {
				if (err) // render jade file
					renderFile( jadepath );

				else // render plugin
					renderPlugin( fields );
			});	
		}
		
		function renderJade(jade) { 
		/**
		@private
		@method render
		Render Jade string this to res( err || html ) in a new context created for this request. 
		**/
			//var  jade = this+"";

			siteContext( req, function (ctx) {
				try {
					if ( generator = JADE.compile(jade, ctx) )
						res( generator(ctx) );
					else
						res( errors.badSkin );
				}
				catch (err) {
					return res( err );
				}
			});
		}

		sql.forFirst("", paths.engine, { // Try a jade engine
			Name: req.table,
			Type: "jade",
			Enabled: 1
		}, function (eng) {

			if (eng)  // render view with this jade engine
				dsContext(sql, ctx, function () {
					renderJade( eng.Code || "", res );
				});

			else 	// try to get engine from sql table or from disk
			/*
			if ( route = DEBE.byActionTable.select[req.table] ) // try virtual table
				route(req, function (recs) {
					if ( recs )
						renderPlugin( recs[0] || {} );
					else
						res( errors.badSkin );
				});

			else  */
			if ( route = DEBE.byActionTable.select[req.table] || DEBE.byAction.select ) // may have an engine interface
				route(req, function (recs) { 
					//Log({eng:recs, ds:req.table});
					if (recs)
						renderPlugin( recs[0] || {} );

					else
						renderStage( dsname, jadepath );
				});	

			else  // try sql table or file
				renderStage( dsname, jadepath );		

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
		docf = `./temps/docs/${req.table}.${type}`;
	
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

function Trace(msg,sql) {
	TRACE.trace(msg,sql);
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

function Initialize (sql) {
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

		if (cb) cb();

	}

	function initSQL(cb) {
	/**
	 * @method initSQL
	 * @private
	 * @member DEBE
	 * Initialize the FLEX and ATOM interfaces
	 */

		Trace("INIT CRUDE");
		for ( crude in {select:1,delete:1,insert:1,update:1,execute:1} ) {
			DEBE[crude] = FLEX[crude].ds;
			DEBE.byActionTable[crude] = FLEX[crude];
		}

		if (cb) cb();	
	}
	
	initENV( function () {  // init the global environment
	initSES( function () {	// init session handelling
	initSQL( function () {	// init the sql interface

		Trace("INIT MODULES");

		FLEX.config({ 
			thread: Thread,
			emitter: DEBE.IO ? DEBE.IO.sockets.emit : null,
			skinner: JADE,
			fetcher: DEBE.fetch.fetcher,
			indexer: DEBE.indexFile,
			uploader: DEBE.uploadFile,

			createCert: DEBE.createCert,
			
			reroute: {
				roles: "openv.roles",
				aspreqts: "openv.aspreqts",
				ispreqts: "openv.ispreqts",
				swreqts: "openv.swreqts",
				hwreqts: "openv.hwreqts",
				tta: "openv.tta",
				trades: "openv.trades",
				milestones: "openv.milestones",
				sessions: "openv.sessions",
				journal: "openv.journal",
				hawks: "openv.hawks",
				attrs: "openv.attrs",
				issues: "openv.issues"
			},
			
			diag: DEBE.diag,
			
			site: DEBE.site						// Site parameters

		});

		HACK.config({
			//source: "",
			taskPlugin: null,
			//fetcher: DEBE.fetch.fetcher,
			thread: DEBE.thread
		});
		
		LAB.config({
			thread: DEBE.thread,
			fetcher: DEBE.fetch.fetcher
		});
		
		ATOM.config({
			thread: DEBE.thread,
			cores: DEBE.cores,
			//watchFile: DEBE.watchFile,
			plugins: Copy({   // share selected FLEX and other modules with engines
				// MAIL: FLEX.sendMail,
				RAN: require("randpr"),
				TASK: {
					shard: DEBE.tasker
				},
			}, LAB.libs)
		});
		
		JAX.config({
			MathJax: {
				tex2jax: {
					//displayMath: [["$$","$$"]]
				}
			}
		});
		JAX.start();
		
		DEBE.onStartup(sql);

		var path = DEBE.paths.jades;

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
		
	}); }); }); 
} 

/**
@class MAINT service maintenance endpoints
*/

function sysIngest(req,res) {
	var 
		sql = req.sql,
		query = req.query,
		body = req.body,
		src = query.src,
		fileID = query.fileID;
	
	Log("INGEST", query, body);
	res("ingesting");

	if (fileID) {
		//sql.query("DELETE FROM app.events WHERE ?", {fileID: fileID});
		
		if ( onIngest = DEBE.onIngest[src] )   // use builtin ingester
			DEBE.ingester( onIngest, query, function (evs) {
				HACK.ingestList( sql, evs, fileID, function (aoi) {
					Log("INGEST aoi", aoi);
				});
			});

		else  // use custom ingester
			sql.query("SELECT _Ingest_Script FROM app.files WHERE ? AND _Ingest_Script", {ID: fileID})
			.on("results", function (file) {
				if ( onIngest = JSON.parse(file._Ingest_Script) ) 
					DEBE.ingester( onIngest, query, function (evs) {
						HACK.ingestList( sql, evs, fileID, function (aoi) {
							Log("INGEST aoi", aoi);
						});
					});
			});
	}
}

function sysAgent(req,res) {
	var
		sql = req.sql,
		query = req.query;
	
	if (push = query.push) 
		CRYPTO.randomBytes(64, function (err, jobid) {

			try {
				var args = JSON.parse(query.args);
			}
			catch (parserr) {
				err = parserr;
			}
			
			if (err) 
				res( "" );

			else
				res( jobid.toString("hex") );

		});
	
	else
	if (pull = query.pull) {
		var jobid = query.jobid;
		
		if (jobid) 
			res( {result: 123} );
		
		else
			res( "Missing jobid" );
	}

	else
	if ( flush = query.flush )
		ATOM.matlab.flush(sql, flush);
	
	else
	if ( thread = query.load ) {
		var
			parts = thread.split("_"),
			id = parts.pop(),
			plugin = "app." + parts.pop(),
			results = ATOM.matlab.path.save + thread + ".out";
		
		Log("SAVE MATLAB",query.save,plugin,id,results);

		FS.readFile(results, "utf8", function (err,json) {

			sql.query("UPDATE ?? SET ? WHERE ?", [plugin, {Save: json}, {ID: id}], function (err) {
				Log("save",err);
			});

		});	
	}
	
	else
	if ( thread = query.save ) {
		var 
			Thread = thread.split("."),
			Thread = {
				case: Thread.pop(),
				plugin: Thread.pop(),
				client: Thread.pop()
			};
		
		sql.forFirst("agent", "SELECT * FROM openv.agents WHERE ? LIMIT 1", {queue: thread}, function (agent) {
			
			if (agent) {
				sql.query("DELETE FROM openv.agents WHERE ?", {ID: agent.ID});
				
				if ( evs = JSON.parse(agent.script) )
					FLEX.getContext(sql, "app."+Thread.plugin, {ID: Thread.case}, function (ctx) {
						res( saveEvents( evs, ctx ) );
					});
				
				else
					res( DEBE.errors.badAgent );
			}
			
			else
				res( DEBE.errors.badAgent );
				
		});
		
	}
	
	else
		res( DEBE.errors.badAgent );
	
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

// Prototypes
	
[  // string prototypes
	/*function hyper(ref) { 
		return [this].linkify(ref);
	},  */
	
	function renderBlog(rec, ds, cb) { 
	/*
	Renders tags on this string of the form:
			[ post ] ( SKIN.view ? w=WIDTH & h=HEIGHT & x=KEY$EXPR & y=KEY$EXPR & src=DS & id=VALUE )  
			[ image ] ( PATH.jpg ? w=WIDTH & h=HEIGHT )  
			[ TEXT ]( LINK )  
			[ FONT ]( TEXT )  
			!$ inline TeX $  ||  $$ break TeX $$ || a$ AsciiMath $ || m$ MathML $  
			#{ KEY } || #{ KEY }( SHORTCUT ) || !{ EXPR }  || ${ KEY as TeX matrix  }  
			#TAG
		
	using suppplied record rec to resolve #{key} tags and a default ds = "PATH ? QUERY" for
	[TEXT](ds) tags.   The rendered html results is provided to the callback cb(html).
	*/	
		function renderJAX(jaxList,rtn,cb) {  
		// render !jaxN tokens in this string to .jax and .fmt on jaxList[N]

			var 
				rendered = 0, renders = jaxList.length;

			//Log("jax",renders);
			jaxList.each( function (n,jax) {  // enumerate all !jaxN tokens

				JAX.typeset({
					math: jax.jax,
					format: jax.fmt, //"TeX",  // TeX, inline-TeX, AsciiMath, MathML
					//html: true,
					mml: true
				}, function (d) {
					rtn = rtn.replace("!jax"+n+".", d.mml);

					//Log("jax", rendered, renders);
					if ( ++rendered == renders ) cb(rtn);
				});

			});

			if ( !renders ) cb(rtn);
		}

		var 
			jaxList = [], cache = {}, $ = {}, tagList = [];

		renderJAX( jaxList, this.markdown(ds, jaxList, cache, $, tagList, rec), function (html) {
			cb(html, tagList);
		}); 

	},
	
	function markdown(ds, jaxList, cache, $, tagList, rec) {
	/*
	Replaces tags on this string of the form:
		[ post ] ( SKIN.view ? w=WIDTH & h=HEIGHT & x=KEY$EXPR & y=KEY$EXPR & src=DS & id=VALUE )  
		[ image ] ( PATH.jpg ? w=WIDTH & h=HEIGHT )  
		[ TEXT ]( LINK )  
		[ FONT ]( TEXT )  
		!$ inline TeX $  ||  $$ break TeX $$ || a$ AsciiMath $ || m$ MathML $  
		#{ KEY } || #{ KEY }( SHORTCUT ) || !{ EXPR }  || ^{ KEY as TeX matrix  }  
		#TAG
		
	using the supplifed jaxList to store $JAX$ tags, cache and $ hashes to store #{KEY} values,
	tagList to store #TAG tags, and the record hash to resolve #{key} tags.
	*/
		
		function pretty(val, cb) {
			if (val)
				switch (val.constructor.name) {
					case "Number": return val.toFixed(2);
					case "String": return val;										
					case "Array": return "[" + val.joinify(", ", function (val) {
						return val.toFixed ? val.toFixed(2) : val+"";
					}) + "]";
					case "Date": return val+"";
					case "Object": 
						return cb ? cb(val) : JSON.stringify(val);
					default: 
						return JSON.stringify(val);
				}

			else
				return (val == 0) ? "0" : "null";
		}
		
		function inlines(html) {
			inList.forEach( (inline, n) => {
				html = html.replace("$in"+n, inline);
				//Log(n, inline);
			});
			return html;
		}
		
		for (var key in rec) try { $[key] = JSON.parse( rec[key] ); } catch (err) {}
	
		var inList = [];
		
		return inlines( this
			// inline code escapes
			.replace(/<br>/g,"\n")
			.replace(/(.*?):\n\n((.|\n)*?)\n\n/g, function (str, intro, code) {
				//Log(str,intro,code);
				inList.push( code.tag("code").tag("pre") );
				return intro + ":$in" + (inList.length-1);
			})

			// record substitutions
			.replace(/\$\{(.*?)\}/g, function (str,key) {  // ${ TeX matrix key } markdown
				function texify(recs) {
					var tex = [];
					
					if (recs && recs.constructor == Array) 
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
					
					return  "\\left[ \\begin{matrix} " + tex.join("\\\\") + " \\end{matrix} \\right]";
				}

				if (  key in cache )
					return cache[key];

				else {
					try { var val = eval( `$.${key}` ); } catch (err) {	}
					return cache[key] = texify( val || rec[key] );
				}							
			})
			.replace(/\#\{(.*?)\}\((.*?)\)/g, function (str,key,short) {  // #{ key }( short ) markdown
				if (  key in cache )
					return cache[key];

				else {
					try { var val = eval( `$.${key}` ); } catch (err) { }
					return cache[key] = cache[short] = pretty(val || rec[key]);
				}							
			})
			.replace(/\#\{(.*?)\}/g, function (str,key) {  // #{ key } markdown
				//Log(key,cache);
				if (  key in cache )
					return cache[key];

				else {
					try { var val = eval( `$.${key}` ); } catch (err) { }
					return cache[key] = pretty( val || rec[key] );
				}
			})
			.replace(/\=\{(.*?)\}/g, function (str,key) {  // ={ key } markdown
				//Log(key,cache);
				if (  key in cache )
					return cache[key];

				else {
					try { var val = eval( `$.${key}` ); } catch (err) { }
					return cache[key] = pretty(val || rec[key], (val) => {
						var rtns = [];
						for (var key in val) 
							rtns.push( "{" + pretty(val[key]) + "}_{" + key + "}" );
						return rtns.join(" = ");						
					});
				}
			})
			.replace(/\!{(.*?)\}/g, function (str,expr) { // !{ js expression } markdown
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

			// mathjax equations
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

			// links, views, and highlighting
			.replace(/\[([^\[\]]*?)\]\((.*?)\)/g, function (str,link,src) {  // [link](src) markdown
				var
					keys = {},
					dspath = ds.parsePath(keys),
					path = src.parsePath(keys) || dspath,
					w = keys.w || 100,
					h = keys.h || 100,
					opsrc =  "/" + path.tag( "?", Copy({src:dspath}, keys) );

				Log({link: link, keys: keys, opsrc: opsrc, src: src, ds: ds});
				switch (link) {
					case "image":
					case "img":
						return "".tag("img", { src:opsrc, width:w, height:h });
					case "post":
					case "iframe":
						return "".tag("iframe", { src:opsrc, width:w, height:h });
					case "red":
					case "blue":
					case "green":
					case "yellow":
					case "orange":
					case "black":
						return src.tag("font",{color:link});
					default:
						//Log( "".tag("iframe",{ src: opsrc, width:w, height:h } ) );
						return link.tag("a", { href:opsrc });
				}
			})
			.replace(/href=(.*?)\>/g, function (str,ref) { // follow <a href=REF>A</a> links
				var q = (ref.charAt(0) == "'") ? '"' : "'";
				return `href=${q}javascript:navigator.follow(${ref},BASE.user.client,BASE.user.source)${q}>`;
			})

			// smart tags
			.replace(/\#(.*?) /g, function (str,tag) {  // #topic tag
				tagList.push(tag);
				return "";
			}) 
		);
	},
	
	function toQuery(sql, query) {
		var 
			name = this.parsePath(query);
		
		return sql.toQuery( name ? Copy({Name: name}, query) : query );
	},
	
	function Xparms(product, cb) {		
		cb( this.replace(/<!---parms ([^>]*)?--->/g, (str, parms) => {
					
			var 
				inputs = [],
				keys = [];

			parms.split("&").forEach( (parm) => {
				parm.replace(/(.*)?=(.*)?/, (str, key, val) => {
					inputs.push( `${key}: <input id="parms.${key}" type="text" value="${val}" autofocus >` );
					keys.push( '"' + key + '"' );
					return "";
				});
				return "";
			});

			return `
<script>
	String.prototype.tag = ${"".tag}
	function submitForm() {
		var parms = {};
		[${keys}].forEach( (key) => parms[key] = document.getElementById("parms."+key).value );

		window.open( "/${product}".tag("?", parms) );
	}
</script>
<form onsubmit="submitForm()">
	${inputs.join("")}
	<button id="parms.submit" type="submit" value="submit">submit</button>
</form>
` ;
		}) );
	},
	
	function Xtex( cb) {
		var 
			key = "@tex",
			fetcher = function ( rec, cb ) {
				//fet( url, cb );
			};
		
		this.serialize( fetch, /x/g, key, 
			(rtn,fails) => rtn.serialize( fetch, /x/g, key, 
				(rtn,fails) => rtn.serialize( fetch, /x/g, key, 
					(rtn,fails) => cb(rtn)
				)
			)
		);
	},
	
	function Xfetch( cb ) {
		var 
			fetcher = DEBE.fetch.fetcher,
			fetch = function ( rec, cb ) {
				fetcher( rec.url, null, null, cb );
			};
		
		this.serialize( fetch, /<!---fetch ([^>]*)?--->/g, "@fetch", (rtn,fails) => cb(rtn) );
	},

	function Xjade( req, proxy, product, cb ) {

		var 
			md = this+"",
			via = URL.parse(proxy),
			errors = DEBE.errors;

		//Log(product, via);
		siteContext(req, (ctx) => {

			var 
				jade = `extends base
append base_parms
	- opens = false
append base_body
	img(src="/shares/images/${via.host}.jpg", width="100%", height="15%")
	:markdown
		`  + md.replace(/\n/g,"\n\t\t");

			if ( generator = JADE.compile(jade, ctx) )
				generator(ctx).Xparms(product, cb )

			else
				cb( errors.badSkin );
		});
	}
											
].extend(String);
	
[  // array prototypes
	function groupify() {
		return this.splitify("_").joinify();
	},
	
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

	function blogify( sql, client, keys, ds, cb ) {
	/*
	@member Array
	@method blogify
	@param [List] keys list of keys to blogify
	@param [String] ds Name of dataset being blogged
	@param [Function] cb callback(recs) blogified version of records
	*/

		var recs = this, rendered = 0, renders = recs.length;

		keys.each(function (n,key) {
			recs.each( function (n, rec) {
				if ( val = rec[key] )
					if (val.constructor == String)
						val.renderBlog( rec, ds+"?ID="+rec.ID, function (html, tags) {
							rec[key] = html;
							//Log("rec",rendered, renders);
							if ( ++rendered == renders ) cb(recs);
							
							tags.forEach( function (tag,n) {  // tag topics
								var 
									secret = "",
									product = tag+"."+html;
								
								FLEX.licenseCode( sql, html, {
									EndUser: client,
									EndService: "",
									Published: new Date(),
									Product: product,
									Path: "/tag/"+product
								}, (pub) => {
									/*
									sql.query("INSERT INTO app.tags SET `On`=now(),? ON DUPLICATE KEY UPDATE `On`=now(),Views=Views+1,?", [{
											Tag: tag,
											Message: html,
											To: client
										}, {Message: html}
									]); */
								});
							});
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
	@param [String] targetPrefix  stash = { (targetPrefix + watchKey): { x: [X,...], y: [Y,...], ... }, ... } 
	@param [Object] ctx plugin context keys
	@param [Object] stash refactored output suitable for a Save_KEY
	@param [Function] cb callback(ev,stat) returns refactored result to put into stash
	Used by plugins for aggregating ctx keys into optional Save_KEY stashes such that:

			[	{ at: "check", A: a1, B: b1, ... }, { at: "check", A: a1, B: b1, ... }, ... 
				{ at: "other", ...}, { x:x1, y:y1, ...}, { x:x2: y:y2, ... } 
			].stashify( "at", "save_", {save_check: {}, ...} , stash, cb )

	creates a stash.save_check = {A: [a1, a2,  ...], B: [b1, b2, ...], ...}.   No stash.other is
	created because its does not exist in the supplied ctx.  If no stash.rem is provided 
	by the ctx, the {x, y, ...} are appended (w/o aggregation) to stash.remainder. Conversely, 
	had	the ctx contain a stash.rem, the {x, y, ...} would be aggregated to stash.rem.
	*/

		var rem = stash.remainder;

		this.each( function (n,stat) {  // split-save all stashable keys
			var 
				key = targetPrefix + (stat[watchKey] || "rem"),  // target ctx key 
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

	function sample( cb ) {
	/*
	@member Array
	@method sample
	@param {Function} cb callback(rec) returns recordresults to append
	Returns a sample of each record from this records using a callback to sample
	*/
		var rtns = [];
		this.forEach( function (rec) {
			rtns.push( cb(rec) );
		});
		return rtns;
	},

	/*function joinify(sep, cb) {
	/ * 
	@member Array
	@method joingify
	@param [String] sep seperator
	@param [Function] cb callback(rec) returns sample of supplied record
	* /

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
	}, */

	function joinify(cb) {
	/*
	Joins a list 
		[	a: null,
			g1: [ b: null, c: null, g2: [ x: null ] ],
			g3: [ y: null ] ].joinify()
	
	into a string
		"a,g1(b,c,g2(x)),g3(y)"
			
	A callback cb(head,list) can be provided to join the current list with the current head.
	*/

		var 
			src = this,
			rtn = [];
		
		Each(src, (key, list) => {
			if ( typeof list == "string" ) 
				rtn.push( list );
			
			else
				try {
					rtn.push( cb 
						? cb( key, list ) 
						: key + "(" + list.joinify() + ")" 
					);
				}
				catch (err) {
					rtn.push(list);
				}
		});
		
		return cb ? cb(null,rtn) : rtn.join(",");
	},

	function splitify(dot) {
	/*
	Splits a list 
		["a", "g1.b", "g1.c", "g1.g2.x", "g3.y"].splitify( "." )
		
	into a list
		 [	a: null,
			g1: [ b: null, c: null, g2: [ x: null ] ],
			g3: [ y: null ] ]
	
	*/
		var src = {};
		this.forEach( (key) => {
			src[key] = key;
		}); 
		
		return Copy(src,[],dot || ".");
	},
	
	function linkify(refs) {
	/*
	@member Array
	@method linkify
	@param {String} ref
	Returns a ref-joined list of links
	*/

		/*return this.joinify(",", function (label) {

			if (ref)
				if (ref.charAt(0) == ":")
					return label.link( "/"+(ref.substr(1) || label.toLowerCase())+".view" );
				else
					return label.link(ref);
			else
				return label.link(ref || "/"+label.toLowerCase()+".view");

		});  */
		
		if (typeof refs == "string") refs = refs.split(",");

		var rtn = [];
		
		this.forEach( ( label, index ) => {
			
			var link = refs[index] || label.toLowerCase();
			
			switch (link) {
				case "*":
					rtn.push( label );
					break;
				default:
					if ( link.charAt(0) != "/" ) {
						link = "/" + link;
						if ( link.indexOf(".") < 0 ) link += ".view";
					}
					rtn.push( label.link( link ) );
			}
		});
			
		return rtn.join(" || ");
	}
].extend(Array);
	
[  // date prototypes
	function getWeek() {
		  var date = new Date(this.getTime());
		   date.setHours(0, 0, 0, 0);
		  // Thursday in current week decides the year.
		  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		  // January 4 is always in week 1.
		  var week1 = new Date(date.getFullYear(), 0, 4);
		  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
		  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
								- 3 + (week1.getDay() + 6) % 7) / 7);
	},
	
	function addDays(days) {
		var d = new Date(this);
		d.setDate( d.getDate() + days);
		return d;
	}
].extend(Date);

function sharePlugin(req,res) {
	
	var 
		product = req.table + "." + req.type,
		query = req.query,
		//paths = FLEX.paths.publish,
		//mdpath = paths[req.type] + req.table + ".md",		
		endService = query.endservice,
		sql = req.sql;

	sql.query( "SELECT * FROM ??.engines WHERE least(?,1) LIMIT 1", [ req.group, { Name: req.table } ], (err, engs) => {
		if ( eng = engs[0] ) 
			switch ( req.type ) {
				case "tou":
					if ( eng.ToU )
						eng.ToU.Xfetch( res );
					else
						res( "ToU undefined" );
					
					break;
		
				case "js":
				case "py":
				case "me":
				case "m":
					sql.query(
						"SELECT * FROM app.releases WHERE least(?,1) ORDER BY Published DESC LIMIT 1", {
							EndUser: req.client,
							EndServiceID: FLEX.serviceID( endService ),
							Product: product
					}, (err, pubs) => {

						function addTerms(code, pub, cb) {
							var 
								prefix = {
									js: "// ",
									py: "# ",
									matlab: "% ",
									jade: "// "
								},
								pre = "\n"+(prefix[req.type] || ">>");

							FS.readFile("./public/tou.txt", "utf8", (err, terms) => {
								cb( (err ? "" : pre + terms.parseJS({
									product: pub.Product,
									service: pub.EndService,
									published: pub.Published,
									license: pub.License,
									client: pub.EndUser
								}).replace(/\n/g,pre) ) + "\n" + code);
							});
						}

						if ( pub = pubs[0] )
							addTerms( eng.Code, pub, res );

						else
						if ( FLEX.licenseOnDownload )
							if ( endService )
								FLEX.licenseCode( sql, eng.Code, {
									EndUser: req.client,
									EndService: endService,
									Published: new Date(),
									Product: product,
									Path: req.url
								}, (pub) => {
									if (pub) 
										addTerms( eng.Code, pub, res );

									else
										res( new Error(`${product} cannot be licensed to ${endService}`) );
								});

							else
							if ( proxy = query.proxy )
								(eng.ToU||"").Xjade( req, proxy, product, (html) => {
									req.type = "html";
									res(html);
								});

							else
								res( new Error(`specify endservice=URL to establish the service that will integrate ${product}`) );

						else
							res( eng.Code );
					});
					break;
					
				case "jade":
					res( (eng.Type == "jade") ? eng.Code : new Error("invalid engine attribute") );
					break;

				default:
					res( eng[req.type] || new Error( "undefined engine attribute" ) );
			}
		
		else
			res( new Error( "no such engine" ) );
	});

}

/*
function probePlugin(req,res) {
		
	var 
		filename = req.table + "." + req.type,
		group = req.group,
		type = req.type,
		sql = req.sql;

	sql.forFirst( type, "SELECT ID FROM ??.files WHERE ?", [group, {Name: filename}], function (file) {

		if (file)
			sql.forAll( type, "SELECT * FROM ??.events WHERE ?", [group, {fileID: file.ID}], res );

		else
			res( new Error("plugin does not exist") );

	});
	
} */

switch (process.argv[2]) { //< unit tests
	case "D1": 
		var DEBE = require("../debe").config({
			onFile: {
				"./public/uploads/": function (sql, name, path) {  // watch changes to a file				

					sql.getFirst(  // get client for registered file
						"UPLOAD",
						"SELECT ID,Client,Added FROM app.files WHERE least(?) LIMIT 1", 
						{Name: name, Area:"uploads"}, function (file) {

						if (file) {  // ingest only registered file
							var 
								now = new Date(),
								exit = new Date(),
								client = file.Client,
								added = file.Added,
								site = DEBE.site,
								port = name.tag("a",{href:"/files.view"}),
								url = site.urls.worker,
								metrics = "metrics".tag("a", {href:url+"/airspace.view"}),
									/* [
										"quality".tag("a",{href:url+"/airspace.view?options=quality"}),
										"clumping".tag("a",{href:url+"/airspace.view?options=clumping"}),
										"loitering".tag("a",{href:url+"/airspace.view?options=loitering"}),
										"corridors".tag("a",{href:url+"/airspace.view?options=corridors"}),
										"patterns".tag("a",{href:url+"/airspace.view?options=patterns"})
									].join(", "), */
								poc = site.distro.d;

							sql.getFirst(  // credit client for upload
								"UPLOAD",
								"SELECT `Group` FROM openv.profiles WHERE ? LIMIT 1", 
								{Client:client}, 
								function (prof) {

								exit.offsetDays( 30 );

								if ( prof ) {
									var 					
										group = prof.Group,
										revised = "revised".tag("a", {href:`/files.view?ID=${file.ID}`} ),
										notes = `
Thank you ${client} for your sample deposit to ${port} on ${now}.  If your 
sample passes initial quality assessments, additional ${metrics} will become available.  Unless
${revised}, these samples will expire on ${exit}.  Should you wish to remove these quality 
assessments from our worldwide reporting system, please contact ${poc} for consideration.
`;
									sql.query("UPDATE app.files SET ? WHERE ?", [{
											_State_Notes: notes,
											Added: now,
											PoP_Expires: exit
										}, {ID: file.ID}
									], function (err) {
										DEBE.ingestFile(sql, path, name, file.ID, function (aoi) {
											//Trace( `CREDIT ${client}` );

											sql.query("UPDATE app.profiles SET Credit=Credit+? WHERE Client=?", [aoi.snr, client]);

											if (false)  // put upload into LTS - move this to file watchDog
												CP.exec(`zip ${path}.zip ${path}; rm ${path}; touch ${path}`, function (err) {
													Trace(`PURGED ${name}`);
												});
										});
									});

								}

								sql.release();
							});
						}
					});
				}
				
				/*
				"./public/js/": function (sql,name,ev) {
					// run FLEX.publish on the engine
					sql.release();
				},

				"./public/py/": function (sql,name,ev) {
					// run FLEX.publish on the engine
					sql.release();
				} */

			}
		}, function (err) {
		Trace( err || 
`Yowzers - this does everything but eat!  An encrypted service, a database, a jade UI for clients,
usecase-engine plugins, file-upload watchers, and watch dogs that monitor system resources (jobs, files, 
clients, users, system health, etc).` 
		);
	});
		break;
		
	case "D2":
		var DEBE = require("../debe").config({
			riddles: 10,
			"byTable.": {
				wfs: function (req,res) {
					res("here i go again");

					TOTEM.fetchers.http(ENV.WFS_TEST, function (data) {
						console.log(data);
					});
				}
			}
		}, function (err) {
			Trace( "This bad boy in an encrypted service with a database and has an /wfs endpoint" );
		});
		break;
		
	case "D3":
		var DEBE = require("../debe").config({
		}, function (err) {
			Trace( err || "Stateful network flow manger started" );
		});
		break;
		
	case "?":
		Trace("unit test D1-D3 available");
}

// UNCLASSIFIED
