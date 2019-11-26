// UNCLASSIFIED 

/**
@class DEBE
Provides notebooks, engines, site skinning and protection layers over the TOTEM web service
as documented in README.md.

@requires child_process
@requires fs
@requires stream

@requires i18n-abide
@requires socket.io
@requires socket.io-clusterhub
@requires jade@1.9.0
@requires jade-filters
@requires optimist
@requires tokml
@requires mathjax-node
@requires neo4j

@requires flex
@requires totem
@requires atomic
@requires geohack
@requires man
@requires randpr
@requires enum
@requires reader
*/

var 									
	// globals
	ENV = process.env,
	WINDOWS = process.platform == 'win32',		//< Is Windows platform

	// totem bindings required before others due to dependent module issues
	READ = require("reader"),		// partial config of NLP now to avoid string prototype collisions
	FLEX = require("flex"),
	
	// NodeJS modules
	CP = require("child_process"), 		//< Child process threads
	STREAM = require("stream"), 		//< pipe streaming
	FS = require("fs"), 				//< filesystem and uploads
	
	// 3rd party modules
	NEO = require("neo4j"),			// light-weight graph database
	ODOC = require("officegen"), 	//< office doc generator
	LANG = require('i18n-abide'), 		//< I18 language translator
	ARGP = require('optimist'),			//< Command line argument processor
	TOKML = require("tokml"), 			//< geojson to kml convertor
	
	// include modules
	EAT = require("./ingesters"),	
	PIPE = require("./pipes"),
	END = require("./endpts"),
	SKIN = require("./skins"),
	DOG = require("./dogs"),
	BLOG = require("./blogs"),
	
	// totem modules		
	ATOM = require("atomic"), 
	TOTEM = require("totem"),
	$ = require("man"),
	GEO = require("geohack"),
	ENUM = require("enum");

const { Copy,Each,Log,isKeyed,isString,isFunction,isError,isArray,typeOf } = ENUM;
const { sqlThread, getFile, probeSite } = TOTEM;
const { pipeStream, pipeImage, pipeJson, pipeDoc, pipeBook, pipeAOI } = PIPE;
const { 
	getDoc,
	exePlugin, simPlugin,
	exportPlugin, importPlugin, statusPlugin, usersPlugin, suitorsPlugin, usagePlugin, getPlugin, 
	retractPlugin, extendPlugin, docPlugin, 
	matchPlugin, touPlugin, trackPlugin, publishPlugin,
	sysGraph, sysRestart, sysIngest, sysDecode, sysAgent, sysAlert, sysStop } = END;
const { renderSkin } = SKIN;

function Trace(msg,req,fwd) {
	"debe".trace(msg,req,fwd);
}

var
	DEBE = module.exports = TOTEM;

Copy({
	pipeSuper: {		//<  pipe supervisor by pipe type
		stream: pipeStream,
		export: pipeStream,
		nitf: pipeImage,
		png: pipeImage,
		jpg: pipeImage,
		json: pipeJson,
		txt: pipeDoc,
		xls: pipeDoc,
		html: pipeDoc,
		odt: pipeDoc,
		odp: pipeDoc,
		ods: pipeDoc,
		pdf: pipeDoc,
		xml: pipeDoc,
		nb: pipeBook,
		db: pipeBook,
		"": pipeBook,
		aoi: pipeAOI
	},
	
	reroute: {  //< sql table routers for providing secure access
		"engines": ctx => { // protect engines 
			//Log("<<<", ctx);
			if ( DEBE.site.pocs.overlord.indexOf(ctx.client.toLowerCase()) >= 0 ) // allow access
				if ( false ) { // access via licensed copy
					ctx.index["Nrel:"] = "count(releases._License)";
					ctx.index[ctx.from+".*:"] = "";
					ctx.join = `LEFT JOIN ${ctx.db}.releases ON (releases._Product = concat(engines.name,'.',engines.type)) AND releases._Partner='${ctx.client}'`;
					ctx.where["releases.id:"] = "";
					return "app.engines";
				}
				
				else // direct access
					return "app.engines";
				
			else	// block access
				return "block.engines";
		},
		
		"masters": ctx => "block.masters",
		
		"rtpsecs": ctx => "openv.rtpsecs",
		
		"syslogs": ctx => "openv.syslogs",
		
		"faqs": ctx => {
			if ( set = ctx.set ) {
				set._By = ctx.client;
				set._Dirty = true;
			}
			return "openv.faqs";
		}
	},

	blogContext: BLOG,		//< blogging / skinning context
		
	onStartup: function () {	//< runs when server starts
		var
			site = DEBE.site,
			pocs = site.pocs,
			clearGraphDB = false,			
			sendMail = FLEX.sendMail;
		
		sqlThread( sql => {
			// notify admin service started
			if (pocs.admin)
				sendMail({
					to: pocs.admin,
					subject: site.title + " started", 
					body: "Just FYI"
				}, sql );

			// reset file watchers
			sql.query( "SELECT File FROM openv.watches WHERE substr(File,1,1) = '/' GROUP BY File", [] )
			.on("result", link => {
				END.autorun.set( link.File );
			});	
		
			// clear graph database
			if (clearGraphDB) {
				//sql.query("DELETE FROM app.nlpactors");
				//sql.query("DELETE FROM app.nlpedges");
			}
		});
		
		if (neodb = DEBE.neodb) {
			if (false) // test connection
				neodb.cypher({
					query: 'MATCH (u:User {email: {email}}) RETURN u',
					params: {
						email: 'alice@example.com',
					},
				}, (err, results) => {
					if (err) {
						Trace( err );
						DEBE.neodb = null;
					}
					else {
						var result = results[0];
						if (!result) {
							Log('neodb test returned no records.');
						} 
						else {
							var user = result['u'];
							Log("neodb test", JSON.stringify(user, null, 4));
						}
					}
				});

			if (clearGraphDB) // clear db on startup
				neodb.cypher({
					query: "MATCH (n) DETACH DELETE n"
				}, err => {
					Trace( err || "CLEAR GRAPH DB" );
				});  
		}			
	},
		
	onUpdate: function (sql,ds,body) { //< runs when dataset changed
		sql.hawk({Dataset:ds, Field:""});  // journal entry for the record itself
		if (false)   // journal entry for each record key being changed
			for (var key in body) { 		
				sql.hawk({Dataset:ds, Field:key});
				sql.hawk({Dataset:"", Field:key});
			}
	},
	
	initialize: function () {	//< initialize and configure
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

		function initIFS(cb) {
		/**
		 * @method initIFS
		 * @private
		 * @member DEBE
		 * Initialize the FLEX and ATOM interfaces
		 */

			["select", "delete", "insert", "update", "execute"].forEach( crud => {
				DEBE.byAction[crud] = FLEX[crud];
			});

			if (cb) cb();	
		}

		initENV( function () {  // init the global environment
		initSES( function () {	// init session handelling
		initIFS( function () {	// init interfaces

			sqlThread( sql => {
				Trace("TRAIN NLPs");
				sql.query('SELECT * FROM app.nlprules WHERE Enabled', (err,rules) => {
					READ.train( rules );
				});
			});
			
			FLEX.config({ 		// table emulation
				sqlThread: sqlThread,
				//emitter: DEBE.IO ? DEBE.IO.sockets.emit : null,
				//skinner: JADE,
				probeSite: TOTEM.probeSite,
				getIndex: TOTEM.getIndex,
				createCert: TOTEM.createCert,
				diag: TOTEM.diag,
				site: TOTEM.site						// Site parameters
			});

			GEO.config({	// voxelizing geo surfaces
				//source: "",
				taskPlugin: null,
				sqlThread: sqlThread,
				probeSite: TOTEM.probeSite
			});

			$.config({		// matrix manipulator
				sqlThread: sqlThread,
				runTask: TOTEM.runTask,
				probeSite: TOTEM.probeSite
			});

			ATOM.config({		// plugin manager
				sqlThread: sqlThread,
				cores: TOTEM.cores,
				plugins: Copy({   // share selected FLEX and other modules with engines
					$: $,
					$NLP: READ.score,
					$GEO: GEO,
					$TASK: TOTEM.runTask,
					$SQL: sqlThread,
					$JIMP: $.JIMP,
					$NEO: DEBE.neodb ? DEBE.neodb.cypher : null
				}, $ )
			});

			DEBE.neodb = ENV.NEO4J ? new NEO.GraphDatabase(ENV.NEO4J) : null;

			if ( neodb = DEBE.neodb )
				neodb.cypher({	// test connection
					query: "MATCH (n) RETURN n"
				}, err => {
					Trace( err ? "NEODB DISCONNECTED" : "NEODB CONNECTED" );
					if (err) DEBE.neodb = null;
					
					DEBE.onStartup();					
				});
				
			else
				DEBE.onStartup();
			
			if ( jades = DEBE.paths.jades && false )
				DEBE.getIndex( jades, files => {  // publish new engines
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
				});

		}); }); }); 
	},
		
	dogs: DOG,		// watchdogs
	
	diag: {  //< reserved for self diag parms
		status: "", 
		counts: {State: ""}
	},

	"reqFlags." : {  //< endpoint request flags
		
		"traps.": {  // TRAP=name flags can modify the request flags
			save: function (req) {  //< _save=name retains query in named engine
				var 
					sql = req.sql,
					cleanurl = req.url.replace(`_save=${req.flags.save}`,"");

				Trace(`PUBLISH ${cleanurl} AT ${req.flags.save} FOR ${req.client}`, req);sql
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
		
		blog: (recs,req,res) => {  //< renders dataset records
			const { flags, table } = req;
			if (key = flags.blog)
				recs.blogify( req, key, "/"+table, res );
			else
				res(recs);
		},
		
		calc: (recs,req,res) => {
			const { flags } = req;
			Log(">>>ctx calc", flags.calc);
			var 
				ctx = {},
				rec = recs[0] || {};
			
			Each(rec, key => ctx[key] = recs.get(key) );
			
			const { calc } = $( "calc="+flags.calc, ctx );
			
			if ( calc )
				if ( typeOf(calc) == "Object" )
					Each(calc, (key,val) => calc[key] = $.list(val) );
			
			//Log(">>>>ctx", calc );
			res( $.squeeze(calc) );
		}
		
	},
											 
	// router cofiguration
		
	"byFilter." : { //< endpoint types to filter dataset recs on specifed req-res thread
		
		kml: (recs,req,res) => {  //< dataset.kml converts to kml
			res( TOKML({}) );
		},
		
		flat: (recs,req,res) => { //< dataset.flat flattens records
			recs.forEach( (rec,n) => {
				var rtns = new Array();
				for (var key in rec) rtns.push( rec[key] );
				recs[n] = rtns;
			});
			res( recs );
		},
		
		txt: (recs,req,res) => { //< dataset.txt convert to text
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

		json: (recs,req,res) => {
			res(recs);
		},
		
		/*
		stat: (recs,req,res) => { // dataset.stat provide info
			var 
				table = req.table,
				uses = [
					"db", "xml", "csv", "txt", "schema", "view", "tree", "flat", "delta", "nav", "html", "json",
					"view","pivot","site","spivot","brief","gridbrief","pivbrief","run","plugin","runbrief","proj",
					"exe", "stat"];

			uses.forEach( (use,n) => {
				uses[n] = use.tag( "/"+table+"."+use );
			});
			
			req.sql.query("DESCRIBE app.??", [table], function (err, stats) {
				
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
			
		}, */
		
		html: (recs,req,res) => { //< dataset.html converts to html
			res( DEBE.site.gridify( recs ).tag("table", {border: "1"}) );
		},

		// MS office doc types
		xdoc: genDoc,
		xxls: genDoc,
		xpps: genDoc,
		xppt: genDoc,
		
		tree: (recs,req,res) => { //< dataset.tree treeifies records sorted with _sort=keys
			var 
				flags = req.flags,
				query = req.query;
			
			if (sorts = flags.sort)			
				res([{
					name: "root", 
					size: 1, 
					nodes: recs.treeify( 0, recs.length, 0, sorts.split(",") )
				}]);
			
			else
				res( new Error("missing sorts=key,... flag") );
		},
		
		schema: (recs,req,res) => { //< dataset.schema 
			var 
				flags = req.flags,
				query = req.query,
				src = ("/"+req.table).tag("?",{name:query.name});
			
			res( recs.schemafy( src ) );
		},
		
		delta: (recs,req,res) => { //< dataset.delta adds change records from last baseline
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

		nav: (recs,req,res) => {  //< dataset.nav to navigate records pivoted with _browse=keys

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
						volumeid: "app", // rec.group,
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
						volumeid: "app", // rec.group
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

	"byArea.": { //< routers for endpoints at /AREA/file ...
		jades: TOTEM.requestFile,
		west: TOTEM.requestFile,
		east: TOTEM.requestFile,
		notebooks: TOTEM.requestFile
	},

	"byTable.": {	//< routers for endpoints at /TABLE
		anet: sysGraph,
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
		// doc generators
		xpdf: getDoc,
		xjpg: getDoc,
		xgif: getDoc,
		
		// skins
		proj: renderSkin,
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
		status: statusPlugin,
		stat: statusPlugin,
		
		suitors: matchPlugin,
		match: matchPlugin,
		
		users: usersPlugin,
		
		track: trackPlugin,
		licence: trackPlugin,
		//release: trackPlugin,
		
		exe: exePlugin,
		pub: publishPlugin,
		publish: publishPlugin,
		
		js: getPlugin,
		py: getPlugin,
		m: getPlugin,
		me: getPlugin,
		jade: getPlugin,
		
		export: exportPlugin,
		import: importPlugin,
		
		doc: docPlugin,
		md: docPlugin,
		tou: docPlugin,
		
		use: usagePlugin,
		usage: usagePlugin,
		help: usagePlugin,
		
		reset: simPlugin,
		step: simPlugin,
		
		addkey: extendPlugin,
		add: extendPlugin,
		
		subkey: retractPlugin,
		sub: retractPlugin
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
		/*
		rtp: {  // context keys for swag.view
			projs: "select * from openv.milestones order by SeqNum,Num",
			faqs: "select * from openv.faqs where least(?) order by SeqNum"
		}
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
		
		json: function(recs) {  //< jsonize dataset
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
			if ( ! fn.startsWith("/") ) fn = "/shares/hover/"+fn;
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
		noPermission: new Error( "You do not have permission to restart the service" ),
		badType: new Error("bad type"),
		lostContext: new Error("pipe lost context"),
		noPartner: new Error( "endservice missing or did not respond with transition partner" ),
		noAttribute: new Error( "undefined engine attribute" ),
		noLicense: new Error("license could not be created"),
		noEngine: new Error( "no such engine" ),
		badEngine: new Error( "improper engine" ),
		noGraph: new Error( "graph db unavailable" ),
		badAgent: new Error("bad agent request"),
		noIngest: new Error("invalid/missing ingest dataset"),
		noSkin: new Error("no such skin"),
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
	
	"paths.": {  //< append paths to things
		//default: "home.view",
		gohome: "Totem".tag("/fan.view?src=info&w=1000&h=600")  + " is protecting the warfighter from bad data",
		
		engine: "SELECT * FROM app.engines WHERE least(?,1) LIMIT 1",
		jades: "./jades/",		// path to default view skins
		jadeRef: "./jades/ref.jade",	// jade reference path for includes, exports, appends
		
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
				tou: "text/html",
				db: "application/json",
				pub: "",
				doc: ""
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
	probono: true,  //< enable to run plugins unregulated
		
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
		
		GEO.ingestFile(sql, filePath, fileID, aoi => {			
			Log("INGESTED", aoi);
		});
	},
	
	/**
	@cfg {Boolean}
	@member DEBE
	Enable for double-blind testing 
	*/
	blindTesting : false		//< Enable for double-blind testing (eg make FLEX susceptible to sql injection attacks)
}, DEBE, ".");

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
	sqlThread( sql => {
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

[  // array prototypes
	function groupify() {
		return this.splitify("_").joinify();
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
			fetchBlog = ( rec, cb ) => {
				if ( md = rec[key] + "" ) {
					md.Xblogify(req, ds.tag("?", { 	// tag ds with source record selector
						name: (rec.Pipe||"").startsWith("{")
							? rec.Name + "-%"	// pipe defines a monte-carlo so request them all
							: rec.Name	// pipe defines a simple path
					}), {}, rec, html => cb( 
						flags.kiss
							? html 	// keep if simple
							: html + [	// add by-line
							"<br>",
							site.title.tag( `${url}/fan.view?src=info&w=4000&h=600` ),
							"schema".tag( `${url}/fan.view?src=${ds}&name=${rec.Name}&w=4000&h=600` ),
							"run".tag( `${url}${ds}.exe?Name=${rec.Name}` ),
							"edit".tag( `${url}${ds}.view` ),
							"publish".tag( `${url}${ds}.pub` ),
							"tou".tag( `${url}${ds}.tou` ),
							(new Date().toDateString()) + "",
							( req.client.match( /(.*)@(.*)/ ) || ["",req.client] )[1].tag( "email:" + req.client )
						].join(" ")
					) ); 
				}
				
				else
					cb( "empty" );
			};

		recs.serialize( fetchBlog, (rec, blog) => {
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

			//Log("isobj", isKeyed(store), store.constructor.name );
			
			if ( isKeyed(store) ) // at an object node
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
			if ( isArray(store) ) { 
				var 
					N = store.length,
					nodeName = "[" + N + "]",
					nodePath = (path || "") + nodeName,
					node = { 
						name: nodeName,
						size: 10,
						doc: nodePath.tag( cb(nodePath) ),
						children: store[0] ? nodeify( store[0], nodePath, cb ) : null
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
	Return a tree = {name,weight,nodes} from records having been sorted on keys=[key,...]
	*/
		var	
			recs = this,
			key = keys[level],
			len = 0,
			rec = recs[idx] || {},
			pos = idx, end = idx+kids,
			tar = [];

//Log([level,keys,ref,idx]);

		if (key)
			for (var ref = rec[key]; pos < end; ) {
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
		
		Object.keys(src).forEach( key => {
			var list = src[key];
			
			if ( isString(list) )
				rtn.push( list );
			
			else
				try {
					rtn.push( cb 
						? cb( key, list ) 
						: (key || "ro") + "(" + list.joinify() + ")" 
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
		this.forEach( key => {
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
			if ( label ) 
				if ( link = refs[index] || label.toLowerCase() )
					switch (link) {
						case "*":
							rtn.push( label );
							break;

						default:
							if ( ! link.startsWith("/") ) {
								link = "/" + link;
								if ( ! link.startsWith(".") ) link += ".view";
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

						var row = "", intro = true;
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

/**
@class DEBE.Utilities
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
		DEBE.config({
			onFile: {
				"./uploads/": function (sql, name, path) {  // watch changes to a file				

					sql.forFirst(  // get client for registered file
						"UPLOAD",
						"SELECT ID,Client,Added FROM app.files WHERE least(?) LIMIT 1", 
						{Name: name}, file => {

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
										DEBE.ingestFile(sql, path, name, file.ID, aoi => {
											//Trace( `CREDIT ${client}` );

											sql.query("UPDATE app.profiles SET Credit=Credit+? WHERE Client=?", [aoi.snr, client]);

											if (false)  // put upload into LTS - move this to file watchDog
												CP.exec(`zip ${path}.zip ${path}; rm ${path}; touch ${path}`, err => {
													Trace(`PURGED ${name}`);
												});
										});
									});

								}
							});
						}
					});
				}
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
		DEBE.config({
			riddles: 10,
			"byTable.": {
				wfs: function (req,res) {
					res("here i go again");

					TOTEM.probeSite(ENV.WFS_TEST, data => {
						Log(data);
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
		DEBE.config({
		}, err => {
			Trace( err || "Stateful network flow manger started" );
		});
		break;
		
	case "D4":
		function readFile(sql, path, cb) {
			sql.beginBulk();
			READ.readers.xls( "./stores/test.xls", rec => { 
				if (rec) 
					cb(rec,sql);
				
				else 
					sql.endBulk();
			});
		}
			
		DEBE.config({
		}, err => {
			DEBE.sqlThread( sql => {
				var recs = 0, now = new Date();
				readFile( sql, "./stores/test.xls", (rec,sql) => {
					if ( ++recs<5 ) {
						var 
							doc = (rec.doc || rec.Doc || rec.report || rec.Report || "")
									.replace( /\n/g, " ")
									.replace( /\&\#10;/g, " "),

							docs = doc				
									.match( /(.*)TEXT:(.*)COMMENTS:(.*)/ ) || [ "", "", doc, ""],

							text = "";

						docs[2].replace( /\.  /g, "\n").replace( /^[0-9 ]*\. \(.*\) (.*)/gm, (str,txt) => text += txt + ".  " );

						sql.query("INSERT INTO app.docs SET ?", {
							Reported: rec.reported || rec.Reported || now,
							Name: rec.reportID || ("tbd-"+recs),
							Pipe: JSON.stringify( text )
						}, err => Log("add", err) );
					}
				});
			});
		});
		break;
		
	case "?":
		Trace("unit test D1-D3 available");
}

// UNCLASSIFIED
