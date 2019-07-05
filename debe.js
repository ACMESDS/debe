// UNCLASSIFIED 
/**
@class DEBE
@requires child_process
@requires cluster
@requires child-process
@requires fs
@requires stream
@requires os

@requires i18n-abide
@requires socket.io
@requires socket.io-clusterhub
@requires jade@1.9.0
@requires jade-filters
@requires optimist
@requires tokml
@requires mathjax-node

@requires flex
@requires totem
@requires atomic
@requires geohack
@requires man
@requires randpr
@requires enum

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
	FS = require("fs"), 				//< filesystem and uploads
	OS = require("os"), 		//< system utilizations for watch dogs
	URL = require("url"),		//< data fetcher url parser
	CRYPTO = require("crypto"), 	//< to hash names
	
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
	$ = require("man"),
	RAN = require("randpr"),
	HACK = require("geohack");

const { Copy,Each,Log,isObject,isString,isFunction,isError,isArray } = require("enum");

var										// shortcuts and globals
	Thread = TOTEM.thread;
	
var
	DEBE = module.exports = Copy({
	
	super: {
		"brian.d.james@coe.ic.gov": 1
	},
		
	reroute: {  //< sql.acces routes to provide secure access to db
		engines: function (ctx) { // protect engines that are not registered to requesting client
			//Log("<<<", ctx);
			if ( !DEBE.super[ ctx.client.toLowerCase() ] ) {
				ctx.index["Nrel:"] = "count(releases._License)";
				ctx.index[ctx.from+".*:"] = "";
				ctx.join = `LEFT JOIN ${ctx.db}.releases ON (releases._Product = concat(engines.name,'.',engines.type)) AND releases._Partner='${ctx.client}'`;
				ctx.where["releases.id:"] = "";
				//Log(">>>", ctx);
			}
			return ctx.db+"."+ctx.from;
		},
		
		syslogs: "openv.syslogs",
		masters: "block.masters",
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

	blogContext: {
		
		d: docify,
		doc: docify,
		
		digits: 2,  // precision to show values in [JSON || #DOC || TEX] OP= [JSON || #DOC || TEX] expansions
		
		":" : (lhs,rhs,ctx) => ctx.toEqn("", lhs,rhs,ctx), 		// inline TeX
		"|" : (lhs,rhs,ctx) => ctx.toEqn("a", lhs,rhs,ctx),		// Ascii Match
		";" : (lhs,rhs,ctx) => ctx.toEqn("n", lhs,rhs,ctx),		// break TeX
		">": (lhs,rhs,ctx) => ctx.toTag(lhs,rhs,ctx),			// [post](url) 
		"<": (lhs,rhs,ctx) => {												// add context value or generator
			
			if ( rhs.split(",").length > 1) {
				eval(`
try {
	ctx[lhs] = (lhs,rhs,ctx) => ctx.toTag( ${rhs} );
}
catch (err) {
} `);
			}
			
			else
				ctx[lhs] = rhs.parseEMAC( ctx );
			
			return "";
		},
		
		toEqn: (pre,lhs,rhs,ctx) => {		// expand [JSON || #DOC || TEX] OP= [JSON || #DOC || TEX] 

			function toTeX(val)  {
				var digits = ctx.digits;

				if (val)
					switch (val.constructor.name) {
						case "Number": return val.toFixed(digits);

						case "String": 
							//Log("tex str", val);
							return val;	

						case "Array": 
							var tex = []; 
							val.forEach( function (rec) {
								if (rec)
									if (rec.forEach) {
										rec.forEach( function (val,idx) {
											rec[idx] = toTeX(val);
										});
										tex.push( rec.join(" & ") );
									}
									else
										tex.push( toTeX(rec) );
								else
									tex.push( (rec == 0) ? "0" : "\\emptyset" );
							});	
							//Log("tex list", tex);
							return  "\\left[ \\begin{matrix} " + tex.join("\\\\") + " \\end{matrix} \\right]";

						case "Date": return val+"";

						case "Object": 
							var rtns = [];
							for (var key in val) 
								rtns.push( "{" + toTeX(val[key]) + "}_{" + key + "}" );

							return rtns.join(" , ");

						default: 
							return JSON.stringify(val);
					}

				else 
					return (val == 0) ? "0" : "\\emptyset";
			}
		
			function toDoc (arg) {
				switch ( arg.charAt(0) ) {
					case "#":
						return ("${doc(" + arg.substr(1) + ")}" ).parseEMAC(ctx).parseJSON( "?" );
						
					case "[":
					case "{":
						return arg.parseJSON({});
						
					default:
						var keys = arg.split(",");
						return (keys.length>1) ? keys : arg;
				}
			}
			
			return pre + "$$" + toTeX( lhs.parseJSON(toDoc) ) + " = " + toTeX( rhs.parseJSON(toDoc) ) + " $$";
		},
			
		toTag: (lhs,rhs,ctx) => {
				var
					lKeys = lhs.split(","),
					rKeys = rhs.split(","),
					base = lKeys[0] + "$.",
					skin = rKeys[0],
					args = (rKeys[3] || "").replace(/;/g,","),
					opts = {
						w: rKeys[1],
						h: rKeys[2],
						x: lKeys[1] ? base + lKeys[1] : "",
						y: lKeys[2] ? base + lKeys[2] : "",
						r: lKeys[3] ? base + lKeys[3] : ""
					};

				for (var key in opts) if ( !opts[key] ) delete opts[key];

				//Log( base, view, "[post](/" + (skin+".view").tag("?",opts)+args + ")" );
				return "[post](/" + `${skin}.view`.tag("?",opts)+args + ")";
		}
	},
		
	init: Initialize,
		
	//plugins: $.libs,
		
	ingester: function ingester( opts, query, cb ) {
		function ingestEvents(data, cb){
			var evs = [];
			if (recs = opts.get ? data[opts.get] : data) {
				Log("ingest recs", recs.length);
				recs.forEach( function (rec, idx) {
					if (ev = opts.ev) 
						if ( isString(ev) ) {
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
		
		var fetcher = DEBE.fetcher;
		
		try {
			if (url = opts.url)
				switch (url.constructor) {
					case String:
						fetcher( url.tag("?", query), opts.put, function (data) {
							if ( data = data.parseJSON( ) ) 
								ingestEvents(data, cb);
						});
						break;
						
					case Function:
						url( function (data) {
							ingestEvents(data, cb );
						});
						break;
						
					default:
						ingestEvents(url, cb);
				}
		}
		
		catch(err) {
			Log("INGESTER",err);
		}
	},
		
	onIngest: require("./ingesters"),

	onStartup: sql => {
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
		
		sql.query(
			"SELECT File FROM openv.watches WHERE substr(File,1,1) = '/' GROUP BY File",
			[] )
		.on("result", (link) => {
			dogAutoruns( link.File );
		});		
	},
		
	onUpdate: function (sql,ds,body) { // update change journal 
		sql.hawk({Dataset:ds, Field:""});  // journal entry for the record itself
		if (false)   // journal entry for each record key being changed
			for (var key in body) { 		
				sql.hawk({Dataset:ds, Field:key});
				sql.hawk({Dataset:"", Field:key});
			}
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
					
		dogReleases: Copy({ 
			cycle: 400,
			get: {
				unworthy: "SELECT ID,_Product,_EndServiceID FROM app.releases WHERE _Fails > ? GROUP BY _Product,_EndServiceID"
			},
			maxFails: 10
		}, function dogReleases(dog) {
			
			dog.forEach(dog.trace, dog.get.unworthy, [dog.maxFails], (rel, sql) => {
				sql.query("UPDATE app.masters SET _Revoked=1 WHERE least(?)", {EndServiceID: rel.EndServiceID, License: rel.License} );
			});
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
				dog.forEach(dog.trace, dog.get.unused, [], function (voxel, sql) {
					sql.query("DELETE FROM app.voxels WHERE ?", {ID: voxel.ID});
				});
			
			if (dog.get.refresh)  // fetch new atm data from whatever service and loop over recs (grouped by Point(x y) grid location)
				dog.forEach(dog.trace, dog.get.refresh, [atm.gridLocation, dog.atmage], function (voxel, sql) {
					// update voxels with atm data
				});
			
		}),
						
		dogCache: Copy({
			//cycle: 120
		}, function dogCache(dog) {
		}),
		
		dogSystem: Copy({
			cycle: 10,
			max: {
				cpu: 0.8,
				disk: 200
			},
			get: {
				threads:  function (sql, cb) {
					sql.query("show session status like 'Thread%'", {}, (err, stats) => {
						cb({
							running: stats[2].Value,
							connected: stats[1].Value
						});
					});
				},
				
				cpu: function (sql, cb) {				// compute average cpu utilization
					var avgUtil = 0;
					var cpus = OS.cpus();

					cpus.forEach( (cpu) => {
						idle = cpu.times.idle;
						busy = cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.user;
						avgUtil += busy / (busy + idle);
					});
					cb(avgUtil / cpus.length);
				},
				
				disk: function (sql, cb) {
					sql.query(
						"SELECT table_schema AS DB, "
					 + "SUM(data_length + index_length) / 1024 / 1024 / 1024 AS GB FROM information_schema.TABLES "
					 + "GROUP BY table_schema", {}, (err, stats) => {
						
						var GB = 0;
						stats.forEach( (stat) => {
							GB += stat.GB;
						});
						cb( GB );
					});
				}
			}
		}, function dogSystem(dog) {
			
			dog.thread( sql => {
				dog.get.threads( sql, (threads) => {
				dog.get.cpu( sql, (cpu) => {
				dog.get.disk( sql, (disk) => {
								
					sql.query("INSERT INTO openv.syslogs SET ?", {
						t: new Date(),		 					// start time
						Action: "watch", 				// db action
						runningThreads: threads.running,
						connectedThreads: threads.connected,
						cpuUtil: cpu,
						diskUtil: disk,
						Module: TRACE
					});

					if ( cpu > dog.max.cpu )
						FLEX.sendMail({
							subject: `${dog.site.nick} resource warning`,
							to: dog.site.pocs.admin,
							body: `Please add more VMs to ${dog.site.nick} or ` + "shed load".tag(dog.site.urls.worker+"/queues.view")
						});

					if ( disk > dog.max.disk ) 
						FLEX.sendMail({
							subject: `${dog.site.nick} resource warning`,
							to: dog.site.pocs.admin,
							body: `Please add more disk space to ${dog.site.nick} or ` + "shed load".tag(dog.site.urls.worker+"/queues.view")
						});

					sql.release();
				});
				});
				});
			});
		}),
				
		dogStats: Copy({
			//cycle: 1000,
			get: {
				lowsnr: 
					"SELECT count(events.ID) AS Rejects, events.voxelID AS voxelID, events.fileID AS fileID FROM app.events"
					+ " LEFT JOIN app.voxels ON voxels.ID = events.voxelID AND voxels.enabled"
					+ " LEFT JOIN app.files ON files.ID = events.fileID"
					+ " WHERE files.snr < voxels.minsnr"
					+ " GROUP BY events.voxelID, events.fileID"
			}
		}, function dogStats(dog) {
			
			if (dog.get.lowsnr)
			dog.forEach(dog.trace, dog.get.lowsnr, [], function (prune, sql) {
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
				ungraded: "SELECT ID,Name FROM app.files WHERE _State_graded IS null AND _Ingest_Time>PoP_End AND Enabled",
				unread: "SELECT ID,Ring, st_centroid(ring) as Anchor, _Ingest_Time,PoP_advanceDays,PoP_durationDays,_Ingest_sampleTime,Name FROM app.files WHERE _Ingest_Time>=PoP_Start AND _Ingest_Time<=PoP_End AND Enabled",
				//finished: "SELECT ID,Name FROM app.files WHERE _Ingest_Time>PoP_End",
				expired: "SELECT ID,Name FROM app.files WHERE PoP_Expires AND now() > PoP_Expires AND Enabled"
				//retired: "SELECT files.ID,files.Name,files.Client,count(events.id) AS evCount FROM app.events LEFT JOIN app.files ON events.fileID = files.id "
						//+ " WHERE datediff( now(), files.added)>=? AND NOT files.Archived AND Enabled GROUP BY fileID"
			},		
			cycle: 300, // secs
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
				fetcher = DEBE.fetcher;

			/*
			dog.forEach(dog.trace, dog.get.ungraded, [], function (file, sql) {
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
				dog.forEach(dog.trace, dog.get.expired, [], function (file, sql) { 
					Trace("EXPIRE "+file.Name);
					sql.query("DELETE FROM app.events WHERE ?", {fileID: file.ID});
				});
			
			if (dog.get.retired)
				dog.forEach(dog.trace, dog.get.retired, dog.maxage, function (file, sql) {
					Trace("RETIRE "+file.Name);

					var 
						site = DEBE.site,
						url = site.urls.worker,
						paths = {
							moreinfo: "here".tag(url + "/files.view"),
							admin: "totem resource manages".tag(url + "/request.view")
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
					CP.exec(`git commit -am "archive ${path}"; git push github master; rm ${zip}`, err => {
					});*/

					if ( sendMail = FLEX.sendMail ) sendMail({
						to: file.client,
						subject: `TOTEM archived ${file.Name}`,
						body: notice
					}, sql);
				});
			
			if (dog.get.finished)
				dog.forEach(dog.trace, dog.get.finished, [], function (file, sql) {
					Trace("FINISHED "+file.Name);
					//sql.query("UPDATE app.files SET _State_ingested=1 WHERE ?",{ID:file.ID});
				});
			
			if (dog.get.unread)
				dog.forEach(dog.trace, dog.get.unread, [], function (file, sql) {
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
					}), null, function (msg) {
						Log("INGEST", msg);
					});

					if (1)
					sql.query(
						"UPDATE app.files SET _Ingest_Time=date_add(_Ingest_Time, interval PoP_advanceDays day), Revs=Revs+1 WHERE ?", 
						{ ID: file.ID }
					);
				});
			
		}),
		
		dogJobs: Copy({
			get: {
				//pigs: "SELECT sum(DateDiff(Departed,Arrived)>1) AS Count from app.queues",			
				//unbilled: "SELECT * FROM app.queues WHERE Finished AND NOT Billed",
				unfunded: "SELECT * FROM app.queues WHERE NOT Funded AND now()-Arrived>?",				
				//stuck: "UPDATE app.queues SET Departed=now(), Notes=concat(Notes, ' is ', link('billed', '/profile.view')), Age=Age + (now()-Arrived)/3600e3, Finished=1 WHERE least(Departed IS NULL,Done=Work)", 
				outsourced: "SELECT * FROM app.queues WHERE Class='polled' AND Now() > Departed",
				unmailed: "SELECT * FROM app.queues WHERE NOT Finished AND Class='email' "
			},
			max: {
				pigs : 2,
				age: 10
			},
			cycle: 300
		}, function dogJobs(dog) {
			var
				queues = DEBE.queues,
				fetcher = DEBE.fetcher;
			
			if ( pigs = dog.get.pigs )
				dog.forEach(dog.trace, pigs, [], function (pigs) {
				});
			
			if ( unmailed = dog.get.unmailed ) 
				dog.forEach(dog.trace, unmailed, [], function (job, sql) {
					sql.query("UPDATE app.queues SET Finished=1 WHERE ?", {ID: job.ID});
					sendMail({
						to: job.Client,
						subject: "Totem update",
						body: job.Notes
					});
				});
			
			if ( unbilled = dog.get.unbilled )
				dog.forEach(dog.trace, unbilled, [], function (job, sql) {
					//Trace(`BILLING ${job} FOR ${job.Client}`, sql);
					sql.query( "UPDATE openv.profiles SET Charge=Charge+? WHERE ?", [ 
						job.Done, {Client: job.Client} 
					]);

					sql.query( "UPDATE app.queues SET Billed=1 WHERE ?", {ID: job.ID})
				});

			if ( unfunded = dog.get.unfunded )
				dog.forEach(dog.trace, unfunded, [dog.max.age], function (job, sql) {
					//Trace("KILLING ",job);
					sql.query(
						//"DELETE FROM app.queues WHERE ?", {ID:job.ID}
					);
				});

			if ( stuck = dog.get.stuck )
				dog.thread( (sql) => {
					sql.query(stuck, [], (err, info) => {

						Each(queues, (rate, queue) => {  // save collected queuing charges to profiles
							Each(queue.client, function (client, charge) {

								if ( charge.bill ) {
									//if ( trace ) Trace(`${trace} ${client} ${charge.bill} CREDITS`, sql);

									sql.query(
										"UPDATE openv.profiles SET Charge=Charge+?,Credit=greatest(0,Credit-?) WHERE ?" , 
										 [ charge.bill, charge.bill, {Client:client} ], 
									 	(err) => {
											if (err)
												Trace("Job charge failed "+err);
									});
									
									charge.bill = 0;
								}

							});
						});
						sql.release();

					});	
				});
			
			if ( outsourced = dog.get.outsourced )
				dog.forEach( dog.trace, outsourced, [], function (job, sql) {
					sql.query(
						"UPDATE app.queues SET ?,Age=Age+Work,Departed=Date_Add(Departed,interval Work day) WHERE ?", [
						{ID:job.ID}
					] );
					
					fetcher( job.Notes, null, function (rtn) {
						Log("dog job run "+msg);
					});
				});
		}),
			
		xdogSystem: Copy({  // legacy
			//cycle: 100,
			get: {
				engs: "SELECT count(ID) AS Count FROM app.engines WHERE Enabled",
				jobs: "SELECT count(ID) AS Count FROM app.queues WHERE Departed IS NULL",
				logs: "SELECT sum(Delay>20)+sum(Fault != '') AS Count FROM app.dblogs"
			},
			jobs : 5
		}, function dogSystem(dog) {  // system diag watch dog
			var 
				diag = DEBE.diag;

			if (dog.get.engs)
				dog.thread( sql => {
					sql.forEach(dog.trace, dog.get.engs, [], function (engs) {
					sql.forEach(dog.trace, dog.get.jobs, [], function (jobs) {
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
				dog.forEach(dog.trace, dog.get.naughty, [], function (client, sql) {
				});

			if (dog.get.needy)
				dog.forEach(dog.trace, dog.get.needy, [dog.disk], function (client, sql) {
				});		

			if (dog.get.dormant)
				dog.forEach(dog.trace, dog.get.dormant, [dog.unused], function (client, sql) {
				});		

			if (dog.get.poor)
				dog.forEach(dog.trace, dog.dog.get.poor, [dog.qos], function (client, sql) {
				});		

			if (dog.get.uncert)
				dog.forEach(dog.trace, dog.get.uncert, [dog.certage], function (client, sql) {
				});		
			
		}),
			
		dogNews: Copy({
			cycle: 30,
			get: {
				toRemove: "SELECT * FROM app.news WHERE datediff(now(), _Ingested) > ? OR status_Remove OR now() > status_Ends",
				remove: "DELETE FROM app.news WHERE ?",
				addEntry: "INSERT INTO app.news SET ?"
			},
			maxAge: 1,
			newsPath: "./news"
		}, function dogNews(dog) {
			
			dog.thread( sql => {
				sql.query( dog.get.toRemove, dog.maxAge)
				.on("result", news => {
					sql.query( dog.get.remove, {ID: news.ID});
					CP.exec( `
cd ${dog.newsPath} ;
rm -RIf ${news.Name}*
`	);
				});

				DEBE.indexFile( dog.newsPath, files => {
					files.forEach( file => {
						if ( file.endsWith(".html" ) ) {
							var 
								msg = file.replace(".html",""),
								name = CRYPTO.createHmac("sha256", "pass").update(msg).digest("hex") ;
							
							sql.query( dog.get.addEntry, {
								_Name: name,
								_Ingested: new Date(),
								status_Publish: false,
								Message: msg,
								Category: "packed",
								To: "editor1"
							}, err => {
								if ( !err ) {  // pack news for transport
									CP.exec( `
cd ${dog.newsPath} ;	
mkdir ${name} ;
mv '${msg}'* ${name} ;
source ./maint.sh flatten ${name} ;
rm -RIf ${name} 
`, 
											err => {
												Trace( `News packed ${name}` );
									});
								}
							});
						}

						else 
						if ( file.startsWith("F_" ) ) {
							var 
								parts = file.split("_"),
								name = parts[1];
							
							sql.query( dog.get.addEntry, {
								_Name: name,
								_Ingested: new Date(),
								status_Publish: false,
								_Scanned: 0,
								status_Starts: new Date(),
								To: "editor2",
								Category: "unpacked"
							}, 	(err,entry) => {
								
								if ( !err ) {
									Trace( `News unpack ${name}` );
									CP.exec( `
cd ${dog.newsPath} ;
source ./maint.sh expand ${name} ;
`, 
										err => {
											DEBE.indexFile( `${dog.newsPath}/${name}`, files => {
												files.forEach( file => {
													if ( file.endsWith(".html") ) {
														var msg = file.replace(".html","");
														sql.query( "UPDATE app.news SET ? WHERE ?", [{
																Message: file.replace(".html","").tag(dog.newsPath.substr(1)+`/${name}/index.html`)
															}, {
																ID: entry.insertId
															}
														], err => {
															
															CP.exec(`
cd ${dog.newsPath}/${name} ;
mv '${msg}'.html index.html ;
mv '${msg}'_files index_files ;
`, 
																err => Trace(`News renamed ${name}` + err)
															);
															
														});
													}
												});
											})											
									});
								}
							});
						}
					});
				});
				
				sql.release();
			});
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
				dog.forEach(dog.trace, dog.get.undefined, [dog.undefined], function (client, sql) {
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
				dog.forEach(dog.trace, dog.get.inactive, [dog.inactive], function (client, sql) {
				});		
		})
	},
	
	diag: {  //< reserved for self diag parms
		status: "", 
		counts: {State: ""}
	},

	// request configuration

	"reqFlags." : {  //< endpoint request flags
		
		"traps.": {  // TRAP=name flags can modify the request flags
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
			if (key = req.flags.blog)
				recs.blogify( req, key, req.table, res );
			else
				res(recs);
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
		
		flat: function (recs,req,res) { //< dataset.flat flattens records
			recs.forEach( (rec,n) => {
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

				recs.forEach( (rec) => {
					var cols = [];
					for (var key in rec) cols.push(rec[key]);
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
					"db", "xml", "csv", "txt", "schema", "view", "tree", "flat", "delta", "nav", "html", "json",
					"view","pivot","site","spivot","brief","gridbrief","pivbrief","run","plugin","runbrief",
					"exe", "stat"];

			uses.forEach( (use,n) => {
				uses[n] = use.tag( "/"+table+"."+use );
			});
			
			req.sql.query("DESCRIBE ??.??", [group,table], function (err, stats) {
				
				if (err)
					res(err);
				
				else {
					stats.forEach( (stat,n) => {
						stats[n] = stat.Field.tag( "/"+table+"?_index="+stat.Field );
					});
					
					res(`
Records: ${recs.length}<br>
Fields: ${stats.join(", ")}<br>
Usage: ${uses.join(", ")}  `);
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
			var 
				flags = req.flags,
				query = req.query;
			
			if (sorts = flags.sort)			
				res([{
					name: "root", 
					size: 1, 
					children: recs.treeify( 0, recs.length, 0, sorts.split(",") )
				}]);
			
			else
				res( new Error("missing sorts=key,... flag") );
		},
		
		schema: function (recs,req,res) { //< dataset.schema 
			var 
				flags = req.flags,
				query = req.query,
				src = ("/"+req.table).tag("?",{name:query.name});
			
			res( recs.schemafy( src ) );
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
					
					if ( isError(Recs) )
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
				recs.forEach( (rec,n) => {
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
				recs.forEach( (rec,n) => {  // at leafs
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
		restart: sysRestart,
		//ping: sysPing,
		ingest: sysIngest,
		decode: sysDecode,
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
		/*
		classif: sendAttr,
		readability: sendAttr,
		client: sendAttr,
		size: sendAttr,
		risk: sendAttr,
		*/
		
		// doc generators
		xpdf: sendDoc,
		xjpg: sendDoc,
		xgif: sendDoc,
		
		// plugin attributes
		md: sharePlugin,
		tou: sharePlugin,
		status: sharePlugin,
		suitors: sharePlugin,
		pub: sharePlugin,
		users: sharePlugin,
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
	},

	"byActionTable.": {  //< routers for CRUD endpoints at /DATASET 
	},
	
	// private parameters
		
	admitRule: { 	//< admitRule all clients by default 	
	},
		
	/**
	@private
	@cfg {Object}
	@member DEBE
	Defines site context keys to load skinning context before a skin is rendered.
	Each skin has its own {key: "SQL DB.TABLE" || "/URL?QUERY", ... } spec.
	*/
	primeSkin: { //< site context extenders
		test3: {  // context keys for swag.view
			projs: "select * from openv.milestones"
		}
		/*
		swag: {  // context keys for swag.view
			projs: "select * from openv.milestones"
		},
		airspace: {
			projs: "select * from openv.milestones"
		},
		plugin: {
			projs: "select * from openv.milestones"
		},
		briefs: {
			projs: "select * from openv.milestones"
		},
		rtpsqd: {
			apps:"select * from openv.apps",
			users: "select * from openv.profiles",
			projs: "select * from openv.milestones",
			QAs: "select * from app.QAs"
			//stats:{table:"openv.profiles",group:"client",index:"client,event"}
		} 
		*/
	},
		
	"site.": { 		//< initial site context
		/**
		@class DEBE.SiteSkinning
		*/
		classif: {
			level: "",
			purpose: "",
			banner: ""
		},
		
		info: {
		},
		
		get: function(recs, js) { 
			return recs.get(js);
		},
		
		match: function (recs,where,get) {
			return recs.match(where,get);
		},
		
		replace: function (recs,subs) {
			return recs.replace(subs);
		},
		
		jsonify: function(recs) {  //< jsonize dataset
		/**
		@method json
		Jsonize records.
		@param {Array} recs Record source
		*/
			return JSON.stringify(recs);
		},
		
		tag: function (src,el,tags) {
		/**
		@method tag
		*/
			return src.tag(el,tags);
		},
		
		hover: function (ti,fn) {
		/**
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
		@method gridify
		*/
			return recs.gridify(noheader);
		}
	},
	
	"errors.": {  //< error messages
		pretty: err => {
			return "".tag("img",{src:"/stash/reject.jpg",width:40,height:60})
				+ (err+"").replace(/\n/g,"<br>").replace(process.cwd(),"").replace("Error:","")
				+ ". " + [
					"Issues".tag( "/issues.view" ),
					"Home".tag( "/home.view" ),
					"API".tag( "/api.view" )
				].join(" || ");
		},
		noPartner: new Error( "endservice missing or did not respond with transition partner" ),
		noAttribute: new Error( "undefined engine attribute" ),
		noEngine: new Error( "no such engine" ),
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
		//default: "home.view",
		home: 
			"Totem".tag("/treefan.view?src=info&w=1000&h=600") 
			+ ": protecting the warfighter from bad data",
		
		jadePath: "./public/jade/ref.jade",	// jade reference path for includes, exports, appends
		
		engine: "SELECT * FROM app.engines WHERE least(?,1) LIMIT 1",
		jades: "./public/jade/",		// path to default view skins
		
		mime: {
			/*
			//tour: ".",		 			//< enable totem touring 
			//jobs: "./public/jobs",		//< path to tau simulator job files
			stash: ".", 		//< totem static file area
			stores: "./public", 		//< persistant file store area
			uploads: "./public", 		//< one-time file store area
			chips: "./public/images",	//< chipped jpg files
			tips: "./public/images",	//< tipped/compressed jpg files
			data: "./public",  //< debug data
			jade: "./public",		//< path to initial views
			shares: "./public", 				//< shared public files
			docs: ".", 					//< html documents
			"socket.io": ".",				//< path to socket.io to interconnect clients
			clients: ".",				//< path to 3rd party ui clients
			uis: ".", 					//< path to debe ui drivers
			//icons: ".",				//< path to icons
			captcha: ".",		//< path to captcha jpgs for antibot protection		
			*/
			/*index: { 					//< paths for allowed file indexers ("" to use url path)
				shares: "",
				uploads: "",
				stores: ""
				//public: "",
				//data: ""
			},*/
			xlate: null,  	//< i18n path to po translation files
			
			extensions: {  // Extend mime types as needed
				rdp: "application/mstsc",
				run: "text/html",
				exe: "text/html",
				js: "text/plain",
				py: "text/plain",
				ma: "text/plain",
				tou: "text/html"
			}			
		},
		
		skin: {
			org1: "./public/jade/Org1",
			org2: "./public/jade/Org2",
			mood1: "./public/jade/Mood1"
		}
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
		
	ingestFile: function(sql, filePath, fileName, fileID, cb) {  // ingest events from file with callback cb(aoi).
		
		//Log("ingest file", filePath, fileName, fileID);
		
		HACK.ingestFile(sql, filePath, fileID, function (aoi) {			
			Log("INGESTED", aoi);
		});
	},
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enable for double-blind testing 
	*/
	blindTesting : false		//< Enable for double-blind testing (eg make FLEX susceptible to sql injection attacks)
}, TOTEM, ".");

/**
@class DEBE.Utilities.SOAP
*/

function SOAPsession(req,res,peer,action) {
/**
@method SOAPsession
@private

Process an bySOAP session peer-to-peer request.  Currently customized for Hydra-peer and 
could/should be revised to support more generic peer-to-peer bySOAP interfaces.
 
@param {Object} req HTTP request
@param {Object} res HTTP response
@param {Function} proxy Name of APP proxy function to handle this session.
*/
	Thread( sql => {
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

function icoFavicon(req,res) {   // extjs trap
	res("No icons here"); 
}

/**
@class DEBE.End_Points.Attributes
get and send dataset attributes
*/

function sendCert(req,res) { // create/return public-private certs
/**
@method sendCert
Totem (req,res)-endpoint to create/return public-private certs
@param {Object} req Totem request
@param {Function} res Totem response
*/
	
	var 
		owner = req.table,
		pass = req.type;
		
	DEBE.prime(owner, pass, {}, function () {
	
		CP.exec(
			`puttygen ${owner}.key -N ${pass} -o ${owner}.ppk`, 
			
			err => {
			
			if (err) 
				res( DEBE.errors.certFailed );
				
			else {	
				var 
					paths = DEBE.paths,
					site = DEBE.site,
					master = site.urls.master,
					FF = "Firefox".tag( master+"/stash/firefox.zip" ),
					Putty = "Putty".tag( master+"/stash/putty.zip" ),
					Cert = "Cert".tag( master+"/cert/${owner}" );
					
				res( function () {
					return {
						area: "",
						name: `${owner}.ppk`
					}
				});

				FLEX.sendMail({
					from:  DEBE.site.ASP,
					to:  DEBE.site.ISP,
					cc: name,
					subject: `${DEBE.site.Nick} account request`,
					html: 
`Greetings from ${site.Nick.tag(master)}-

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
Totem (req,res)-endpoint to send the .area attribute of a .table file 
@param {Object} req Totem request
@param {Function} res Totem response
*/
	
	var 
		attr = req.area,
		table = req.table,
		sql = req.sql;

	sql.query("SELECT *,count(ID) AS count FROM app.files WHERE least(?) LIMIT 0,1",{Area:area,Name:table})
	.on("result", function (file) {
		res( ( "body {background-color:red;}".tag("style") 
				+ (file[attr]||"?").tag("body")).tag("html") );
	});

}

/**
@class DEBE.End_Points.Plugin
support for plugins (a dataset-engine couple).
*/

function extendPlugin(req,res) {
/**
@private
@method extendPlugin
Totem (req,res)-endpoint to add req.query keys to plugin req.table.
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
Totem (req,res)-endpoint to remove req.query keys from plugin req.table.
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
Totem (req,res)-endpoint to execute plugin req.table using usecase req.query.ID || req.query.Name.
@param {Object} req http request
@param {Function} res Totem response callback
*/	
	
	function pipePlugin( data, pipe, ctx, cb ) { // prime plugin with pipe and run in context ctx
		req.query = ctx;   // let plugin mixin its own keys
		Log("prime pipe", pipe);
		Copy(ctx, data);
		ctx.Data = data;
		Each(pipe, (key,val) => { // add pipe keys to engine ctx
			if ( isString(val) )
				ctx[key] = data[key] = val.parseJS(data, (val,err) => val  );
		});
			
		ATOM.select(req, ctx => {  // run plugin
			
			if ( ctx )
				if ( isError(ctx)  )
					Log(`${ctx.Host} ` + ctx);

				else {	// remove pipe keys from ctx
					Log("clear pipe", pipe);
					for (var key in pipe) delete ctx[key];
					cb(ctx);
				}
			
			else
				Log("lost engine contxt");
		});
	}
	
	function pipeCross( depth, keys, forCtx, setCtx, cb ){	// enumerate over forCtx keys will callback cb(setCtx)
		if ( depth == keys.length ) 
			cb( setCtx );
		
		else {
			var 
				key = keys[depth],
				values = forCtx[ key ];
			
			if (values)
				values.forEach( value => {
					setCtx[ key ] = value;
					pipeCross( depth+1, keys, forCtx, setCtx, cb );
				});
		}
	}
	
	function pipeCopy(ctx) {
		var 
			rtn = {Pipe: '"' + ctx.Pipe.path + '"' },
			skip = {Host: 1, ID: 1, Pipe: 1};
		
		for (var key in  ctx) 
			if ( (key in skip) || key.startsWith("Save_") ) {
			}
		
			else
				rtn[key] = ctx[key];
		
		return rtn;
	}
	
	var
		now = new Date(),
		sql = req.sql,
		client = req.client,
		profile = req.profile,
		group = req.group,
		table = req.table,
		profile = req.profile,
		query = req.query,
		host = table;

	//Log("exe", query );
	if ( days = parseInt(query.days||"0") +parseInt(query.hours||"0")/24 ) {
		res("queueing polled job");
		delete query.days;
		delete query.hours;
		sql.query("INSERT INTO app.queues SET ?",  {
			Client: client,
			Class: "polled",
			QoS: profile.QoS,  // [secs] job polling
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
		FLEX.runPlugin(req, ctx => {  // run engine using requested usecase via the job regulator 

			//Log("run ctx", ctx);

			if ( !ctx)
				res( DEBE.errors.noContext );
			
			else
			if ( isError(ctx) )
				res( ctx );
			
			else
			if ( Pipe = ctx.Pipe )  { // intercept pipe for supervised and regulated workflow
				res("Piped");

				ctx.Host = host;

				switch ( Pipe.constructor ) {
					case String: // query contains a source path

						var
							chipper = HACK.chipVoxels,
							fetcher = DEBE.fetcher,
							pipeQuery = {},
							pipePath = Pipe.parseURL(pipeQuery,{},{},{}),
							parts = pipePath.split("."),
							pipeName = parts[0] || "",
							pipeType = parts.pop() || "",
							isFlexed = FLEX.select[pipeName.substr(1)] ? true : false,
							pipeRun = `${ctx.Host}.${ctx.Name}`,
							job = { // job descriptor for regulator
								qos: 1, //profile.QoS, 
								priority: 0,
								client: req.client,
								class: "plugin",
								credit: 100, // profile.Credit,
								name: req.table,
								task: pipeQuery.Name || pipeQuery.ID,
								notes: [
										req.table.tag("?",{ID:pipeQuery.ID}).tag( "/" + req.table + ".run" ), 
										((profile.Credit>0) ? "funded" : "unfunded").tag( req.url ),
										"RTP".tag( `/rtpsqd.view?task=${pipeQuery.Name}` ),
										"PMR brief".tag( `/briefs.view?options=${pipeQuery.Name}`)
								].join(" || "),
								query: pipeQuery,
								url: Pipe,
								path: pipePath,
								ctx: ctx
							};

						if ( !isFlexed ) {  // update file change watchers 
							sql.query( "DELETE FROM openv.watches WHERE File != ? AND Run = ?", [pipePath, pipeRun] );

							sql.query( "INSERT INTO openv.watches SET ?", {  // associate file with plugin
								File: pipePath,
								Run: pipeRun
							}, (err,info) => {

								if ( !err )
									if ( pipePath.charAt(0) == "/" )
										dogAutoruns( pipePath );
							});
						}
						
						switch (pipeType) {  // file types determine workflow
							case "stream": 	// load data from streamed file
								sql.insertJob( job, job => { 
									
									function fetch(path, cb) {
										FS.createReadStream("."+path,"utf8").get( "", evs => cb({evs: evs} ) );
									}
									
									fetch( job.path , evs => {	// fetch and route events to plugin
										pipePlugin( evs, job.query, job.ctx, ctx => saveEvents(ctx.Save, ctx) );
									});
								});
								break;
								
							case "jpg":		// run jpg scripting query
								sql.insertJob( job, job => { 
									
									function fetch( path, ctx, query, cb) {
										var
											data = {},
											firstKey = "";

										for (var key in query)  // first key is special scripting-with-callback key
											if ( !firstKey ) {
												firstKey = key;

												`read( path, img => cb( ${query[key]} ) )`
												.parseJS( Copy(ctx, { // define parse context
													//Log: console.log,

													read: (url,cb) => {	// read and forward jpg to callback
														$.IMP.read( "."+ path )
														.then( img => { 
															Log("read", path, img.bitmap.height, img.bitmap.width);
															img.readPath = path;
															if (cb) cb( img); 
															return img; 
														} )
														.catch( err => Log(err) );
													},

													path: path,

													cb: rtn => {
														data[firstKey] = rtn;
														query[firstKey] = firstKey;
														cb( data );
													}
												}) );
											}  
									}
									
									fetch( job.path, job.ctx, job.query, evs => {
										pipePlugin( evs, job.query, job.ctx, ctx => saveEvents(ctx.Save, ctx) );
									});
								});	
								break;							
								
							case "json":	// send raw json data to the plugin
								sql.insertJob( job, job => { 
									
									function fetch(path, cb) {
										fetcher( path, null, info => cb( info.parseJSON( {} ) ) );
									}
									
									fetch( job.url, evs => {	// fetch and route events to plugin
										pipePlugin( evs, job.query, job.ctx, ctx => saveEvents(ctx.Save, ctx) );
									});
								});
								break;

							case "txt": // NLP training
								break;
								
							case "": // no source
								break;
								
							default: 	// stream indexed events or chips through supervisor 
								sql.forEach( TRACE, "SELECT * FROM app.files WHERE Name LIKE ? ", pipePath , file => {		// regulate requested file(s)

									function chipFile( file , ctx ) { 

										//Log( "chip file>>>", file );
										ctx.File = file;
										chipper(sql, query, voxctx => {  // get voxel context for each voxel being chipped

											job.ctx = Copy( ctx, voxctx );

											sql.insertJob( job, (job, sql) => {  // put voxel into job regulation queue
												if (chip = voxctx.chip) {  // place chips into chip supervisor
													var
														ctx = job.ctx, // recover job context
														chip = ctx.Chip;

													$.supervisedROC(  chip, {}, H0 => {
													});
												}

												else {	// run event file thru event supervisor
													var
														ctx = job.ctx, // recover job context
														file = ctx.File,
														supervisor = new RAN({ 	// learning supervisor
															learn: function (supercb) {  // event getter callsback supercb(evs) or supercb(null,onEnd) at end
																var 
																	supervisor = this;

																//Log("learning ctx", ctx);

																if ( evs = ctx.Events ) 
																	evs.get( "t", evs => {  // get supervisor evs until null; then save supervisor computed events
																		Trace( evs ? `SUPERVISING voxel${ctx.Voxel.ID} events ${evs.length}` : `SUPERVISED voxel${ctx.Voxel.ID}` , sql );

																		if (evs) // feed supervisor
																			supercb(evs);

																		else // terminate supervisor and start engine
																			supercb(null, function onEnd( flow ) {  // attach supervisor flow context
																				ctx.Flow = flow; 
																				ctx.Case = "v"+ctx.Voxel.ID;
																				Trace( `STARTING voxel${ctx.Voxel.ID}` , sql );

																				pipePlugin( {}, ctx, ctx => {
																					supervisor.end( ctx.Save || [], (evstore) => {
																						saveEvents(evstore, ctx);
																					});
																				});
																			});	
																	});

																else	// terminate supervisor
																	supercb(null);
															},  

															N: query.actors || file._Ingest_Actors,  // ensemble size
															keys: query.keys || file.Stats_stateKeys,	// event keys
															symbols: query.symbols || file.Stats_stateSymbols || file._Ingest_States,	// state symbols
															steps: query.steps || file._Ingest_Steps, // process steps
															batch: query.batch || 0,  // steps to next supervised learning event 
															//trP: {states: file._Ingest_States}, // trans probs
															trP: {},	// transition probs
															filter: function (str, ev) {  // filter output events
																switch ( ev.at ) {
																	case "batch":
																		//Log("filter", ev);
																	case "config":
																	case "end":
																		str.push(ev);
																}
															}  
														});

													supervisor.query( stats => { // query supervisor to this callback
														Trace( `PIPED voxel${ctx.Voxel.ID}` , sql );
													}); 
												}												
											});	
										});
									}

									["stateKeys", "stateSymbols"].parseJSON(file);

									if (file._State_Archived) 
										CP.exec("", function () {  // revise to add a script to cp from lts and unzip
											Trace("RESTORING "+file.Name);
											sql.query("UPDATE app.files SET _State_Archived=false WHERE ?", {ID: file.ID});
											chipFile(file, query);
										});

									else
										chipFile(file, query);
								});
						}
						break;

					case Array:  // query contains event list
						ctx.Events = Pipe;
						pipePlugin( {}, ctx, ctx => saveEvents(ctx.Save, ctx) );
						break;

					case Object:  // monte-carlo query
						var 
							keys = [], 
							runCtx = pipeCopy(ctx), 
							jobs = [], inserts = 0,
							fetcher = DEBE.fetcher;
						
						for (var key in Pipe)  if ( key in ctx ) keys.push( key );
						
						sql.query( `DELETE FROM app.${host} WHERE Name LIKE '${ctx.Name}-%' ` );
						
						pipeCross( 0 , keys, Pipe, {}, setCtx => {
							jobs.push( Copy(setCtx, { Name: `${ctx.Name}-${jobs.length}` }) );
						})
						
						jobs.forEach( job => {
							sql.query( `INSERT INTO app.${host} SET ?`, Copy(job, runCtx), err => {
								if ( ++inserts == jobs.length )
									if ( !Pipe.norun )
										jobs.forEach( job => {
											fetcher( `/${host}.exe?Name=${job.Name}`, null, info => {} );
										});
							});
						});
						
						break;
				}				
			}
					
			else	// unpiped (e.g. event generation) engines never participate in a supervised workflow
				res( saveEvents( ctx.Save, ctx ) || "ok" );
			
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

function saveEvents(evs, ctx) {
/**
Aggregate and save events evs = [ev, ...] || { } || Error under direction of the supplied context 
ctx = { Save: { ... }, Ingest: true||false, Export: true||false, ... }.  Stashify is used to 
aggreagate data using [ev, ...].stashify( "at", "Save_", ctx ) where events ev = 
{ at: KEY, A: a1, B: b1, ... } || { x: x1, y: y1 } are saved in Save_KEY = 
{A: [a1, a2,  ...], B: [b1, b2, ...], ...} iff Save_KEY is in the supplied ctx.  
*/
	var
		host = ctx.Host,
		client = "guest",
		fileName = `${ctx.Host}.${ctx.Name}.stream`;
	
	//Log("saving", evs);
	
	if (evs)
		switch (evs.constructor.name) {
			case "Error": 
				return evs+"";

			case "Object":  // keys in the plugin context are used to create the stash
				evs.ID = ctx.ID;
				evs.Host = ctx.Host;
				return "".save( evs, (evs,sql) => {
					//Log("save ctx done");
				});
				break;
				
			case "Array":
				return Array.from(evs).save( ctx, (evs,sql) => {  // save events and callback with remaining unsaved evs

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

						DEBE.uploadFile( "", srcStream, `./stores/${fileName}` );
					}

					if ( ctx.Ingest )  // ingest remaining events
						DEBE.getFile( client, fileName, function (fileID, sql) {
							sql.query("DELETE FROM app.events WHERE ?", {fileID: fileID});

							HACK.ingestList( sql, evs, fileID, function (aoi) {
								Log("INGESTED",aoi);
								
								DEBE.thread( (sql) => {	// autorun plugins linked to this ingest
									exeAutorun(sql,"", `.${ctx.Host}.${ctx.Name}` );
									sql.release();
								});
							});
						});

				}); 
		}
	
	else
		return null;
	
}

/**
@class DEBE.End_Points.Skinning
*/

function renderSkin(req,res) {
/**
@method renderSkin
@member DEBE
Totem (req,res)-endpoint to render req.table using its associated jade engine. 
@param {Object} req Totem request
@param {Function} res Totem response
*/
	var 
		sql = req.sql,
		query = req.query,
		paths = DEBE.paths,
		site = DEBE.site,  
		error = DEBE.errors,
		primeSkin = DEBE.primeSkin,
		urls = site.urls,
		query = req.query,
		routers = DEBE.byActionTable.select,
		dsname = req.table,
		ctx = Copy(site, {  //< default site context to render skin
			table: req.table,
			dataset: req.table,
			type: req.type,
			//parts: req.parts,
			action: req.action,
			//org: req.org,
			client: req.client,
			flags: req.flags,
			query: req.query,
			joined: req.joined,
			profile: req.profile,
			group: req.group,
			//search: req.search,
			session: req.session,
			/*
			util: {
				cpu: (cpuavgutil() * 100).toFixed(0), // (req.log.Util*100).toFixed(0),
				disk: ((req.profile.useDisk / req.profile.maxDisk)*100).toFixed(0)
			},*/
			started: DEBE.started,
			filename: DEBE.paths.jadePath,  // jade compile requires
			url: req.url
		});
		
	function dsContext(ds, cb) { // callback cb(ctx) with skinning context ctx
		
		if ( dsreq = primeSkin[ds] ) // render in ds context
			sql.serialize( dsreq, ctx, cb );
		
		else  // render in default site context
			cb( ctx );
	}
	
	dsContext(dsname, ctx => {  // get skinning context for this skin

		/**
		@class DEBE.Utilities.Skinning
		*/
		function renderFile( file, ctx ) { 
		/**
		@private
		@method renderFile
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/
			try {
				res( JADE.renderFile( file, ctx ) );  
			}
			catch (err) {
				res(  err );
			}
		}

		function renderPlugin( fields, ctx ) { // render using plugin skin
		/**
		@private
		@method renderPlugin
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/
			
			Copy({
				mode: req.type,
				page: query.page,
				dims: query.dims || "100%,100%",
				ds: dsname
			}, query);
			
			//Log([query, req.search]);
			
			var
				cols = [],
				drops = { id:1, odbcstamp: 1};
			
			switch (fields.constructor) {
				case Array:
					fields.forEach( (field,n) => {
						var 
							key = field.Field, 
							type = field.Type.split("(")[0];
							//group = key.split("_");
						
						if ( key.toLowerCase() in drops ) {		// drop
						}
						else
						if ( type == "geometry") {		// drop
						}
						else {		// take
							var
								doc = escape(field.Comment).replace(/\./g, "%2E").replace(/\_/g,"%5F"),
								qual = "short";
							
							if ( key.indexOf("Save") == 0) qual += "hideoff" ;
							
							else
							if ( key.charAt(0) == "_" ) qual += "off";
							
							//Log(key,qual);
							cols.push( key + "." + type + "." + doc + "." + qual );
						}
					});
					break;
					
				case String:
					fields.split(",").forEach( field => {
						if ( field != "ID") cols.push( field );
					});	
					break;
					
				case Object:
				default:
					Each(fields, field => {
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
			
			renderFile( paths.jades+"plugin.jade", ctx );
		}		
		
		function renderTable( ds, ctx ) {
		/**
		@private
		@method renderPlugin
		Render table at path this to res( err || html ) in a new context created for this request.  
		**/			
			sql.query( 
				"SHOW FULL COLUMNS FROM ??", 
				sql.reroute( ds ), 
				function (err,fields) {
				
				if (err) // render jade file
					renderFile( paths.jades+ds+".jade", ctx );

				else // render plugin
					renderPlugin( fields, ctx );
			});	
		}
		
		function renderJade( jade, ctx ) { 
		/**
		@private
		@method renderJade
		Render Jade string this to res( err || html ) in a new context created for this request. 
		**/
			try {
				res( JADE.compile(jade, ctx) (ctx) );
			}
			catch (err) {
				res( err );
			}
		}

		sql.forFirst("", paths.engine, { // Try a jade engine
			Name: req.table,
			Type: "jade",
			Enabled: 1
		}, eng => {

			if (eng)  // render view with this jade engine
				renderJade( eng.Code || "", ctx );

			else
			if ( route = routers[dsname] )   // render ds returned by an engine 
				route(req, recs => { 
					//Log({eng:recs, ds:req.table});
					if (recs)
						renderPlugin( recs[0] || {}, ctx );

					else
						renderTable( dsname , ctx );
				});	

			else  // render a table
				renderTable( dsname , ctx );

		});
	});
}

/**
@class DEBE.Utilities.Doc_Generation
*/
function genDoc(recs,req,res) {
/**
@method genDoc
Convert records to requested req.type office file.
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
`
						);
		}

		var cols = [];
		var rows = [cols];

		recs.forEach( (rec,n) => {
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

/**
@class DEBE.End_Points.System
service maintenance endpoints
*/

function sysRestart(req,res) {
	var
		query = req.query,
		delay = 10,
		pocs = DEBE.site.pocs || {},
		msg = query.msg = `System updating in ${delay} seconds`;
	
	if ( req.client == pocs.admin ) {
		Log(req.client, DEBE.site.pocs);

		sysAlert(req,res);

		setTimeout( function () {
			Trace("RESTART ON " + now());
			process.exit();
		}, delay*1e3);
	}
	
	else
		res("This endpoint reserved for " + "system admin".tag( "mailto:" + pocs.admin ) );
}

function sysIngest(req,res) {
/**
@method sysIngest
Totem (req,res)-endpoint to ingest a source into the sql database
@param {Object} req Totem request
@param {Function} res Totem response
*/
	
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

function sysDecode(req,res) {
/**
@method sysDecoder
Return release information about requested license.
@param {Object} req Totem request
@param {Function} res Totem response
*/
	var
		sql = req.sql,
		query = req.query;
	
	sql.query("SELECT Master,releases.* FROM app.masters LEFT JOIN app.releases ON releases._License = masters.License WHERE ?", {
		License: query.License
	}, (err, recs) => {
		if (rec = recs[0]) {
			var info = Copy(rec,{});
			delete info.Master;
			res( [info].gridify() + "<br>" + rec.Master );
		}
		
		else
			res(err);
	});
}

function sysAgent(req,res) {
/**
@method sysAgent
Totem (req,res)-endpoint to send notice to outsource jobs to agents.
@param {Object} req Totem request
@param {Function} res Totem response
*/
	
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

			sql.query("UPDATE ?? SET ? WHERE ?", [plugin, {Save: json}, {ID: id}], err => {
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
Totem (req,res)-endpoint to send notice to all clients
@param {Object} req Totem request
@param {Function} res Totem response
*/
	var 
		query = req.query,
		pocs = DEBE.site.pocs || {},
		msg = query.msg;
	
	if ( req.client == pocs.admin ) {
		if (IO = DEBE.IO)
			IO.sockets.emit("alert",{msg: msg || "system alert", to: "all", from: DEBE.site.title});

		Trace("ALERTING "+msg);
		res("Broadcasting alert");
	}
	
	else 
		res("This endpoint reserved for " + "system admin".tag( "mailto:" + pocs.admin ) );
}

function sysStop(req,res) {
/**
@method sysStop
Totem (req,res)-endpoint to send emergency message to all clients then halt totem
@param {Object} req Totem request
@param {Function} res Totem response
*/
	if (IO = DEBE.IO)
		IO.sockets.emit("alert",{msg: req.query.msg || "system halted", to: "all", from: DEBE.site.title});
	
	res("Server stopped");
	process.exit();
}

/**
@class DEBE.Utilities.Startup_and_Initialization
*/
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
					.on("error", err => {
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
			//DEBE[crude] = FLEX[crude].ds;
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
			//emitter: DEBE.IO ? DEBE.IO.sockets.emit : null,
			skinner: JADE,
			fetcher: DEBE.fetcher,
			indexer: DEBE.indexFile,
			createCert: DEBE.createCert,
			
			diag: DEBE.diag,
			
			site: DEBE.site						// Site parameters

		});

		HACK.config({
			//source: "",
			taskPlugin: null,
			thread: DEBE.thread
		});
		
		$.config({
			thread: DEBE.thread,
			tasker: DEBE.tasker
		});
		
		ATOM.config({
			thread: DEBE.thread,
			cores: DEBE.cores,
			//watchFile: DEBE.watchFile,
			plugins: Copy({   // share selected FLEX and other modules with engines
				// MAIL: FLEX.sendMail,
				RAN: require("randpr"),
				$: $
				/*TASK: {
					shard: DEBE.tasker
				}, */
			}, $ )
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
		DEBE.indexFile( path, (files) => {  // publish new engines
			var ignore = {".": true, "_": true};
			files.forEach( (file) => {
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

//====================== Extend objects

[
	function get( idx, cb ) {
		function pipe(filter, src, cb) {  
			var 
				ingested = 0,
				evs = [],
				sink = new STREAM.Writable({
					objectMode: true,
					write: function (rec,en,cb) {

						function cache(ev) {
							ingested++;
							evs.push( ev );
						}

						if (filter)   // filter the record if filter provided
							filter(rec, cache);

						else  // no filter so just cache the record
							cache(rec);

						cb(null);  // signal no errors
					}
				});
		
			sink
			.on("finish", function () {
				cb( evs );
			})
			.on("error", function (err) {
				Log("Pipe failed", err);
			});
		
			src.pipe(sink);  // start the ingest
		}
		
		function filter(buf, cb) {
			buf.split("\n").forEach( rec => {
				if (rec) 
					try {
						if ( data = JSON.parse(rec) )
							switch (data.constructor.name) {
								case "Array": 
									data.forEach( rec => cb(rec) );
									break;
									
								case "Object":
									cb( data );
									break;
									
								default: 
									cb( {t: data} );
							}
					}
					
					catch (err) {
						var vals = rec.split(",");
						cb( { x: parseFloat(vals[0]), y: parseFloat(vals[1]), z: parseFloat(vals[2]), t: parseFloat(vals[3]), n: parseInt(vals[4]), u: parseInt(vals[5]) } );
					}
			});	
		}
		
		pipe(filter, this, cb);
	}
].Extend(STREAM);

[  // string prototypes
	
	// string serializers 
	/*
	function Xblog(req, ds, cache, ctx, rec, viaBrowser, cb) {
		var
			jade = `extends layout
append layout_parms
	- math = true
	- highlight = "zenburn"
append layout_body
	:markdown
		`  + this
		.replace(/^\n* /g, "" )  //<<<<<<
		.replace(/\n/g,"\n\t\t");
		
		try {
			var ctx = {filename: DEBE.paths.jadePath, query: {} };	
			Log("jade", ctx, jade);
			cb( JADE.compile(jade, ctx) (ctx) );
		}
		catch (err) {
			Log(err);
			cb( err+"" );
		}		
	},
	*/
	function Xblog(req, ds, cache, ctx, rec, viaBrowser, cb) {
	/**
	@member String
	Expands markdown of the form:
		
		[ TEXT ] ( PATH.TYPE ? w=WIDTH & h=HEIGHT & x=KEY$INDEX & y=KEY$INDEX ... )  
		[ TEXT ] ( COLOR )  
		[ TOPIC ] ( ? starts=DATE & ends=DATE )  
		$$ inline TeX $$  ||  n$$ break TeX $$ || a$$ AsciiMath $$ || m$$ MathML $$  
		[JS || #JS || TeX] OP= [JS || #JS || TeX]  
		$ { KEY } || $ { JS } || $ {doc( JS , "INDEX" )}  
		KEY,X,Y >= SKIN,WIDTH,HEIGHT,OPTS  
		KEY <= VALUE || OP <= EXPR(lhs),EXPR(rhs)  
		
	using the supplifed cache to get/put KEY values, as well as block-escaping:
				
		HEADER:

			BLOCK

	and markdown scripting:

		MARKDOWN
		script:
		MATLAB EMULATION SCRIPT
		
	@param {Object} req Totem request
	@param {String} ds default dataset in [post](URL) markdown
	@param {Object} cache hash for cacheing markdown variables
	@param {Object} ctx hash holding markdown variables
	@param {Obect} rec record hash for markdown variables
	@param {Boolean} viaBrowser true to render markdown to browser
	@param {Function} cb callback(markdown html)
	*/
		
		for (var key in rec)  // parse json stores
			try { 
				ctx[key] = JSON.parse( rec[key] ); 
			} 
			catch (err) { 
				ctx[key] = rec[key]; 
			}
	
		var 
			blockidx = 0;
		
		//Copy(DEBE.blogContext, new Object(ctx));
		Copy(DEBE.blogContext, ctx);
		
		this.Xescape( [], (blocks,html) => // escape code blocks
		html.Xbreaks( html => // force new lines
		html.Xsection( html => // expand section headers
		html.Xscript( ctx, (ctx,html) => // expand scripts 
		html.Xkeys( ctx, html => // expand js keys
		html.Xgen(ctx, html => // expand generators
		html.Xtex( html => // expand TeX
		html.Xlink( req, ds, viaBrowser, html => { // expand links

			if ( viaBrowser )
				html = 	html.replace(/href=(.*?)\>/g, (str,ref) => { // smart links to follow <a href=REF>A</a> links
					var q = (ref.charAt(0) == "'") ? '"' : "'";
					return `href=${q}javascript:navigator.follow(${ref},BASE.user.client,BASE.user.source)${q}>`;
				});

			cb( html.replace(/@block/g, str => {  // backsub escaped blocks
					//Log(`unblock[${blockidx}]`, blocks[ blockidx].tag("code",{}) );
					return blocks[ blockidx++ ].tag("code",{}).tag("pre",{});
				}) );
			
		}))))))));
	},
	
	function Xbreaks( cb ) {
		cb( this.replace( /  \n/g, "<br>" ) );
	},
	
	function Xescape( blocks, cb ) { // escapes code blocks then callsback cb(blocks, html)
		var 
			key = "@esc",
			html = this,
			fetchBlock = function ( rec, cb ) {	// callsback cb with block placeholder
				//Log(`block[${blocks.length}] `, rec.arg1 );
				blocks.push( rec.arg2 );
				cb( rec.arg1 + ":" + "@block");
			},
			pattern = /(.*)\:\n\n((\t.*\n)+)\n/gm ;
				// /\n(.*)\:\n\n((.|\n)*)\n\n/g ;	// define escaped code block
		
		html.serialize( fetchBlock, pattern, key, (html, fails) => {  
			cb( blocks, html);
		}); 		
	},
	
	function Xdummy(cb) {  // for debugging with callback(this)
		cb(this);
	},
	
	function Xlink( req, ds, viaBrowser, cb ) {  // expands [LINK](URL) tags then callsback cb( final html )
		/*
		req = null to disable topic expansions
		ds = dataset?query default url path
		viaBrowser = true to enable produce html compatible with browser
		*/
		var 
			key = "@tag",
			html = this,
			fetcher = DEBE.fetcher,
			fetchTopic = function ( rec, cb) {  // callback cb with expanded [TOPIC]() markdown
				var 
					secret = "",
					topic = rec.topic,
					product = topic+".html";

				if (req)
					FLEX.licenseCode( req.sql, html, {  // register this html with the client
						_Partner: req.client,
						_EndService: "",  // leave empty so lincersor wont validate by connecting to service
						_Published: new Date(),
						_Product: product,
						Path: "/tag/"+product
					}, (pub, sql) => {
						if (pub) {
							cb( `${rec.topic}=>${req.client}`.tag( "/tags.view" ) );
							sql.query("INSERT INTO app.tags SET ? ON DUPLICATE KEY UPDATE Views=Views+1", {
								Viewed: pub._Published,
								Target: pub._Partner,
								Topic: topic,
								License: pub._License,
								Message: "get view".tag( "/decode.html".tag("?",{Target:pub._Partner,License:pub._License,Topic:topic}))
							});
						}
					});
				
				else
					cb( "");
			},
			
			fetchSite = function ( rec, cb ) {  // callback cb with expanded [](URL) markdown
				//Log("solicit", rec, viaBrowser);
				if (viaBrowser) 
					cb( "".tag("iframe", {src:rec.arg2}) );
				
				else
					fetcher( rec.arg2, null, cb );
			},
			
			fetchLink = function ( rec, cb ) {  // expand [LINK](URL) markdown
				
				var
					opt = rec.arg1,
					url = rec.arg2;

				if (opt)	//	[ LABEL ] ( URL )
					cb( opt.tag( url ) );

				else {	// [ ] ( URL )
					var
						colors = {
							r: "red", 
							b: "blue",
							g: "green",
							y: "yellow",
							o: "orange",
							k: "black",
							red: "red",
							blue: "blue",
							green: "green",
							yellow: "yellow",
							orange: "orange",
							black: "black"
						},						
						keys = {},
						dsPath = ds.parseURL(keys,{},{},{}),
						urlPath = url.parseURL(keys,{},{},{}),
						
						w = keys.w || 100,
						h = keys.h || 100,
						
						now = new Date(),

						urlParts = urlPath.split("."),
						urlName = urlParts[0],
						urlType = urlParts[1],
						
						srcPath = urlPath.tag( "?", Copy({src:dsPath}, keys) );

					
				// Log("link", [dsPath, srcPath, urlPath], keys, [opt, url]);

					switch (urlType) {  //  [](PATH.TYPE?w=W&h=H)
						case "jpg":  
						case "png":
							cb( "".tag("img", { src:`${url}?killcache=${new Date()}`, width:w, height:h }) );
							break;

						case "view": 
							if ( viaBrowser )
								cb( "".tag("iframe", { src:srcPath, width:w, height:h }) );
							
							else
								cb( urlPath.tag( url ) );
							
							break;

						default: 
							if ( viaBrowser )
								cb( "".tag("iframe", { src:srcPath, width:w, height:h }) );

							else
								fetchSite(rec, cb);

							/*
							if ( color = colors[urlPath.toLowerCase()] )		// [ TEXT ]( COLOR )
								cb( opt.tag("font",{color:color}) );
							*/
							/*
							else		// [ TEXT ]( URL )
							if ( (keys.starts ? now>=new Date(keys.starts) : true) && 
								 (keys.ends ? now<=new Date(keys.ends) : true) ) {
								rec.topic = opt;
								fetchTopic( rec, cb );
							}

							else
								cb( opt.tag( "/tags.view" ) );
							*/
							
							break;
					}
				}
			},
			
			pattern = /\[([^\[\]]*)\]\(([^\)]*)\)/g ;
		
		html.serialize( fetchLink, pattern, key, html => {    
			cb(html);
		}); 
	},
	
	function Xscript( ctx, cb ) {  // expands scripting tags then callsback cb(vmctx, final markdown)
		var 
			script = "",
			pattern = /script:\n((.|\n)*)/g,  // defines MARKDOWN\nscript:\SCRIPT tag pattern
			run = this.replace( pattern , (str, xscript) => {
				script = xscript;
				return "";
			});
		
		if ( script )
			try {
				$( script, ctx, (vmctx) => {
					cb( vmctx , run);
				});
			}
			catch (err) {
				cb( ctx, err+"");
			}
		
		else 
			cb(ctx, run);
	},
		
	function Xkeys( ctx, cb ) {  // expand js keys ${script} || ${keys}
		cb( this.parseEMAC(ctx) );
	},
	
	function Xgen( ctx, cb ) {  // expands LHS OP= RHS tags

		var 
			pattern = /(\S*) ([^ ]*)= (\S*)/g;  // defines LHS OP= RHS tag
		
		cb( this.replace(pattern, (str,lhs,op,rhs) => {
			//Log([lhs,rhs,op]);
			if ( op )
				if ( blogOp = ctx[op] ) 
					if ( isFunction(blogOp ) )
						return blogOp(lhs,rhs,ctx);
					else
						return `invalid lhs ${op}= rhs markdown`;
				else
					return `invalid lhs ${op}= rhs markdown`;
			else
				return `${lhs} = ${rhs}`;
		}) );
	},
	
	function Xtex( cb ) {  // expands X$$ MATH $$ tags then callbacks cb( final html )
		var 
			key = "@tex",
			html = this,
			fetcher = JAX.typeset,
			fetchInTeX = function ( rec, cb ) {  // callsback cb with expanded inline TeX tag
				//Log("math",rec);
				fetcher({
					math: rec.arg1,
					format: "inline-TeX",  
					//html: true,
					mml: true
				}, d => cb( d.mml || "" ) );
			},
			fetchTeX = function ( rec, cb ) {	// callsback cb with expanded TeX tag
				//Log("math",rec);
				fetcher({
					math: rec.arg1,
					format: "TeX",  
					//html: true,
					mml: true
				}, d => cb( d.mml || "" ) );
			},
			fetchAscii = function ( rec, cb ) { // callsback cb with expanded AsciiMath tag
				//Log("math",rec);
				fetcher({
					math: rec.arg1,
					format: "AsciiMath",  // TeX, inline-TeX, AsciiMath, MathML
					//html: true,
					mml: true
				}, d => cb( d.mml || "" ) );
			},
			pattern = {  // define tag patterns
				ascii: /a\$\$([\$!]*)\$\$/g,	// a$$ ascii math $$
				tex: /n\$\$([^\$]*?)\$\$/g,		// n$$ new line TeX $$
				intex: /\$\$([^\$]*?)\$\$/g		// $$ inline Tex $$
			};
			
		html.serialize( fetchAscii, pattern.ascii, key, (html,fails) => { 
		html.serialize( fetchTeX, pattern.tex, key,  (html,fails) => { 
		html.serialize( fetchInTeX, pattern.intex, key, (html,fails) => {  
			cb(html);
		});
		});
		}); 
	},
	
	function Xparms(goto, cb) {		// expands <!---parms KEY=VAL&...---> tags then callbacks cb( final input-scripted html )
		var
			pattern = /<!---parms ([^>]*)?--->/g;
		
		cb( this.replace(pattern, (str, parms) => {
					
			//Log(">>>Xparms", parms);
			
			var 
				inputs = [],
				keys = [];

			parms.split("&").forEach( (parm) => {  // each collect parm (key=value) needs an input
				parm.replace(/([^=]*)?=(.*)?/, (str, key, val) => {		// key=value
					inputs.push( `${key}: <input id="parms.${key}" type="text" value="${val}" autofocus >` );
					keys.push( '"' + key + '"' );
					return "";
				});
				return "";
			});

			// this litle marvel submits all inputs to the goto service
			return `
<script>
	String.prototype.tag = ${"".tag}
	function submitForm() {
		var parms = {};
		[${keys}].forEach( (key) => parms[key] = document.getElementById("parms."+key).value );

		window.open( "/${goto}".tag("?", parms) );
	}
</script>
<form onsubmit="submitForm()">
	${inputs.join("")}
	<button id="parms.submit" type="submit" value="submit">submit</button>
</form>` ;

		}) );
	},
	
	function Xfetch( cb ) {  // expands <!---fetch URL---> tags then callsback cb( final url-fetched html )
		var 
			key = "@fetch",
			fetcher = DEBE.fetcher,
			fetchSite = function ( rec, cb ) {  // callsback cb with expanded fetch-tag 
				//Log(">>>>Xfetch", rec.arg1);
				fetcher( rec.arg1, null, cb );
			},
			pattern = /<!---fetch ([^>]*)?--->/g;
			
		this.serialize( fetchSite, pattern, key, (html,fails) => cb(html) );
	},

	function Xsection( cb ) { // expand "##.... header" 
		var
			key = "@sec",
			fetchSection = function (rec, cb) {
				//Log(">>>header", rec.ID, rec.arg1, rec.arg0.length-rec.arg1.length-2 );
				cb( rec.arg1.tag( "h"+(rec.arg0.length-rec.arg1.length-2), {} ) );
			},
			pattern = /^\#* (.*)\n/gm;
		
		this.serialize( fetchSection, pattern, key, (html,fails) => cb(html) );
	},
	
	function Xskin( ctx, proxy, cb ) { // return a skin via a proxy site

		var 
			url = URL.parse(proxy || ""),
			host = proxy ? url.host.split(".")[0] : null,
			md = this, //proxy ? this : this.replace(/\*\*Owner\*\*/g,`**Owner** (${req.client})`),
			header = proxy 
				? `img(src="/shares/images/${host}.jpg", width="100%", height="15%")`
				: "p",
			jade = ":markdown\n\t" + md.replace(/^\n*/,"").replace(/\n/g,"\n\t");

		ctx.filename = DEBE.paths.jadePath;
		
		try {
			cb( JADE.compile(jade, ctx) (ctx) );
		}
		catch (err) {
			// Log(err);
			cb( err+"" );
		}
	}
	
].Extend(String);

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

	function blogify( req, key, ds, cb ) {
	/*
	@member Array
	@method blogify
	@param [List] keys list of keys to blogify
	@param [String] ds Name of dataset being blogged
	@param [Function] cb callback(recs) blogified version of records
	*/
		var 
			sql = req.sql,
			flags = req.flags,
			site = DEBE.site,
			url = site.urls.master,
			recs = this;

		var
			fetchBlog = function( rec, cb ) {
				if ( md = rec[key] + "" ) 
					md.Xblog(req, ds.tag("?", { 	// tag ds with source record selector
						name: ( (rec.Pipe||"").charAt(0) == "{" ) 
							? rec.Name + "-%"	// pipe defines a monte-carlo cross product so get them all
							: rec.Name	// pipe defines a simple path
					}), {}, {}, rec, true, html => cb( 
						flags.kiss		
							? html 	// keep if simple
							: html + [	// add by-line
								"<br>",
								site.title.tag( `${url}/treefan.view?src=info&w=4000&h=600` ),
								"schema".tag( `${url}/treefan.view?src=${ds}&name=${rec.Name}&w=4000&h=600` ),
								"run".tag( `${url}/${ds}.exe?Name=${rec.Name}` ),
								"edit".tag( `${url}/${ds}.view` ),
								"publish".tag( `${url}/${ds}.pub` ),
								"tou".tag( `${url}/${ds}.tou` )
							].join(" ")
					 ) );
				
				else
					cb(md);
			};

		recs.serialize( fetchBlog, function (rec, blog)  {
			if (rec) 
				rec[key] = blog;

			else 
				cb( recs );
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
		recs.forEach( (rec,n) => {
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

	function schemafy(src) {
		function nodeify(store, path, cb) {

			//Log("isobj", isObject(store), store.constructor.name );
			
			if ( isObject(store) ) // at an object node
				if ( path ) {
					var 
						nodes = [];
					
					Each(store, (key,val) => { // make nodes
						var 
							inGroup = path.substr(-1) == "_",
							nodeName = inGroup ? key : "."+key,
							nodePath = path + nodeName,
							node = {
								name: nodeName,
								doc: nodePath.tag( cb(nodePath) ),
								size: 20,
								children: nodeify( val || 0,  nodePath, cb )
							};
						
						nodes.push(node);
					});

					return nodes;
				}

				else {
					var subs = {}, root = "root";
					Each( store, (key,val) => {
						var 
							ref = subs, 
							groups = key.split("_"), 
							depth = groups.length-1;

						try {  // convert json stores
							val = JSON.parse(val);
						}
						catch (err) {
						}

						groups.forEach( (group,idx) => {  // build subs hash
							var 
								isLast = idx == depth,
								key = isLast ? group : group+"_";

							if ( !ref[key] ) ref[key] = isLast ? val : {};

							ref = ref[key];
						});
					});
					
					return [{
						name: root,
						size: 10,
						children : nodeify( subs, root, cb )
					}];
				}

			else	// at an array node
			if ( isArray(store) && isObject( store0 = store[0] || 0 ) ) {
				var 
					N = store.length,
					nodeName = "[" + N + "]",
					nodePath = (path || "") + nodeName,
					node = { 
						name: nodeName,
						size: 10,
						doc: nodePath.tag( cb(nodePath) ),
						children: nodeify( store0, nodePath, cb )
					};
				
				return [node];
			}

			else	// at a leaf node
			if (expandLeaf)
				return [{
					name: (store.length || 0) + " elements",
					size: 10,
					doc: "",
					children: []
				}];
			
			else
				return [];
		}	
		
		var expandLeaf = true;
		
		return nodeify( Copy(this[0] || {}, {} ), null, path => {
			return src+"&get:=" + path;
		});
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
						size: wt ? parseInt(rec[wt] || "0") : len,
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
					size: 10, 
					doc: rec
				});
			}

		return tar;
	},

	/*
	function sample( cb ) {
	/ *
	@member sample
	@method Array
	@param {Function} cb callback(rec) returns record results to append
	Samples a record list:
		[ {x:"a"}, {x:"b"} ].sample( (rec) => rec.x=="a" )
	
	returning a record list:	
		[ {x:"a"} ]
		
	using the callback cb(rec) which returns true/false to retain/drop an item.
	* /
		var rtns = [];
		this.forEach( function (rec) {
			rtns.push( cb(rec) );
		});
		return rtns;
	},  */

	function joinify(cb) {
	/*
	@member Array
	@method joinify
	@param {Function} cb
	Joins a list 
		[	a: null,
			g1: [ b: null, c: null, g2: [ x: null ] ],
			g3: [ y: null ] ].joinify()
	
	returning a string
		"a,g1(b,c,g2(x)),g3(y)"
			
	where an optional callback cb(head,list) joins the current list with the current head.
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
	@member Array
	@method splitify
	@param {String} dot
	Splits a list 
		["a", "g1.b", "g1.c", "g1.g2.x", "g3.y"].splitify( "." )
		
	returning a list
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
	},
	
	function gridify(noheader) {	//< dump dataset as html table
	/**
	@member Array
	@method gridify
	@param {Boolean} noheader switch to enable header processing
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
								row += key.tag("th", {});
							});
							rtn += row.tag("tr", {});
							head = false;
						}

						var row = "", intro = "";
						Each(heads, function (key,val) {
							if (val = rec[key])
								row += isArray(val)
									? table(val)
									: (val+"").tag("td", intro ? {class:"intro"} : {});
							else
								row += (val+"").tag("td", {});

							intro = false;
						});
						rtn += row.tag("tr", {});
					});

					return rtn.tag("table",{border:1}); //.tag("div",{style:"overflow-x:auto"});

				case Object: // { key:val, ... } create table dump of object hash

					var rtn = "";
					Each(recs, function (key,val) {
						if (val)
							rtn += isArray(val)
								? table(val)
								: (key.tag("td", {}) + JSON.stringify(val).tag("td", {})).tag("tr", {});
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

		return  table( this );
	}
	
].Extend(Array);
	
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
].Extend(Date);

function docify( obj , idx ) {
	var doc = {};

	if ( keys = idx ? idx.split(",") : null ) 
		keys.forEach( key => { 
			if ( key in obj ) doc[key] = obj[key];
		});

	else
		doc = obj;

	return (JSON.stringify(doc) || "").replace(/ /g,"").replace(/_/g,"").replace(/^/g,"");
}
		
function sharePlugin(req,res) {  //< share plugin attribute / license plugin code
	
	var 
		errors = DEBE.errors,
		sql = req.sql,
		query = req.query,
		attr = req.type,
		partner = req.client,
		endService = query.endservice+"",
		proxy = query.proxy,		
		types = {
			pub: "txt",
			users: "json",
			md: "txt",
			toumd: "txt",
			status: "html",
			suitors: "txt",
			publist: "txt",
			tou: "html",
			js: "txt",
			py: "txt",
			me: "txt",
			m: "txt",
			jade: "txt"
		};

	sql.query( "SELECT * FROM ??.engines WHERE least(?,1) LIMIT 1", [ req.group, { Name: req.table } ], (err, engs) => {
		if ( eng = engs[0] ) 
			FLEX.pluginAttribute( sql, attr, partner, endService, proxy, eng, (attrib) => {
				req.type = types[req.type] || "txt";
				
				if (attrib) 
					res(attrib);

				else
					switch (attr) {
						case "js":
						case "py":
						case "me":
						case "m":
							res( errors.noPartner );
							break;
							
						case "pub":
							sql.query( 
								"SELECT * FROM app.releases WHERE ? ORDER BY _Published DESC LIMIT 1", 
								{_Product: eng.Name+"."+eng.Type}, (err,pubs) => {

								if ( pub = pubs[0] ) {
									res( `Publishing ${eng.Name}` );

									/*
									var 
										parts = pub.Ver.split("."),
										ver = pub.Ver = parts.concat(parseInt(parts.pop()) + 1).join(".");
									*/

									FLEX.publishPlugin( req, eng.Name, eng.Type, true );
								}

								else
									res( new Error(`no ${eng.Name} product`) );
							});
							break;
							
						default:
							res( eng[req.type] || errors.noAttribute );
					}
			});
				
		else
			res( errors.noEngine );
	});

}

function exeAutorun(sql,name,path) {

	Log("autorun", path);
	sql.query( "SELECT * FROM app.files WHERE Name=?", path.substr(1) )
	.on("result", (file) => {

		var 
			fetcher = DEBE.fetcher,
			now = new Date(),
			startOk = now >= file.PoP_Start || !file.PoP_Start,
			endOk = now <= file.PoP_End || !file.PoP_End,
			fileOk = startOk && endOk;

		Log("autorun", startOk, endOk);

		if ( fileOk )
			sql.query( "SELECT Run FROM openv.watches WHERE File=?", path.substr(1) )
			.on("result", (link) => {
				var 
					parts = link.Run.split("."),
					pluginName = parts[0],
					caseName = parts[1],
					exePath = `/${pluginName}.exe?Name=${caseName}`;

				Log("autorun", link,exePath);
				fetcher( exePath, null, rtn => Log("autorun", rtn) );
			});
	});

}

function dogAutoruns(path) {
	DEBE.watchFile( "."+path, exeAutorun );
}

function Trace(msg,sql) {	// execution tracing
	TRACE.trace(msg,sql);
}

/**
@class DEBE.Unit_tests
*/

switch ( process.argv[2] ) { // unit tests
	case "?":
		Log("unit test with 'node debe [D1 || D2 || ...]'");
		break;
			
	case "D1": 
		/**
		@method D1
		*/
		var DEBE = require("../debe").config({
			onFile: {
				"./uploads/": function (sql, name, path) {  // watch changes to a file				

					sql.forFirst(  // get client for registered file
						"UPLOAD",
						"SELECT ID,Client,Added FROM app.files WHERE least(?) LIMIT 1", 
						{Name: name}, function (file) {

						if (file) {  // ingest only registered file
							var 
								now = new Date(),
								exit = new Date(),
								client = file.Client,
								added = file.Added,
								site = DEBE.site,
								port = name.tag( "/files.view" ),
								url = site.urls.worker,
								metrics = "metrics".tag( url+"/airspace.view" ),
								poc = site.distro.d;

							sql.forFirst(  // credit client for upload
								"UPLOAD",
								"SELECT `Group` FROM openv.profiles WHERE ? LIMIT 1", 
								{Client:client}, 
								function (prof) {

								exit.offsetDays( 30 );

								if ( prof ) {
									var 					
										group = prof.Group,
										revised = "revised".tag( `/files.view?ID=${file.ID}` ),
										notes = `
Thank you ${client} for your sample deposited to ${port} on ${now}.  If your 
sample passes initial quality assessments, additional ${metrics} will become available.  Unless
${revised}, these samples will expire on ${exit}.  Should you wish to remove these quality 
assessments from our worldwide reporting system, please contact ${poc}.
`;
									sql.query("UPDATE app.files SET ? WHERE ?", [{
											_State_Notes: notes,
											Added: now,
											PoP_Expires: exit
										}, {ID: file.ID}
									], err => {
										DEBE.ingestFile(sql, path, name, file.ID, function (aoi) {
											//Trace( `CREDIT ${client}` );

											sql.query("UPDATE app.profiles SET Credit=Credit+? WHERE Client=?", [aoi.snr, client]);

											if (false)  // put upload into LTS - move this to file watchDog
												CP.exec(`zip ${path}.zip ${path}; rm ${path}; touch ${path}`, err => {
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
		}, err => {
		Trace( err || 
`Yowzers - this does everything but eat!  An encrypted service, a database, a jade UI for clients,
usecase-engine plugins, file-upload watchers, and watch dogs that monitor system resources (jobs, files, 
clients, users, system health, etc).` 
		);
	});
		break;
		
	case "D2":
		/**
		@method D1
		*/
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
		}, err => {
			Trace( "This bad boy in an encrypted service with a database and has an /wfs endpoint" );
		});
		break;
		
	case "D3":
		/**
		@method D3
		*/
		
		var DEBE = require("../debe").config({
		}, err => {
			Trace( err || "Stateful network flow manger started" );
		});
		break;
		
	case "?":
		Trace("unit test D1-D3 available");
}

// UNCLASSIFIED
