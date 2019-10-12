/**
@class DEBE.EndPoints
Service endpoints endpt(req,res)
*/
var		// nodejs
	ENV = process.env,
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

function Trace(msg,req,fwd) {	// execution tracing
	"endpt".trace(msg,req,fwd);
}

const { Copy,Each,Log,isString,isFunction,isError,isArray,Serialize } = ENUM;
const { sqlThread, uploadFile, probeSite, errors, site, watchFile } = TOTEM;
const { ingestList } = GEO;

module.exports = {
	autorun: {
		set: setAutorun,
		exe: exeAutorun
	},
	
	sysGraph: function (req,res) {
		const { query, sql, table, type } = req;
		var nodes = [], links = [];
		
		if ( neodb = TOTEM.neodb )
			neodb.cypher({
				query: "MATCH (n) RETURN n",
				params: query
			}, (err,recs) => {
				//Log(JSON.stringify(recs));
				recs.forEach( rec =>  nodes.push({
					id: rec.n._id, 
					name: rec.n.properties.name,
					group: rec.n.labels[0]
				}) );
				
				neodb.cypher({
					query: "MATCH (a)-[r]->(b) RETURN r"
				}, (err,recs) => {
					
					//Log(err,"recs", recs.length);
					//Log(JSON.stringify(recs));
					recs.forEach( rec => links.push({
						source: rec.r._fromId,
						target: rec.r._toId,
						value: 23
					}) );
					
					res({
						nodes: nodes,
						links: links
					});
				});
			});
		
		else
			res( errors.noGraph );
	},
	
	icoFavicon: function (req,res) {   // extjs trap
		res("No icons here"); 
	},

	getCert: function (req,res) { // create/return public-private certs
	/**
	@method getCert
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
					res( errors.certFailed );

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

	extendPlugin: function (req,res) {	//< add usecase keys to plugin
	/**
	@private
	@method extendPlugin
	Totem (req,res)-endpoint to add req.query keys to plugin req.table.
	@param {Object} req http request
	@param {Function} res Totem response callback
	*/
		const { query, sql, table, type } = req;

		res("extending");

		Each(query, (key, val) => {
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

			sql.query("ALTER TABLE app.?? ADD ?? "+type, [table,key]);

		});
	},

	retractPlugin: function (req,res) {	//< remove usecase keys from plugin
	/**
	@private
	@method retractPlugin
	Totem (req,res)-endpoint to remove req.query keys from plugin req.table.
	@param {Object} req http request
	@param {Function} res Totem response callback
	*/
		const { query, sql, table, type } = req;

		res("retracting");

		Each(query, (key, val) => {
			sql.query("ALTER TABLE app.?? DROP ?? ", [table,key]);
		});
	},

	usagePlugin: function (req,res) {
		const { query, sql, table, type } = req;
		sql.query(
			"SELECT Name, Type, JIRA, RAS, Task "
			+ "FROM app.engines LEFT JOIN openv.milestones ON milestones.Plugin=engines.Name "
			+ "WHERE ? LIMIT 1",
			[{Name: table}], (err,engs) => {

			if ( eng = engs[0] )
				res([
					`/${eng.Name}.use`.tag("a",{href: `/${eng.Name}.use`}),
					`/${eng.Name}.run`.tag("a",{href: `/${eng.Name}.run`}),
					`/${eng.Name}.view`.tag("a",{href: `/${eng.Name}.view`}),
					`/${eng.Name}.tou`.tag("a",{href: `/${eng.Name}.tou`}),
					`/${eng.Name}.status`.tag("a",{href: `/${eng.Name}.status`}),
					`/${eng.Name}.pub`.tag("a",{href: `/${eng.Name}.pub`}),
					`/${eng.Name}.${eng.Type}`.tag("a",{href: `/${eng.Name}.${eng.Type}`}),
					`/briefs.view?options=${eng.Name}`.tag("a",{href: `/briefs.view?options=${eng.Name}`}),
					(eng.JIRA||"").tag("a",{href:ENV.JIRA}),
					(eng.RAS||"").tag("a",{href:ENV.RAS}),
					(eng.Task||"").tag("a",{href:"/milestones.view"})
				].join(" | ") );
			
			else
				res( errors.noEngine );
		});
		
	},
	
	usersPlugin: function (req,res) {
		const { query, sql, table, type } = req;

		res( site.pocs.overlord.split(";") );
	},
	
	exportPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
			name = table;
		
		res( "exporting" );
		CP.exec(
			`mysqldump -u$MYSQL_USER -p$MYSQL_PASS -h$MYSQL_HOST --add-drop-table app ${name} >./stores/${name}.nb`,
			(err,out) => Trace( `EXPORTED ${name} `+ (err||"ok") ), req );	
	},

	importPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
			name = table;
	
		res( "importing" );
		CP.exec(
			`mysql -u$MYSQL_USER -p$MYSQL_PASS -h$MYSQL_HOST --force app < ./stores/${name}.nb`,
			(err,out) => Trace( `IMPORTED ${name} `+ (err||"ok") ), req );							
	},

	docPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		
		getEngine( sql, table, eng => {
			if ( eng )
				if ( eng.ToU )
					eng.ToU.Xfetch( res );

				else 
					res( null );
			
			else 
				res( errors.noEngine );
		});
	},
	
	publishPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
			name = table;

		getEngine( sql, table, eng => {
			if ( eng ) {
				res( "publishing" );
				FLEX.publishPlugin(sql, "./public/"+eng.Type+"/"+eng.Name, eng.Name, eng.Type, false);
			}
			
			else
				res( errors.noEngine );
		});
	},
	
	statusPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
			name = table,
			product = table + "." + type,
			fetchUsers = function (rec, cb) {	// callback with endservice users
				probeSite(rec._EndService, info => { 
					//Log("status users", info);
					cb( (info.toLowerCase().parseJSON() || [] ).join(";") ) ;
				});
			},
			fetchMods = function (rec, cb) {	// callback with endservice moderators
				sql.query(
					"SELECT group_concat( DISTINCT _Partner SEPARATOR ';' ) AS _Mods FROM app.releases WHERE ? LIMIT 1",
					{ _Product: rec.Name+".html" },
					(err, mods) => { 

						//Log("status mods", err, mods);
						if ( mod = mods[0] || { _Mods: "" } )
							cb( mod._Mods || "" );

					});
			};

		getProductKeys( product, keys => {
			var urls = keys.urls;

			sql.query(
				"SELECT Ver, Comment, _Published, _Product, _License, _EndService, _EndServiceID, 'none' AS _Users, "
				+ " 'fail' AS _Status, _Fails, "
				+ "group_concat( DISTINCT _Partner SEPARATOR ';' ) AS _Partners, sum(_Copies) AS _Copies "
				+ "FROM app.releases WHERE ? GROUP BY _EndServiceID, _License ORDER BY _Published",

				[ {_Product: product}], (err,recs) => {

					//Log("status", err, q.sql);

					if ( recs.length )
						recs.serialize( fetchUsers, (rec,users) => {  // retain user stats
							if (rec) {
								if ( users )
									rec._Users = users.mailify( "users", {subject: name+" request"});

								else 
									sql.query("UPDATE app.releases SET ? WHERE ?", [ {_Fails: ++rec._Fails}, {ID: rec.ID}] );

								var 
									url = URL.parse(rec._EndService),
									host = url.host.split(".")[0];

								rec._License = rec._License.tag("a",{href:urls.totem+`/releases.html?_EndServiceID=${rec._EndServiceID}`});
								rec._Product = rec._Product.tag("a", {href:urls.run});
								rec._Status = "pass";
								rec._Partners = rec._Partners.mailify( "partners", {subject: name+" request"});
								rec._EndService = host.tag("a",{href:rec._EndService});
								delete rec._EndServiceID;
							}

							else
								recs.serialize( fetchMods, (rec,mods) => {  // retain moderator stats
									if (rec) 
										rec._Mods = mods.mailify( "moderators", {subject: name+" request"});

									else 
										res( recs.gridify() );
								});
						});

					else
						res( "no transitions found" );
			});
		});
	},
	
	matchPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
			name = table,
			product = table + "." + type,
			suits = [];

		getProductKeys( product, keys => {
			var urls = keys.urls;
			
			sql.query(
				"SELECT Name,Path FROM app.lookups WHERE ?",
				{Ref: name}, (err,recs) => {

				recs.forEach( rec => {
					suits.push( rec.Name.tag( `${urls.transfer}${rec.Path}/${name}` ));
				});

				/*
				// Extend list of suitors with already  etc
				sql.query(
					"SELECT endService FROM app.releases GROUP BY endServiceID", 
					[],  (err,recs) => {

					recs.forEach( rec => {
						if ( !sites[rec.endService] ) {
							var 
								url = URL.parse(rec.endService),
								name = (url.host||"none").split(".")[0];

							rtns.push( `<a href="${urls.transfer}${rec.endService}">${name}</a>` );
						}
					});

					rtns.push( `<a href="${urls.loopback}">loopback test</a>` );

					if (proxy)
						rtns.push( `<a href="${urls.proxy}">other</a>` );

					//rtns.push( `<a href="${site.urls.worker}/lookups.view?Ref=${product}">add</a>` );

					cb( rtns.join(", ") );
				}); */
				suits.push( "loopback".tag( urls.loopback ) );
				suits.push( "other".tag( urls.tou ) );

				//suits.push( `<a href="${urls.totem}/lookups.view?Ref=${product}">suitors</a>` );

				res( suits.join(", ") );
			});	
		});
	},

	touPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		
		getEngine( sql, table, eng => {
			if ( eng )
				( eng.ToU || "ToU undefined" )
					.Xfetch( html => html.Xparms( name, html => res(html) ));
			
			else
				res( errors.noEngine );
		});
	},
		
	trackPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var 
			name = table,
			product = name + "." + type;
		
		sql.query(
			"SELECT _License,_EndService FROM app.releases WHERE ? LIMIT 1", 
			{_Product: product}, (err,pubs) => {

			res( err || pubs );
		});
	},

	getPlugin: function (req,res) {
		const { query, sql, table, type, client } = req;
		var 
			name = table,
			attr = type,
			product = name + "." + type,
			partner = client,
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
		
		getEngine( sql, name, eng => {
			if ( eng ) 
				switch (type) {
					case "js":
					case "py":
					case "me":
					case "m":
						sql.query(
							"SELECT * FROM app.releases WHERE least(?,1) ORDER BY _Published DESC LIMIT 1", {
								_Partner: endPartner+".forever",
								_EndServiceID: FLEX.serviceID( endService ),
								_Product: product
						}, (err, pubs) => {

							function addTerms(code, type, pub, cb) {
								var 
									prefix = {
										js: "// ",
										py: "# ",
										matlab: "% ",
										jade: "// "
									},
									pre = "\n"+(prefix[type] || ">>");

								FS.readFile("./public/md/tou.txt", "utf8", (err, terms) => {
									if (err) 
										cb( errors.noLicense );

									else
										cb( pre + terms.parseEMAC( Copy({
											"urls.service": pub._EndService,
											license: pub._License,
											published: pub._Published,
											partner: pub._Partner
										}, keys, ".")).replace(/\n/g,pre) + "\n" + code);
								});
							}

							// May rework this to use eng.Code by priming the Code in the publish phase
							FS.readFile( `./public/${type}/${name}.d/source`, "utf8", (err, srcCode) => {
								if (!err) eng.Code = srcCode;

								if ( pub = pubs[0] )	// already released so simply distribute
									addTerms( eng.Code, type, pub, res );

								else	// not yet released so ...
								if ( FLEX.licenseOnDownload ) { // license required to distribute
									if ( endService )	// specified so try to distribute
										if ( eng.Minified )	// compiled so ok to distribute
											FLEX.licenseCode( sql, eng.Minified, {
												_Partner: endPartner,
												_EndService: endService,
												_Published: new Date(),
												_Product: product,
												Path: "/"+product
											}, pub => {
												if (pub) // distribute licensed version
													addTerms( eng.Code, type, pub, res );

												else	// failed
													res( null );
											});

										else
											res( null );

									else
										res( null );
								}

								else	// no license required
									res( eng.Code );
							});
						});
						break;

					case "jade":
						res( (eng.Type == "jade") ? eng.Code : null );
						break;

					default:
						res( errors.noEngine );
				}
			
			else
				res( errors.noEngine );
		});
	},

	simPlugin: function (req,res) {
		const { query, sql, table, type, client } = req;
		
		var crud = {
			reset: "delete",
			step: "select"
		};
		
		if ( route = crud[type] )
			ATOM[route](req, ctx =>	res( ctx ? "ok" : "failed") );
		
		else
			res( new Error("bad sim spec") );
	},
	
	exePlugin: function (req,res) {	//< execute plugin in specified usecase context
	/**
	@private
	@method exePlugin
	Totem (req,res)-endpoint to execute plugin req.table using usecase req.query.ID || req.query.Name.
	@param {Object} req http request
	@param {Function} res Totem response callback
	*/	
		function pipePlugin( sup, sql, job, cb ) { //< pipe job via supervisor 

			function log( ) {
				var args = [];
				for (var key in arguments) if ( key != "0" ) args.push( arguments[key] );
				"pipe".trace( arguments[0]+": "+JSON.stringify(args), req, Log );
			}
			
			function pipe(sup, sql, job, cb) {
				var 
					ctx = job.ctx,
					query = job.query;

				log("opened", job.path);
				if ( sup )	// using supervisor
					sup(log, sql, job, data => {
						if (data) {
							Copy(data,ctx);
							Each(query, (key,exp) => {
								//Log(">pipe",key,exp);
								data[key] = ctx[key] = isString(exp)
									? exp.parseJS( ctx, err => log("bad key", `${key}=${exp}`) )
									: exp;
							});

							cb( ctx, () => {
								log("closed");
								for (key in data) delete ctx[key];
							});
						}

						else
							cb(null);
					});

				else	// unsupervised
					cb( ctx, () => {
						log("closed");
					});
			}

			sql.insertJob( job, job => { 
				pipe( sup, sql, job, (ctx,close) => {
					if (ctx) {
						req.query = Copy(ctx,{});   // pass neutral Object to engine run context		
						ATOM.select(req, ctx => {  // run plugin
							//Log(">>pipe save=", ctx.Save );
							if ( ctx )
								if ( isError(ctx)  )
									log("error", ctx);

								else 
									cb( ctx, sql );

							if (close) close();	// if plugin was placed into supervisor, then close it
						});
					}

					else
						log("halted");
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

		const { sql, client, profile, table, query } = req;
		
		var
			ok = "ok",
			now = new Date(),
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

				// Log("exe ctx", ctx);

				if ( !ctx) 
					Trace( errors.noContext, req, res );

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

								switch ( pipeType ) {
									case "export": 	
										job.path = pipePath = `/stores/${pipeName}.stream`;
										break;
								}
										
								/*
								if ( !pipeJob ) {
									pipePath = job.path = `/stores/${pipeType}.${pipeName}.stream`;
									[x,pipeName,pipeType] = pipePath.substr(1).match(/(.*)\.(.*)/) || ["", pipePath, "json"],
									pipeJob = TOTEM.pipeJob[pipeType];
								} */

								Log(">pipe", pipePath, pipeName, pipeType);

								var
									isFlexed = FLEX.select[pipeName] ? true : false,
									isDB = pipeType == "db";

								if ( !isFlexed && !isDB  && false) {  // setup plugin autorun only when pipe references a file
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
											Trace( errors.lostContext, req );
									});

								else 
									err = errors.badType;
							}

							else	// pipe is text doc
								pipePlugin(pipeDoc, sql, job, (ctx,sql) => {   // place job in doc workflow
									if (ctx)
										saveContext(sql, ctx);

									else
										Trace( errors.lostContext, req );
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
									jobs = [], inserts = 0;

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
														probeSite( `/${host}.exe?Name=${job.Name}`, info => {} );
												});
										});
									});
								});
							}

							break;
					}

					if ( err) 
						Trace(err, req, res);
					else
						res( ok );
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
			res(errors.noUsecase);

	},

	/*
	probePlugin: function(req,res) {  //< share plugin attribute / license plugin code
		const { query, sql, table, type, client } = req;

		var 
			name = table,
			attr = type,
			partner = client,
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

		getEngine( sql, name, eng => {
			if ( eng ) 
				FLEX.pluginAttribute( sql, attr, partner, endService, proxy, eng, attrib => {
					//req.type = types[req.type] || "txt";

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

										/ *
										var 
											parts = pub.Ver.split("."),
											ver = pub.Ver = parts.concat(parseInt(parts.pop()) + 1).join(".");
										* /

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
	},  */
	
	getDoc: function (req, res) {
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

				Trace("SCRAPE "+url, req, Log);
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
			msg = query.msg = `System updating in ${delay} seconds`;

		if ( req.client == site.pocs.admin ) {
			Log(req.client, TOTEM.site.site.pocs);

			sysAlert(req,res);

			setTimeout( function () {
				Trace("RESTART ON " + now(), req, Log);
				process.exit();
			}, delay*1e3);
		}

		else
			res("This endpoint reserved for " + "system admin".tag( "mailto:" + site.pocs.admin ) );
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
							probeSite( url.tag("?", query), data => {
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
						res( errors.badAgent );
				}

				else
					res( errors.badAgent );

			});

		}

		else
			res( errors.badAgent );

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
			msg = query.msg;

		if ( req.client == site.pocs.admin ) {
			if (IO = TOTEM.IO)
				IO.sockets.emit("alert",{msg: msg || "system alert", to: "all", from: TOTEM.site.title});

			Trace("ALERTING "+msg, req, Log);
			res("Broadcasting alert");
		}

		else 
			res("This endpoint reserved for " + "system admin".tag( "mailto:" + site.pocs.admin ) );
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
		//Log("NLP save>>>>>>>>>>>>>>", nlp, "db=", TOTEM.neodb);
		var 
			neodb = TOTEM.neodb,
			actors = nlp.actors,
			topics = nlp.topics, 
			greedy = false;

		if ( neodb )
		Serialize( actors, (act, actor) => {
			Log(actor,act);
			if (act) // add actor
				neodb.cypher({
					query: `MERGE (n:${act.type} {name:$name}) ON CREATE SET n = $props`,
					params: {
						name: actor,
						props: {
							name: actor,
							email: "tbd",
							tele: "tbd",
							created: new Date()
						}
					}
				}, err => { Trace( err || "add actor" ); cb(); } );
			
			else	// all actors added so add edges
			if ( greedy )		// make all possible edges
				Each(actors, (source,src) => {
					Each(actors, (target,tar) => {
						if ( source != target )
							Each( topics, (topic,info) => {
								if ( topic != "dnc" ) 
									neodb.cypher({
										query: `MATCH (a:${src.type} {name:$src}),(b:${tar.type} {name:$tar}) MERGE (a)-[r:${topic}]-(b) ON CREATE SET r.created = timestamp() `,
										params: {
											src: source,
											tar: target
										}
									}, err => Trace( err || "add edge") );
									
									/*
									sql.query(
										"INSERT INTO app.nlpedges SET ? ON DUPLICATE KEY UPDATE Hits=Hits+1, Weight=Weight+?",
										[{
											Source: source,
											Target: target,
											Link: topic,
											Weight: info.weight,
											Task: "drugs",		//< needs to be fixed to refer to host usecase prefix
											Hits: 1
										}, info.weight], err => Log("save edge", err) ); */
							});
					});
				});

			else {	// make only required edges
				var
					keys = Object.keys(topics),
					keys = keys.sort( (a,b) => topics[b].weight - topics[a].weight ),
					topic = keys[0] || "dnc",
					info = topics[topic];

				//Log("nlpedges", keys, topic, info );

				if ( topic != "dnc" ) 
					Each(actors, (source, src) => {
						Each(actors, (target, tar) => {
							if ( source != target ) {
								Log( source, target, `MATCH (a:${src.type} {name:$src}),(b:${tar.type} {name:$tar}) MERGE (a)-[r:${topic}]-(b) ON CREATE SET r.created = timestamp() ` );
								neodb.cypher({
									query: `MATCH (a:${src.type} {name:$src}),(b:${tar.type} {name:$tar}) MERGE (a)-[r:${topic}]-(b) ON CREATE SET r.created = timestamp() `,
									params: {
										src: source,
										tar: target
									}
								}, err => Trace( err || "add edge") );
							}
								/*
								sql.query(
									"INSERT INTO app.nlpedges SET ? ON DUPLICATE KEY UPDATE Hits=Hits+1, Weight=Weight+?",
									[{
										sourceType: srcInfo.type,
										targetType: tarInfo.type,
										Source: source,
										Target: target,
										Topic: topic,
										Weight: info.weight,
										Task: "drugs",		//< needs to be fixed to refer to host usecase prefix
										Hits: 1
									}, info.weight], err => Log("save edge", err) ); */
						});
					});
			}
		});
		
		/*
		Each( actors, (actor,act) => {
			Log(actor,act);
			neodb.cypher({
				query: `MERGE (n:${act.type} {name:$name}) ON CREATE SET n = $props`,
				params: {
					name: actor,
					props: {
						name: actor,
						email: "tbd",
						tele: "tbd",
						created: new Date()
					}
				}
			}, err => Trace( err || "added actor" ) );				
			/ *
			sql.query(
				"INSERT INTO app.nlpactors SET ? ON DUPLICATE KEY UPDATE Hits=Hits+1",
				{ Name: actor, Type: info.type }, err => Log("save actor", err) );
				* /
		}); */
	}
		
	var
		host = ctx.Host,
		client = "guest",
		fileName = `${ctx.Host}_${ctx.Name}.stream`;
	
	//Log("saving", ctx.Save);

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

function getEngine( sql, name, cb ) {
	sql.query( 
		"SELECT * FROM app.engines WHERE least(?,1) LIMIT 1", { Name: name }, (err, engs) => {
		cb( engs[0] || null );
	});	
}

function getProductKeys( product, cb ) {
	cb( FLEX.productKeys(product) );
}

function setAutorun(path) {
	watchFile( "."+path, exeAutorun );
}

function exeAutorun(sql,name,path) {

	Log("autorun", path);
	sql.query( "SELECT * FROM app.files WHERE Name=?", path.substr(1) )
	.on("result", (file) => {

		var 
			now = new Date(),
			startOk = now >= file.PoP_Start || !file.PoP_Start,
			endOk = now <= file.PoP_End || !file.PoP_End,
			fileOk = startOk && endOk;

		// Log("autorun", startOk, endOk);

		if ( fileOk )
			sql.query( "SELECT Run FROM openv.watches WHERE File=?", path.substr(1) )
			.on("result", (link) => {
				var 
					parts = link.Run.split("."),
					pluginName = parts[0],
					caseName = parts[1],
					exePath = `/${pluginName}.exe?Name=${caseName}`;

				//Log("autorun", link,exePath);
				probeSite( exePath, msg => Trace("autorun "+msg) );
			});
	});

}
