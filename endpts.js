/**
@class DEBE.EndPoints
service maintenance endpoints
*/
var		// nodejs
	STREAM = require("stream"), 		//< pipe streaming
	CP = require("child_process"), 		//< Child process threads
	CRYPTO = require("crypto"), 	//< to hash names
	FS = require("fs"); 				//< filesystem and uploads

var		// totem
	TOTEM = require("totem"),
	ENUM = require("enum"),
	FLEX = require("flex"),
	GEO = require("geohack"),
	ATOM = require("atomic");

function Trace(msg,sql) {	// execution tracing
	"S>".trace(msg,sql);
}

const { Copy,Each,Log,isObject,isString,isFunction,isError,isArray } = ENUM;
const { sqlThread, uploadFile, getSite } = TOTEM;
const { ingestList } = GEO;

module.exports = {
	icoFavicon: function (req,res) {   // extjs trap
		res("No icons here"); 
	},

	sendCert: function (req,res) { // create/return public-private certs
	/**
	@method sendCert
	Totem (req,res)-endpoint to create/return public-private certs
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/

		var 
			owner = req.table,
			pass = req.type;

		TOTEM.prime(owner, pass, {}, function () {

			CP.exec(
				`puttygen ${owner}.key -N ${pass} -o ${owner}.ppk`, 

				err => {

				if (err) 
					res( TOTEM.errors.certFailed );

				else {	
					var 
						paths = TOTEM.paths,
						site = TOTEM.site,
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
						from:  TOTEM.site.ASP,
						to:  TOTEM.site.ISP,
						cc: name,
						subject: `${TOTEM.site.Nick} account request`,
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

	},

	extendPlugin: function (req,res) {
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

			sql.query("ALTER TABLE app.?? ADD ?? "+type, [ds,key]);

		});
	},

	retractPlugin: function (req,res) {
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

			sql.query("ALTER TABLE app.?? DROP ?? ", [ds,key]);

		});
	},

	exePlugin: function (req,res) {
	/**
	@private
	@method exePlugin
	Totem (req,res)-endpoint to execute plugin req.table using usecase req.query.ID || req.query.Name.
	@param {Object} req http request
	@param {Function} res Totem response callback
	*/	
		function pipePlugin( get, sql, job, cb ) { // prime plugin with query and run in context ctx

			function pipe(get, sql, job, cb) {
				var 
					ctx = job.ctx,
					query = job.query;

				Log(">pipe opened", job.path);
				if ( get )
					get(sql, job, data => {
						if (data) {
							Copy(data,ctx);
							Each(query, (key,exp) => {
								//Log(">pipe",key,exp);
								data[key] = ctx[key] = isString(exp)
									? exp.parseJS( ctx, err => Log(`>pipe skip ${key}=${exp}`) )
									: exp;
							});

							cb( ctx, () => {
								Log(">pipe closed");
								for (key in data) delete ctx[key];
							});
						}

						else
							cb(null);
					});

				else
					cb( ctx, () => {
						Log(">pipe closed");
					});
			}

			sql.insertJob( job, job => { 
				pipe(get, sql, job, (ctx,close) => {
					if (ctx) {
						req.query = ctx;   // let plugin mixin its own keys		
						ATOM.select(req, ctx => {  // run plugin
							//Log(">>atom", ctx);
							if ( ctx )
								if ( isError(ctx)  )
									Log(`>pipe ${ctx.Host} ` + ctx);

								else 
									cb( ctx, sql );

							if (close) close();
						});
					}

					else
						Log(">pipe halted");
				});
			});
		}

		function crossParms( depth, keys, forCtx, setCtx, cb ){	// cross forCtx keys with callback cb(setCtx)
			if ( depth == keys.length ) 
				cb( setCtx );

			else {
				var 
					key = keys[depth],
					values = forCtx[ key ];

				if (values) 
					if ( values.forEach )
						values.forEach( value => {
							setCtx[ key ] = value;
							crossParms( depth+1, keys, forCtx, setCtx, cb );
						});

					else {
						setCtx[ key ] = values;
						crossParms( depth+1, keys, forCtx, setCtx, cb );
					}
			}
		}

		var
			ok = "ok",
			now = new Date(),
			sql = req.sql,
			client = req.client,
			profile = req.profile,
			table = req.table,
			profile = req.profile,
			query = req.query,
			host = table;

		if ( query.Name ) delete query.ID;

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
					res( TOTEM.errors.noContext );

				else
				if ( isError(ctx) )
					res( ctx );

				else
				if ( Pipe = ctx.Pipe )  { // intercept workflow pipe
					ctx.Host = host;
					var err = null;

					switch ( Pipe.constructor ) {
						case String: // query contains a source path

							var
								pipeQuery = {},
								pipePath = Pipe.parseURL(pipeQuery,{},{},{}),
								job = { // job descriptor for regulator
									qos: 1, //profile.QoS, 
									priority: 0,
									client: req.client,
									class: pipeName,
									credit: 100, // profile.Credit,
									name: req.table,
									task: pipeQuery.Name,
									notes: [
											req.table.tag("?",{ID:pipeQuery.ID}).tag( "/" + req.table + ".run" ), 
											((profile.Credit>0) ? "funded" : "unfunded").tag( req.url ),
											"RTP".tag( `/rtpsqd.view?task=${pipeQuery.Name}` ),
											"PMR brief".tag( `/briefs.view?options=${pipeQuery.Name}`)
									].join(" || "),
									query: pipeQuery,
									//url: Pipe,
									path: pipePath,
									ctx: ctx
								};

							if ( pipePath.startsWith("/") ) {	// pipe file
								var
									pipeRun = `${ctx.Host}.${ctx.Name}`,

									[x,pipeName,pipeType] = pipePath.substr(1).match(/(.*)\.(.*)/) || ["", pipePath, "json"],
									pipeJob = TOTEM.pipeJob[pipeType];

								if ( !pipeJob ) {
									pipePath = job.path = `/stores/${pipeType}.${pipeName}.stream`;
									[x,pipeName,pipeType] = pipePath.substr(1).match(/(.*)\.(.*)/) || ["", pipePath, "json"],
									pipeJob = TOTEM.pipeJob[pipeType];
								}

								//Log(">pipe", pipePath, pipeName, pipeType);

								var
									isFlexed = FLEX.select[pipeName] ? true : false,
									isDB = pipeType == "db";

								if ( !isFlexed && !isDB ) {  // setup plugin autorun only when pipe references a file
									sql.query( "DELETE FROM openv.watches WHERE File != ? AND Run = ?", [pipePath, pipeRun] );

									sql.query( "INSERT INTO openv.watches SET ?", {  // associate file with plugin
										File: pipePath,
										Run: pipeRun
									}, (err,info) => {
										if ( !err )
											setAutorun( pipePath );
									});
								}

								if ( pipeJob = TOTEM.pipeJob[pipeType] )	// derive workflow from pipe type
									pipePlugin( pipeJob, sql, job, (ctx,sql) => {
										if (ctx)
											saveContext(sql, ctx);

										else
											Trace( new Error("pipe lost context") );
									});

								else 
									err = new Error("pipe bad type");
							}

							else
								pipePlugin(pipeDoc, sql, job, (ctx,sql) => {   // place job in doc workflow
									if (ctx)
										saveContext(sql, ctx);

									else
										Trace( new Error("pipe lost context") );
								});

							break;

						case Array:  // query contains event list
							ctx.Events = Pipe;
							pipePlugin( null, sql, job, (ctx,sql) => {
								saveContext(sql, ctx);
							});
							break;

						case Object:  
							if (Pipe.$) { // $-scripting pipe
								err = new Error("scripting pipe tbd");
							}

							else { // usecase enumeration pipe
								var 
									runCtx = Copy(ctx, {}), 
									jobs = [], inserts = 0,
									getSite = TOTEM.getSite;

								// purge DNC keys from the run context 
								delete runCtx.ID;
								delete runCtx.Host;
								delete runCtx.Name;
								delete runCtx.Pipe;
								for (var key in runCtx) if ( key.startsWith("Save_") ) delete runCtx[key];

								sql.getFields( `app.${host}`, {Type:"json"}, {}, jsons => {
									sql.query( `DELETE FROM app.${host} WHERE Name LIKE '${ctx.Name}-%' ` );

									crossParms( 0 , Object.keys(Pipe), Pipe, {}, setCtx => {	// enumerate keys to provide a setCtx key-context for each enumeration
										//Log("set", setCtx);
										var job = Copy(setCtx, Copy(runCtx, new Object({ Name: `${ctx.Name}-${jobs.length}` })), "." );	// define the job context
										Each( job, (key,val) => {	// stringify json keys and drop those not in the plugin context
											if ( !(key in ctx) ) delete job[key];		
											else
											if ( key in jsons ) job[key] = val ? JSON.stringify(val ) : val;	
										});

										jobs.push( job );
										//Log("set", setCtx, job );
									});

									jobs.forEach( job => {
										sql.query( `INSERT INTO app.${host} SET ?`, job, err => {
											if ( ++inserts == jobs.length )  // run usecases after they are all created
												jobs.forEach( job => {
													if (job.Pipe)
														getSite( `/${host}.exe?Name=${job.Name}`, null, info => {} );
												});
										});
									});
								});
							}

							break;
					}

					res( err || ok );
				}

				else	// unpiped (e.g. event generation) engines never participate in a supervised workflow
					res( saveContext( sql, ctx ) ||  ok );

			});

		else  
		if ( engine = FLEX.execute[table] )	// execute flex engine
			engine(req,res);

		else
		if (TOTEM.probono)  // execute unregulated engine using query as usecase
			ATOM.select(req, res);

		else
			res(TOTEM.errors.noUsecase);

	},

	probePlugin: function(req,res) {  //< share plugin attribute / license plugin code

		var 
			errors = TOTEM.errors,
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

		sql.query( "SELECT * FROM app.engines WHERE least(?,1) LIMIT 1", { Name: req.table }, (err, engs) => {
			if ( eng = engs[0] ) 
				FLEX.pluginAttribute( sql, attr, partner, endService, proxy, eng, attrib => {
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

	},
	
	sendDoc: function (req, res) {
		var
			site = TOTEM.site,
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
	},

	sysRestart: function(req,res) {
		var
			query = req.query,
			delay = 10,
			pocs = TOTEM.site.pocs || {},
			msg = query.msg = `System updating in ${delay} seconds`;

		if ( req.client == pocs.admin ) {
			Log(req.client, TOTEM.site.pocs);

			sysAlert(req,res);

			setTimeout( function () {
				Trace("RESTART ON " + now());
				process.exit();
			}, delay*1e3);
		}

		else
			res("This endpoint reserved for " + "system admin".tag( "mailto:" + pocs.admin ) );
	},

	sysIngest: function(req,res) {
	/**
	@method sysIngest
	Totem (req,res)-endpoint to ingest a source into the sql database
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/

		function ingester( opts, query, cb ) {
			try {
				if (url = opts.url)
					switch (url.constructor.name) {
						case "String":
							getSite( url.tag("?", query), opts.put, data => {
								if ( evs = data.parseJSON( [ ] ) ) 
									cb( opts.get ? evs.get(opts.get) : evs );
							});
							break;

						case "Function":
							url( evs => cb( opts.get ? evs.get(opts.get) : evs ) );
							break;

						case "Array":
							cb( opts.get ? url.get(opts.get) : url );
							break;
					}
			}

			catch(err) {
				Log("INGEST FAILED",err);
			}
		}		

		var 
			sql = req.sql,
			query = req.query,
			body = req.body,
			src = query.src,
			ingester = TOTEM.ingester,
			fileID = query.fileID;

		Log("INGEST", query, body);
		res("ingesting events");

		if (fileID) {
			//sql.query("DELETE FROM app.events WHERE ?", {fileID: fileID});

			sql.query("SELECT Class FROM app.files WHERE ?", {ID: fileID})
			.on("result", file => {
				if ( opts = EAT[src] )   // use builtin src ingester (event eater)
					ingester( opts, query, evs => {
						ingestList( sql, evs, fileID, file.Class, aoi => {
							Log("INGESTED", aoi);
						});
					});

				else  // use custom ingester
					sql.query("SELECT _Ingest_Script FROM app.files WHERE ? AND _Ingest_Script", {ID: fileID})
					.on("results", file => {
						if ( opts = JSON.parse(file._Ingest_Script) ) 
							ingester( opts, query, evs => {
								ingestList( sql, evs, fileID, file.Class, aoi => {
									Log("INGESTED", aoi);	
								});
							});
					});
			});
		}
	},

	sysDecode: function(req,res) {
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
	},

	sysAgent: function(req,res) {
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
						FLEX.getContext(sql, "app."+Thread.plugin, {ID: Thread.case}, ctx => {
							ctx.Save = evs;
							res( saveContext( sql, ctx ) );
						});

					else
						res( TOTEM.errors.badAgent );
				}

				else
					res( TOTEM.errors.badAgent );

			});

		}

		else
			res( TOTEM.errors.badAgent );

	},

	sysAlert: function(req,res) {
	/**
	@method sysAlert
	Totem (req,res)-endpoint to send notice to all clients
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/
		var 
			query = req.query,
			pocs = TOTEM.site.pocs || {},
			msg = query.msg;

		if ( req.client == pocs.admin ) {
			if (IO = TOTEM.IO)
				IO.sockets.emit("alert",{msg: msg || "system alert", to: "all", from: TOTEM.site.title});

			Trace("ALERTING "+msg);
			res("Broadcasting alert");
		}

		else 
			res("This endpoint reserved for " + "system admin".tag( "mailto:" + pocs.admin ) );
	},

	sysStop: function(req,res) {
	/**
	@method sysStop
	Totem (req,res)-endpoint to send emergency message to all clients then halt totem
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/
		if (IO = TOTEM.IO)
			IO.sockets.emit("alert",{msg: req.query.msg || "system halted", to: "all", from: TOTEM.site.title});

		res("Server stopped");
		process.exit();
	}
};

function saveContext(sql, ctx) {	// save event context to plugin usecase
/**
Aggregate and save events evs = [ev, ...] || { } || Error under direction of the supplied context 
ctx = { Save: { ... }, Ingest: true||false, Export: true||false, ... }.  Stashify is used to 
aggreagate data using [ev, ...].stashify( "at", "Save_", ctx ) where events ev = 
{ at: KEY, A: a1, B: b1, ... } || { x: x1, y: y1 } are saved in Save_KEY = 
{A: [a1, a2,  ...], B: [b1, b2, ...], ...} iff Save_KEY is in the supplied ctx.  
*/
	
	function saveNLP(sql, nlp) {	// save NLP context to plugin usecase
		//Log("NLP save>>>>>>>>>>>>>>", nlp);
		var 
			actors = nlp.actors,
			topics = nlp.topics, 
			greedy = false;

		Each( actors, (actor,info) => {
			sql.query(
				"INSERT INTO app.nlpactors SET ? ON DUPLICATE KEY UPDATE Hits=Hits+1",
				{ Name: actor, Type: info.type }, err => Log("save actor", err) );
		});

		if ( greedy )
			Each(actors, source => {
				Each(actors, target => {
					if ( source != target )
						Each( topics, (topic,info) => {
							if ( topic != "dnc" ) 
								sql.query(
									"INSERT INTO app.nlpedges SET ? ON DUPLICATE KEY UPDATE Hits=Hits+1, Weight=Weight+?",
									[{
										Source: source,
										Target: target,
										Link: topic,
										Weight: info.weight,
										Task: "drugs",		//< needs to be fixed to refer to host usecase prefix
										Hits: 1
									}, info.weight], err => Log("save edge", err) );
						});
				});
			});

		else {
			var
				keys = Object.keys(topics),
				keys = keys.sort( (a,b) => topics[b].weight - topics[a].weight ),
				topic = keys[0] || "dnc",
				info = topics[topic];

			//Log("nlpedges", keys, topic, info );

			if ( topic != "dnc" ) 
				Each(actors, source => {
					Each(actors, target => {
						if ( source != target )
							sql.query(
								"INSERT INTO app.nlpedges SET ? ON DUPLICATE KEY UPDATE Hits=Hits+1, Weight=Weight+?",
								[{
									Source: source,
									Target: target,
									Link: topic,
									Weight: info.weight,
									Task: "drugs",		//< needs to be fixed to refer to host usecase prefix
									Hits: 1
								}, info.weight], err => Log("save edge", err) );
					});
				});
		}
	}
		
	var
		host = ctx.Host,
		client = "guest",
		fileName = `${ctx.Host}.${ctx.Name}.stream`;
	
	//Log("saving", evs);

	if ( Save = ctx.Save_NLP ) 
		saveNLP(sql, Save);
	
	if ( Save = ctx.Save )
		switch (Save.constructor.name) {
			case "Error": 
				return Save+"";

			case "Object":  // keys in the plugin context are used to create the stash
				Save.ID = ctx.ID;
				Save.Host = ctx.Host;
				return "".save( sql, Save, evs => {
					//Log("save ctx done");
				});
				break;

			case "Array":
				return Array.from(Save).save( sql, ctx, evs => {  // save events and callback with remaining unsaved evs

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

						Trace("EXPORT "+fileName);
						uploadFile( "", srcStream, `./stores/${fileName}` );
					}

					if ( ctx.Ingest )  // ingest remaining events
						getFile( client, fileName, file => {
							sql.query("DELETE FROM app.events WHERE ?", {fileID: file.ID});

							ingestList( sql, evs, file.ID, file.Class, aoi => {
								Log("INGESTED",aoi);

								sqlThread( sql => {	// run plugins that were linked to this ingest
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
