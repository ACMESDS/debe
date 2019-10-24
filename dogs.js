/**
@class DEBE.WatchDogs
*/

var		// NodeJS modules
	OS = require("os"), 		//< system utilizations for watch dogs
	CP = require("child_process"), 		//< Child process threads
	FS = require("fs");				//< filesystem and uploads

var		// totem
	FLEX = require("flex"),	
	TOTEM = require("totem"),
	ENUM = require("enum");

function Trace(msg,req,fwd) {	// execution tracing
	"dog>".trace(msg,req,fwd);
}

const { Log, Copy } = ENUM;
const { probeSite } = TOTEM;

module.exports = {  //< watch dogs cycle time in secs (zero to disable)
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
			sqlutil: "show session status like 'Thread%'",
			diskutil: "SELECT table_schema AS DB, "
				 + "SUM(data_length + index_length) / 1024 / 1024 / 1024 AS GB FROM information_schema.TABLES "
				 + "GROUP BY table_schema",

			jobs: "SELECT count(ID) AS Total FROM app.queues "
		}
	}, function dogSystem(dog) {

		var 
			pocs = TOTEM.site.pocs || {},
			get = dog.get;

		dog.thread( sql => {

			function sqldb(cb) {
				sql.query(get.sqlutil, {}, (err, stats) => {
					cb({
						running: stats[2].Value,
						connected: stats[1].Value
					});
				});
			}

			function cpu(cb) {				// compute average cpu utilization
				var avgUtil = 0;
				var cpus = OS.cpus();

				cpus.forEach( (cpu) => {
					idle = cpu.times.idle;
					busy = cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.user;
					avgUtil += busy / (busy + idle);
				});
				cb(avgUtil / cpus.length);
			}

			function disk(cb) {
				sql.query(get.diskutil, {}, (err, stats) => {						
					var totGB = 0;
					stats.forEach( (stat) => {
						totGB += stat.GB;
					});
					cb( totGB );
				});
			}

			function jobs(cb) {
				sql.query(get.jobs, (err, jobs) => {
					cb({
						total: jobs.length
					});
				});
			}

			sqldb( threads => {
			cpu( cpu => {
			disk( disk => {
			jobs( jobs => {

				sql.query("INSERT INTO openv.syslogs SET ?", {
					t: new Date(),		 					// start time
					Action: "watch", 				// db action
					runningThreads: threads.running,
					connectedThreads: threads.connected,
					cpuUtil: cpu,
					diskUtil: disk,
					Module: "D>",
					totalJobs: jobs.total
				});

				if ( cpu > dog.max.cpu )
					FLEX.sendMail({
						subject: `${dog.site.nick} resource warning`,
						to: pocs.admin,
						body: `Please add more VMs to ${dog.site.nick} or ` + "shed load".tag(dog.site.urls.worker+"/queues.view")
					}, sql );

				if ( disk > dog.max.disk ) 
					FLEX.sendMail({
						subject: `${dog.site.nick} resource warning`,
						to: pocs.admin,
						body: `Please add more disk space to ${dog.site.nick} or ` + "shed load".tag(dog.site.urls.worker+"/queues.view")
					}, sql );
			});
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
			toingest: "SELECT ID,Ring, st_centroid(ring) as Anchor, _Ingest_Time,PoP_advanceDays,PoP_durationDays,_Ingest_sampleTime,Name FROM app.files WHERE _Ingest_Time>=PoP_Start AND _Ingest_Time<=PoP_End AND Enabled AND position('.ingest' IN Name)",
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
			urls = TOTEM.site.urls,
			get = dog.get;

		/*
		dog.forEach(dog.trace, get.ungraded, [], function (file, sql) {
			Trace("GRADE "+file.Name);

			TOTEM.gradeIngest( sql, file, function (stats) {

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

		if (get.expired)
			dog.forEach(dog.trace, get.expired, [], (file, sql) => { 
				Trace("EXPIRE "+file.Name);
				sql.query("DELETE FROM app.events WHERE ?", {fileID: file.ID});
			});

		if (get.retired)
			dog.forEach(dog.trace, get.retired, dog.maxage, (file, sql) => {
				Trace("RETIRE "+file.Name);

				var 
					site = TOTEM.site,
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
				}, sql );
			});

		if (get.finished)
			dog.forEach(dog.trace, get.finished, [], (file, sql) => {
				Trace("FINISHED "+file.Name);
				//sql.query("UPDATE app.files SET _State_ingested=1 WHERE ?",{ID:file.ID});
			});

		if (get.toingest)
			dog.forEach(dog.trace, get.toingest, [], (file, sql) => {
				var
					zero = {x:0, y:0},
					ring = file.Ring || [[ zero, zero, zero, zero, zero]],
					anchor = file.Anchor || zero,
					from = new Date(file._Ingest_Time),
					to = from.addDays(file.PoP_durationDays),
					ingester = "/ingest";

				probeSite( ingester.tag("?", {	// fetch all events ingested by this /plugin.usecase or 
					fileID: file.ID,
					from: from.toLocaleDateString("en-US"),
					to: to.toLocaleDateString("en-US"),
					lat: anchor.x,
					lon: anchor.y,
					radius: GEO.ringRadius(ring),
					ring: ring,
					durationDays: file.PoP_durationDays
				}), msg => {
					Log("INGEST", msg);
				});

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
			get = dog.get,
			queues = TOTEM.queues;

		if ( pigs = get.pigs )
			dog.forEach(dog.trace, pigs, [], function (pigs) {
			});

		if ( unmailed = get.unmailed ) 
			dog.forEach(dog.trace, unmailed, [], function (job, sql) {
				sql.query("UPDATE app.queues SET Finished=1 WHERE ?", {ID: job.ID});
				sendMail({
					to: job.Client,
					subject: "Totem update",
					body: job.Notes
				}, sql );
			});

		if ( unbilled = get.unbilled )
			dog.forEach(dog.trace, unbilled, [], function (job, sql) {
				//Trace(`BILLING ${job} FOR ${job.Client}`, sql);
				sql.query( "UPDATE openv.profiles SET Charge=Charge+? WHERE ?", [ 
					job.Done, {Client: job.Client} 
				]);

				sql.query( "UPDATE app.queues SET Billed=1 WHERE ?", {ID: job.ID})
			});

		if ( unfunded = get.unfunded )
			dog.forEach(dog.trace, unfunded, [dog.max.age], function (job, sql) {
				//Trace("KILLING ",job);
				sql.query(
					//"DELETE FROM app.queues WHERE ?", {ID:job.ID}
				);
			});

		if ( stuck = get.stuck )
			dog.thread( sql => {
				sql.query(stuck, [], (err, info) => {

					Each(queues, (rate, queue) => {  // save collected queuing charges to profiles
						Each(queue.client, function (client, charge) {

							if ( charge.bill ) {
								//if ( trace ) Trace(`${trace} ${client} ${charge.bill} CREDITS`, sql);

								sql.query(
									"UPDATE openv.profiles SET Charge=Charge+?,Credit=greatest(0,Credit-?) WHERE ?" , 
									 [ charge.bill, charge.bill, {Client:client} ], 
									err => {
										if (err)
											Trace("Job charge failed "+err);
								});

								charge.bill = 0;
							}

						});
					});
				});	
			});

		if ( outsourced = get.outsourced )
			dog.forEach( dog.trace, outsourced, [], function (job, sql) {
				sql.query(
					"UPDATE app.queues SET ?,Age=Age+Work,Departed=Date_Add(Departed,interval Work day) WHERE ?", [
					{ID:job.ID}
				] );

				probeSite( job.Notes, msg => Trace("RUN "+msg) );
			});
	}),

	dogEmail: Copy({
		get: {
			toRemove: "DELETE FROM app.email WHERE Remove",
			toSend: "SELECT `to`,subject,body FROM app.email WHERE Send AND !Sent"
		},
		cycle: 300
	}, function dogEmail(dog) {

		function send(opts) {
			if ( email = FLEX.mailer.TX.TRAN ) {
				opts.from = "totem@noreply.gov";
				opts.alternatives = [{
					contentType: 'text/html; charset="ISO-59-1"',
					contents: ""
				}];

				email.sendMail(opts, err => Trace(`MAIL ${opts.to} re:${opts.subject} ` + (err||"ok") ) );
			}
		}

		dog.thread( sql => {
			var get = dog.get;
			sql.query( get.toRemove );
			sql.query( get.toSend )
			.on( "result", rec => {
				send(rec);
				//sql.query("DELETE FROM app.email WHERE ?", {ID:rec.ID});
				sql.query("UPDATE app.email SET Send=0,Sent=1 WHERE ?", {ID:rec.ID});
			});
		});
	}),

	_dogSystem: Copy({  // legacy
		//cycle: 100,
		get: {
			engs: "SELECT count(ID) AS Count FROM app.engines WHERE Enabled",
			jobs: "SELECT count(ID) AS Count FROM app.queues WHERE Departed IS NULL",
			logs: "SELECT sum(Delay>20)+sum(Fault != '') AS Count FROM app.dblogs"
		},
		jobs : 5
	}, function dogSystem(dog) {  // system diag watch dog
		var 
			diag = TOTEM.diag;

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
				});
				});
				});
			});
	}),

	/*
	dogGraph: Copy({
		cycle: 0
	}, function (dog) {
			var actors = 0, nodes = 0;
			Log("neo update"); return;
		
			if ( neodb = TOTEM.neodb ) 						
				dog.thread( sql => {
					sql.query( "SELECT * FROM app.nlpactors" )
					.on("result", actor => {
						actors++;
						var q = `CREATE (n:${actor.Type} $props) RETURN n`;
						Log("dog add", q);
						neodb.cypher({
							query: q,
							params: {
								props: {
									name: actor.Name,
									email: "tbd",
									tele: "tbd"
								} 
								//type: actor.Type
							}
						}, (err,recs) => {	
							Log("neo actor", err, JSON.stringify(recs) );
							
							if (++nodes >= actors) // all actors have been created so connect them
								sql.query( "SELECT * FROM app.nlpedges" )
								.on("result", edge => {
									//Log("dog edge",edge);
									var q =	`MATCH (a:${edge.sourceType}),(b:${edge.targetType}) WHERE a.name = '${edge.Source}' AND b.name = '${edge.Target}' CREATE (a)-[r:DRUGS]->(b) RETURN a,b,r`;
									Log(q);
									neodb.cypher({
										query: q
									}, (err,recs) => Log("neo edge", err, JSON.stringify(recs) ) );
								})
								.on("end", () => {
									sql.query( "DELETE FROM app.nlpedges" );
								});								
						});
					})
					.on("end", () => {
						sql.query( "DELETE FROM app.nlpactors" );
					});
				});
	}),  */

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

			TOTEM.getIndex( dog.newsPath, files => {
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
										TOTEM.getIndex( `${dog.newsPath}/${name}`, files => {
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
		});
	}),

	dogNotebooks: Copy({
		cycle: 600,
		get: {
			hogs: "DELETE FROM openv.syslogs WHERE datediff(now(), At) >= ?",
			buggy: ""
		},
		olds: 1,	// days old
		bugs: 10
	}, function dogNotebooks(sql, dog) {

		if (dog.get.hogs)
			dog.forEach(dog.trace, dog.get.hogs, [dog.old], () => Trace("Squeezed Notebook logs") );
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
};	
