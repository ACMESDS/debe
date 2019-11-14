/**
@class DEBE.EndPoints
Provides service endpoints 

	ENDPOINT(req,res) 
	
for accessing datasets, engines, and notebooks (aka plugins) as documented in README.md.

@requires stream
@requires child_process
@requires crypto
@requires fs
@requires url
@requires uglify
@requires html-minifier
@requires man
@requires totem
@requires flex
@requires geohack
@requires atomic
*/
var		
	// nodejs
	ENV = process.env,
	STREAM = require("stream"), 		//< pipe streaming
	CP = require("child_process"), 		//< Child process threads
	CRYPTO = require("crypto"), 	//< to hash names
	URL = require("url"), 	//< url parsing
	FS = require("fs"); 				//< filesystem and uploads

	// 3rd party
	JSMIN = require("../flex/node_modules/uglify-js"), 			// code minifier
	HMIN = require("../flex/node_modules/html-minifier"), // html minifier
		
	// totem
	$ = require("man"), 			// matrix minipulaor
	TOTEM = require("totem"),
	ENUM = require("enum"),
	FLEX = require("flex"),
	GEO = require("geohack"),
	ATOM = require("atomic");

const { skinContext, renderJade } = require("./skins");

function Trace(msg,req,fwd) {	// execution tracing
	"endpt".trace(msg,req,fwd);
}

const { Copy,Each,Log,isString,isFunction,isError,isArray,Stream } = ENUM;
const { sqlThread, uploadFile, probeSite, errors, site, watchFile } = TOTEM;
const { ingestList } = GEO;

const { sysAlert, licenseOnDownload, defaultDocs } = module.exports = {
	defaultDocs: {	// default plugin docs (db key comments)
		nodoc: "no documentation provided",

		Export: "switch writes engine results [into a file](/api.view)",
		Ingest: "switch ingests engine results [into the database](/api.view)",
		Share: "switch returns engine results to the status area",
		Pipe: `
Places a DATASET into a TYPE-specific supervised workflow:

	"/PATH/DATASET.TYPE ? KEY || [KEY,...] = $.JS & ... "
	{ "$" : "MATHJS" }
	{ "Pipe" : "/PATH/DATASET.TYPE?..." ,  "KEY" :  [VALUE, ...] , ... }

The "/PATH/DATASET.TYPE" [source data pipe](/api.view) places the TYPE-specific data $ = json || GIMP image || event list || document text || db record
into a TYPE = json || jpg | png | nitf || stream | export  || txt | doc | pdf | xls  || aoi || db specific workflow.  The { KEY: [VALUE, ...] } [enumeration pipe](/api.view) 
generates usecases over permuted context KEYs.  The $ json data can also be post-processed by a [MATHJS script](/api.view).
`, 

		Description: `
Document your usecase using markdown:

	% { PATH.TYPE ? w=WIDTH & h=HEIGHT & x=KEY$INDEX & y=KEY$INDEX ... }
	~{ TOPIC ? starts=DATE & ends=DATE ... }
	\${ KEY } || \${ JS } || \${doc( JS , "INDEX" )}
	[ LINK ] ( URL )
	$$ inline TeX $$  ||  n$$ break TeX $$ || a$$ AsciiMath $$ || m$$ MathML $$
	[JS || #JS || TeX] OP= [JS || #JS || TeX]
	KEY,X,Y >= SKIN,WIDTH,HEIGHT,OPTS
	KEY <= VALUE || OP <= EXPR(lhs),EXPR(rhs)

`,

		Until: "run count or end date",
		Save: "aggregates notebook results not captured in other Save_KEYs  ",
		Entry: 'primes context KEYs on entry using { KEY: "SELECT ....", ...}  ',
		Exit: 'saves context KEYs on exit using { KEY: "UPDATE ....", ...}  ',
		Ring: "[[lat,lon], ...] in degs 4+ length vector defining an aoi",
		
		Save_end: "aggregates notebook results when stream finished",
		Save_config: "aggregates notebook resuts when stream configured",
		Save_batch: "aggregates notebook resuts when stream at batch points"
	},
	
	licenseOnDownload: true,
	
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
			`mysqldump -u$MYSQL_USER -p$MYSQL_PASS -h$MYSQL_HOST --add-drop-table app ${name} >./shares/${name}.nb`,
			(err,out) => Trace( `EXPORTED ${name} `+ (err||"ok") ), req );	
	},

	importPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
			name = table;
	
		res( "importing" );
		CP.exec(
			`mysql -u$MYSQL_USER -p$MYSQL_PASS -h$MYSQL_HOST --force app < ./shares/${name}.nb`,
			(err,out) => Trace( `IMPORTED ${name} `+ (err||"ok") ), req );							
	},

	docPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		
		getEngine( sql, table, eng => {
			if ( eng )
				res( eng.ToU || "No Terms-Of-Use defined" );
 /* `
MathJax.Hub.Config({
	extensions: ["tex2jax.js"],
	jax: ["input/TeX","output/HTML-CSS"],
	tex2jax: {inlineMath: [["$","$"],["\\(","\\)"]]}
}); `.tag("script", {src: "/clients/mathjax/MathJax.js?config=default"})
					
+ "".tag("link", { rel: 'stylesheet', href: '/clients/reveal/lib/css/zenburn.css' })

+ `
code  {
	font-family: consolas, courier, monospace;
	font-size: 1em;
	line-height: 1.2em;
	white-space: pre;
	background-color: #acf; 
	color: #000; 
	border: 1px solid #666;
	-moz-border-radius: 0.5em;
	-webkit-border-radius: 0.5em;
	border-radius: 0.5em; 
	padding: 25px;
	margin: 1.2em 1em;
	width: 100%;
	float: left;
}`.tag("style",{}) */

			else 
				res( errors.noEngine );
		});
	},
	
	publishPlugin: function (req,res) {
		
		function publish(sql, ctx, path, name, type) {  // publish product = name.type

			function minifyCode( code, cb ) {  //< callback cb(minifiedCode, license)
				//Log(">>>>min", code.length, type, name);
				
				switch (type) {
					case "html":
						cb( HMIN.minify(code.replace(/<br>/g,""), {
							removeAttributeQuotes: true
						}) );
						break;

					case "js":
						var
							e6Tmp = "./temps/e6/" + product,
							e5Tmp = "./temps/e5/" + product;

						FS.writeFile(e6Tmp, code, "utf8", err => {
							CP.exec( `cd /local/babel/node_modules/; .bin/babel ${e6Tmp} -o ${e5Tmp} --presets es2015,latest`, (err,log) => {
								try {
									FS.readFile(e5Tmp, "utf8", (err,e5code) => {
										if ( err ) 
											cb( null );

										else {
											var min = JSMIN.minify( e5code );

											if ( min.error ) 
												cb( null );

											else   
												cb( min.code );
										}
									});
								}
								catch (err) {
									cb( null );
								}
							});
						});
						break;						

					case "py":
						/*
						minifying python is problematic as the pyminifier obvuscator has no option
						to reseed; thus the pyminifier was modified to reseed its rv generator (see install
						notes).
						*/

						var pyTmp = "./temps/py/" + product;

						FS.writeFile(pyTmp, code.replace(/\t/g,"  ").replace(/^\n/gm,""), "utf8", err => {
							CP.exec(`pyminifier -O ${pyTmp}`, (err,minCode) => {
								//Log("pymin>>>>", err);

								if (err)
									cb(err);

								else
									cb( minCode );
							});
						});
						break;

					case "m":
					case "me":
						/*
						Could use Matlab's pcode generator - but only avail within matlab
								cd to MATLABROOT (avail w matlabroot cmd)
								matlab -nosplash -r script.m
								start matlab -nospash -nodesktop -minimize -r script.m -logfile tmp.log

						but, if not on a matlab machine, we need to enqueue this matlab script from another machine via curl to totem

						From a matlab machine, use mcc source, then use gcc (gcc -fpreprocessed -dD -E  -P source_code.c > source_code_comments_removed.c)
						to remove comments - but you're back to enqueue.

						Better option to use smop to convert matlab to python, then pyminify that.
						*/

						var 
							mTmp = "./temps/matsrc/" + product,
							pyTmp = "./temps/matout/" + product;

						FS.writeFile(mTmp, code.replace(/\t/g,"  "), "utf8", err => {
							CP.execFile("python", ["matlabtopython.py", "smop", mTmp, "-o", pyTmp], err => {	
								//Log("matmin>>>>", err);

								if (err)
									cb( err );

								else
									FS.readFile( pyTmp, "utf8", (err,pyCode) => {
										if (err) 
											cb( err );

										else
											CP.exec(`pyminifier -O ${pyTmp}`, (err,minCode) => {
												if (err)
													cb(err);

												else
													cb( minCode );
											});										
									});									
							});
						});
						break;

					case "jade":
						cb( code.replace(/\n/g," ").replace(/\t/g," ").replace(/  /g,"").replace(/, /g,",").replace(/\. /g,".") );
						break;

					case "":
					default:
						cb( code );
				}
			}
		
			function getter( opt ) {	
				if (opt) 
					if ( typeof opt == "function" )
						switch (opt.name) {
							case "engine":
							case "tou":
							case "inits":
							case "wrap":
								return opt({
									path: path,
									read: FS.readFileSync,
									exec: CP.exec 
								});
							default:
								return opt+"";
						}
					else
						return opt;
				else
					return opt;
			}

			function genToU( mod, ctx, cb ) {
				var tou = 
					( getter( mod.tou || mod.readme ) || FS.readFileSync("./jades/tou.jade", "utf8") )
					.replace( /\r\n/g, "\n") ;  // if sourced from a editor that saves \r\n vs \n

				renderJade( tou, ctx, html => cb(mod,html) );
				//tou.Xblog( ctx, html => cb(mod,html) );
			} 

			function getComment( sql, cb ) {
				var com = sql.replace( /(.*) comment '((.|\n|\t)*)'/, (str,spec,doc) => { 
					//Log(">>>>>>>>>>>>>>spec", spec, doc);
					cb( spec, doc );
					return "#";
				});

				if ( !com.startsWith("#") ) cb( sql, "" );			
			}

			try {
				var	mod = require(process.cwd() + path.substr(1));
			}
			catch (err) {
				Log("PUBLISH", name, err);
				return;
			}

			var
				modkeys = mod.mods || mod.modkeys || mod._mods,
				addkeys = mod.adds || mod.addkeys || mod.keys,
				prokeys = modkeys || addkeys || {},
				product = name + "." + type;
			
			const { defaultDocs, dockeys, speckeys } = ctx;

			// expand product key comments

			Stream( prokeys, (def,key,cb) => {
				if ( cb )	// define a doc for each and every key
					getComment( def, (spec, doc) => {
						var
							com = defaultDocs[key] || "",
							com = com + doc,
							com = com || defaultDocs.nodoc,
							com = com || "missing documentation";

						com.Xblog( ctx, html => { 
							//Log("gen", key,spec,html.substr(0,100));
							speckeys[key] = spec;
							dockeys[key] = html;
							cb();
						});
					});

				else // all keys expanded so ...
					genToU(mod, ctx, (mod, tou) => {	// generate ToU in this blogctx
						Log(">>>>>>gen tou", tou.length);

						if ( mod.clear || mod.reset )
							sql.query("DROP TABLE app.??", name);

						sql.query( 
							`CREATE TABLE app.${name} (ID float unique auto_increment, Name varchar(32) unique key)` , 
							[], err => {

							var
								modkeys = mod.mods || mod.modkeys || mod._mods,
								addkeys = mod.adds || mod.addkeys || mod.keys;

							if ( modkeys )
								Each( modkeys, key => {
									var 
										keyId = sql.escapeId(key),
										spec = speckeys[key],
										doc = dockeys[key];

									//Log(">>mod", key, dockeys[key].substr(0,100));
									sql.query( `ALTER TABLE app.${name} MODIFY ${keyId} ${spec} comment ?`, [ doc ] );
								});

							else
							if ( addkeys )
								Each( addkeys, key => {
									var 
										keyId = sql.escapeId(key),
										spec = speckeys[key],
										doc = dockeys[doc];

									sql.query( `ALTER TABLE app.${name} ADD ${keyId} ${spec} comment ?`, [ doc ] );
								});

							if ( inits = getter( mod.inits || mod.initial || mod.initialize ) )
								inits.forEach( init => {
									sql.query("INSERT INTO app.?? SET ?", init);
								});

							if  ( readme = mod.readme )
								FS.writeFile( path+".md", readme, "utf8" );

							if ( code = getter( mod.engine || mod.code) ) 
								minifyCode( code, minCode => {
									var 
										from = type,
										to = mod.to || from,
										fromFile = path + "." + from,
										toFile = path + "." + to,
										jsCode = {},
										rec = {
											Code: code,
											Minified: minCode,
											Wrap: getter( mod.wrap ) || "",
											ToU: tou,
												// (getter( mod.tou || mod.readme ) || defs.tou).parseEMAC(subkeys),
											State: JSON.stringify(mod.state || mod.context || mod.ctx || {})
										};

									Trace( `CONVERTING ${name} ${from}=>${to}` );

									if ( from == to )  { // use code as-is
										sql.query( 
											"INSERT INTO app.engines SET ? ON DUPLICATE KEY UPDATE ?", [ 
												Copy(rec, {
													Name: name,
													Type: type,
													Enabled: 1
												}), rec 
											], err => Trace( err || `PUBLISHED ${name}` ) );

										if (from == "js") {	// import js function into $man
											jsCode[name] = mod.engine || mod.code;
											$(jsCode);
										}
									}

									else  // convert code to requested type
										//CP.execFile("python", ["matlabtopython.py", "smop", fromFile, "-o", toFile], err => {
										FS.writeFile( fromFile, code, "utf8", err => {
											CP.exec( `sh ${from}to${to}.sh ${fromFile} ${toFile}`, (err, out) => {
												if (!err) 
													FS.readFile( toFile, "utf8", (err,code) => {
														rec.Code = code;
														if (!err)
															sql.query( 
																"INSERT INTO app.engines SET ? ON DUPLICATE KEY UPDATE ?", [ Copy(rec, {
																	Name: name,
																	Type: type,
																	Enabled: 1
																}), rec ] );
													});									
											});
										});	
								});

							else
								Trace( `NO CODE ${name}` );
						});
								
						/*
						sql.query(
							"UPDATE app.?? SET ? WHERE least(?,1)", [
								name, 
								{Code: code, ToU: tou}}, 
								{Name: name, Type: type}
							], err => Trace( err || `PUBLISHED ${name}` ) );
						*/

						// CP.exec(`cd ${name}.d; sh publish.sh`);
					});
			});
		}

		const { query, sql, table, type } = req;

		var ctx = {
			name: table,
			speckeys: {},
			dockeys: {},
			interface: () => {
				var 
					ifs = [], 
					speckeys = ctx.speckeys, 
					dockeys = ctx.dockeys;

				Each( speckeys, (key, def) => {
					 ifs.push({ 
						 Key: key, 
						 Type: def, 
						 Details: dockeys[key] || "no documentation available" 
					 });
				});
				return ifs.gridify();
			},						
			defaultDocs:  defaultDocs
		};
			
		skinContext( sql, ctx, ctx => {

			switch ( ctx.type ) {
				case "jade":
				case "file":
					res( errors.noEngine );
					break;
					
				default:
					res( "publishing" );

					publish(sql, ctx, `./public/${ctx.type}/${ctx.name}`, ctx.name, ctx.type);
			}
		});
	},
	
	statusPlugin: function (req,res) {
		const { query, sql, table, type } = req;
		var
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
		
		skinContext( sql, { name: table }, ctx => {
			
			var
				name = ctx.name,
				type = ctx.type,
				product = name + "." + type;
			
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

								rec._License = rec._License.tag("a",{href:ctx.totem+`/releases.html?_EndServiceID=${rec._EndServiceID}`});
								rec._Product = rec._Product.tag("a", {href:ctx.run});
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
		const { query, sql, table } = req;
		
		skinContext( sql, { name: table }, ctx => {

			var
				name = ctx.name,
				type = ctx.type,
				product = name + "." + type,
				suits = [];

			sql.query(
				"SELECT Name,Path FROM app.lookups WHERE ? OR ?",
				[{Ref: name}, {Ref:"notebooks"}], (err,recs) => {

				recs.forEach( rec => {
					suits.push( rec.Name.tag( `${ctx.transfer}${rec.Path}/${name}` ));
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
				suits.push( "loopback".tag( ctx.loopback ) );
				suits.push( "other".tag( ctx.tou ) );

				//suits.push( `<a href="${ctx.totem}/lookups.view?Ref=${product}">suitors</a>` );

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
		
		/*
		function license( code, cb ) {
			licenseCode( sql, code, {
					_Partner: "totem",
					_EndService: ENV.SERVICE_MASTER_URL,
					_Published: new Date(),
					_Product: product,
					Path: path
				}, 
				if (pub)
					Trace(`LICENSED ${pub.Product} TO ${pub.EndUser}`);

				else
					Trace("FAILED LICENSE");
			});
		} */
		
		function serviceID(url) {
			return CRYPTO.createHmac("sha256", "").update(url || "").digest("hex");
		}
		
		function licenseCode( sql, code, pub, cb ) {  //< callback cb(pub) or cb(null) on error

			function validateLicense(pub, cb) {

				function genLicense(code, secret) {  //< callback cb(minifiedCode, license)
					Log("gen license", secret);
					if (secret)
						return CRYPTO.createHmac("sha256", secret).update(code).digest("hex");

					else
						return null;
				}

				var
					product = pub._Product,
					endService = pub._EndService,
					secret = product + "." + endService;

				if ( license = genLicense( code, secret ) ) {
					cb( Copy({
						_License: license,
						_EndServiceID: serviceID( pub._EndService ),
						_Copies: 1
					}, pub) );

					sql.query( "INSERT INTO app.releases SET ? ON DUPLICATE KEY UPDATE _Copies=_Copies+1", pub );

					sql.query( "INSERT INTO app.masters SET ? ON DUPLICATE KEY UPDATE ?", [{
						Master: code,
						License: license,
						EndServiceID: pub._EndServiceID
					}, {Master: code} ] );		
				}

				else 
					cb( null );
			}

			Log(">>>>license code", pub);
			if (endService = pub._EndService)  // an end-service specified so validate it
				probeSite( endService, info => {  // check users provided by end-service
					
					Log(">>>>probe", info);
					var 
						valid = false, 
						partner = pub._Partner.toLowerCase(),
						users = info.parseJSON() || [] ;

					users.forEach( user => { 
						if (user.toLowerCase() == partner) valid = true;
					});

					Log("valid", valid);
					if (valid) // signal valid
						validateLicense( pub,  cb );

					else	// signal invalid
						cb( null  );
				});	

			else	// no end-service so no need to validate
				validateLicense(pub, cb);
		}
		
		const { query, sql, table, type, client } = req;
		
		var 
			endPartner = client,
			endService = query.endservice,
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
		
		Log( endPartner, endService );
		
		skinContext( sql, { name: table }, ctx => {
			
			var 
				name = ctx.name,
				type = ctx.type,
				product = name + "." + type;

			if ( endService )
				switch ( ctx.type) {
					case "js":
					case "py":
					case "me":
					case "m":
						sql.query(
							"SELECT * FROM app.releases WHERE least(?,1) ORDER BY _Published DESC LIMIT 1", {
								_Partner: endPartner+".forever",
								_EndServiceID: serviceID( endService ),
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

								FS.readFile("./jades/tou.txt", "utf8", (err, terms) => {
									if (err) 
										cb( errors.noLicense );

									else
										cb( pre + terms.parseEMAC( Copy({
											service: pub._EndService,
											license: pub._License,
											published: pub._Published,
											partner: pub._Partner
										}, ctx)).replace(/\n/g,pre) + "\n" + code);
								});
							}

							Log(">>>>release", name, type, err, pubs );
							// May rework this to use eng.Code by priming the Code in the publish phase
							sql.query( "SELECT Code,Minified FROM app.engines WHERE ? LIMIT 1", { Name: name }, (err,engs) => {
								if ( eng = engs[0] )
									FS.readFile( `./public/${type}/${name}.d/source`, "utf8", (err, srcCode) => {
										if (!err) eng.Code = srcCode;

										if ( pub = pubs[0] )	// already licensed so simply distribute
											addTerms( eng.Code, type, pub, res );

										else	// not yet released so ...
										if ( licenseOnDownload ) { // license required to distribute
											if ( eng.Minified )	// was compiled so ok to distribute
												licenseCode( sql, eng.Minified, {
													_Partner: endPartner,
													_EndService: endService,
													_Published: new Date(),
													_Product: product,
													Path: "/"+product
												}, pub => {

													Log(">>>>pub license", pub);
													if (pub) // distribute licensed version
														addTerms( eng.Code, type, pub, res );

													else	// failed
														res( errors.noLicense );
												});

											else
												res( errors.noLicense );
										}

										else	// no license required
											res( eng.Code );
									});
								
								else
									res( errors.noEngine );
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
				res( errors.noPartner );
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

			function makeList(args,debug) {
				var mash = [];
				//console.log("list", args.length);
				args.forEach( arg => mash.push(arg) );
				if ( debug ) log( debug, args );
				return mash;
			}
			
			function pipe(sup, sql, job, cb) {
				const {ctx,query,path} = job;
				const {Trace} = ctx;
			
				Log(sup ? "supervised" : "unsupervised", "pipe", path);
				
				if ( sup )	// using supervisor
					sup(sql, job, pipectx => {
						if (pipectx) {  // supervisor started
							Copy(ctx,pipectx);
							pipectx.list = makeList;
							
							Each(query, (key,exp) => {		// add data-extraction keys to context
								(key+"="+exp).parseJS( pipectx, err => Log("ignore", `${key}=${exp}`) );
							});

							cb( pipectx ); 
						}

						else
							cb(null);
					});

				else	// unsupervised
					cb( ctx ) 
			}

			sql.insertJob( job, (sql,job) => { 
				pipe( sup, sql, job, ctx => { 	
					if (ctx) {
						req.query = ctx;
						ATOM.select(req, ctx => {  // run plugin
							//Log(">>pipe save=", ctx.Save );
							if ( ctx )
								if ( isError(ctx)  )
									Trace("halt bad context", ctx);

								else 
									cb( ctx, sql );
						});
					}

					else
						Trace("halt no context");
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
					if ( values.forEach )	// enumerate over array values
						values.forEach( value => {
							setCtx[ key ] = value;
							crossParms( depth+1, keys, forCtx, setCtx, cb );
						});

					else {	// set to specified value
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
		if ( query.name || query.Name )  // execute plugin
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
								interval = {
									minute: 60,
									hour: 3600,
									day: 86400,
									week: 604800,
									month: 2419200,
									year: 31449600
								},
								pipeRun = ctx.Run || {},
								pipePath = Pipe.parseURL(pipeQuery,{},{},{}).parseEMAC( ctx ) ,
								job = { // job descriptor for regulator
									qos: interval[pipeRun.every] || pipeRun.every || profile.QoS || 0 , 
									priority: 0,
									start: pipeRun.start,
									end: pipeRun.end,
									until: pipeRun.until,
									client: req.client,
									class: ctx.Name,
									credit: 100, // profile.Credit,
									name: host,
									task: `${profile.QoS}.${host}.${ctx.Name}`,
									notes: [
											"run".tag( `/${host}.run?Name=${ctx.Name}` ), 
											((profile.Credit>0) ? "funded" : "unfunded").tag( req.url ),
											"RTP".tag( `/rtpsqd.view?task=${host}` ),
											"PMR".tag( `/briefs.view?options=${host}` )
									].join(" || "),
									query: pipeQuery,
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
										
								//Log(">pipe", job.path, pipePath, pipeName, pipeType);

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

							else
							if ( pipePath.startsWith("#") ) { // dummied out - eg when boosting
								pipePlugin( null, sql, job, (ctx,sql) => {	// unsupervised pipe
									if (ctx)
										saveContext(sql, ctx);

									else
										Trace( errors.lostContext, req );
								});								
							}
							
							else
							if ( pipePath.startsWith("?") ) {	// keys only - reserved
								err = errors.badType;
							}
							
							else	// pipe is text doc
							if ( pipeDoc = TOTEM.pipeJob.txt )
								pipePlugin(pipeDoc, sql, job, (ctx,sql) => {   // place job in doc workflow
									if (ctx)
										saveContext(sql, ctx);

									else
										Trace( errors.lostContext, req );
								});

							else
								err = errors.badType;
							
							break;

						case Array:  // query contains event list
							ctx.Events = Pipe;
							pipePlugin( null, sql, job, (ctx,sql) => {
								saveContext(sql, ctx);
							});
							break;

						case Object:  
							if (Pipe.$) { // $-scripting pipe
								err = new Error("scripting not yet implemented");
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
													//if (job.Pipe)
														probeSite( `/${host}.exe?Name=${job.Name}`, info => {} );
												});
										});
									});
								});
							}

							break;
					}

					if ( err ) 
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
			msg = query.msg = `System restarting in ${delay} seconds`;

		if ( site.pocs.overlord.indexOf( req.client ) >= 0 ) {
			res( "restarting" );
			
			sysAlert(req, msg => Log( msg ) );

			setTimeout( function () {
				Trace("RESTART " + (new Date()), req, Log);
				process.exit();
			}, delay*1e3);
		}

		else
			res( errors.noPermission );
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
			msg = query.msg || "Restarting";

		if ( site.pocs.overlord.indexOf( req.client ) >= 0 ) {
			if (IO = TOTEM.IO)
				IO.sockets.emit("alert",{msg: msg, to: "all", from: TOTEM.site.title});

			Trace(msg, req, Log);
			res("Alerting");
		}

		else 
			res( errors.noPermission );
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
		Stream( actors, (act, actor, cb) => {
			Log(actor,act);
			if (cb) // add actor
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
				}, err => Trace( err || "add actor" ) );
			
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
								//Log( source, target, `MATCH (a:${src.type} {name:$src}),(b:${tar.type} {name:$tar}) MERGE (a)-[r:${topic}]-(b) ON CREATE SET r.created = timestamp() ` );
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

/*
function getProductKeys( product, cb ) {
	cb( FLEX.productKeys(product) );
} */

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
