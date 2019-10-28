/**
@class DEBE.Skins
Provides notebook, dataset, and engine skinning endpoints as documented in README.md.

@requires fs
@requires jade
@requires totem
@requires enum
*/

var		
	ENV = process.env,
	
	// nodejs
	FS = require("fs"),
	JADE = require('jade'),			//< using jade as the skinner	

	// totem
	TOTEM = require("totem"),
	ENUM = require("enum");

function Trace(msg,req,fwd) {	// execution tracing
	"skin".trace(msg,req,fwd);
}

const {Each,Log,Copy,typeOf,isString} = ENUM;
const {site, paths, error, primeSkin, probeSite, getIndex } = TOTEM;

const {skinContext, renderJade} = module.exports = {
	skinContext: function (sql, ctx, cb) {
		
		ctx.live = ENV.SERVICE_MASTER_URL;
		
		sql.query( "SELECT Type FROM app.engines WHERE ? LIMIT 1", {Name: ctx.name}, (err,engs) => {
			if (eng = engs[0] ) 
				ctx.type = eng.Type;
			
			else
				ctx.type = "table";
			
			sql.query( "SHOW FULL COLUMNS FROM ??", sql.reroute( ctx.name ), (err,fields) => {
				function getFiles( ctx, cb ) {
					getIndex( `./notebooks/${ctx.name}/`, files => {
						var 
							id = 1,
							Files = {
								image: {},
								artifact: [],
								misc: [],
								live: []
							},
							Batch = {
								jpg: "image",
								png: "image",
								gif: "image",
								ppt: "artifact",
								pptx: "artifact",
								txt: "artifact",
								doc: "artifact",
								pdf: "artifact",
								docx: "artifact",
								html: "live",
								default: "misc"
							};
						
						files.forEach( file => {
							var 
								path = `./notebooks/${ctx.name}/${file}`,
								parts = file.split("_"),
								num = 0,
								classif = [],
								type = "",
								title = [],
								depth = 0;
							
							parts.forEach( (part,n) => {
								switch (part) {
									case "":
										depth++;
										break;
									case "S":
									case "U":
									case "TS":
									case "C":
									case "FOUO":
									case "LIMDIS":
									case "NF":
									case "ORCON":
									case "FVEY":
									case "NATO":
										classif.push( part );
										break;
									default:
										if ( n = parseFloat(part) )
											num = n;

										else {
											var parts = part.split(".");
											title.push( parts[0] );
											type = (parts[1] || "").toLowerCase();
										}
								}
							});

							switch ( type ) {
								case "":
								case "rdp":
								case "url":		// discard
									break; 
								
								case "lnk":		// re-path it then batch it
									try {	
										FS.readFileSync( path, "utf8" ).replace( /\&(.*)\+/, (pre,goto) => {
											path = goto.replace(".\\", "/notebooks/"); // assume local link
											//Log(">>>goto", path);
										});
									}
									catch (err) { // keep as is
									}

								default:
									var stack = null;
									
									switch ( batch = Batch[type] || Batch.default ) {
										case "":		// discard
											break;
											
										case "image":
											if ( depth && num ) {
												stack = Files.image[`set${depth}`];
												if ( !stack ) stack = Files.image[`set${depth}`] = [];
											}
											break;
																								
										default:
											stack = Files[ batch ];
									}

									if ( stack )
										stack.push( {
											id: id++,
											num: num, 
											title: title.join(" "), 
											classif: (classif.length>1) ? "(" + classif.join("//") + ")" : "", 
											type: type, 
											name: file, 
											qualifiers: parts.length, 
											path: path, 
											link: title[0].tag( path ) 
										} );
									
								}
								
						});
						
						Each( Files.image, (set,files) => Files.image[set] = files.sort( (a,b) => a.num-b.num ) );
						//Log(">>>>files", Files);
						//Log(">>>>test", Files.image.get({ keys: {a: "link"}}) );
						cb(ctx, Files );
					});
				}
					
				var keys = ctx.keys = {};

				if ( err ) 
					ctx.type = "file";
				
				else
					fields.forEach( field => keys[field.File] = { type: field.Type, default: field.Default, comment: field.Comment} );

				sql.query(
					"SELECT * FROM openv.projects WHERE ? LIMIT 1", 
					{Name: ctx.name}, (err,projs) => {

					var proj = projs[0] || { JIRA: "tbd", Status: "tbd", Name: ctx.name, Title: ctx.name, Lead: "tbd" };
						
					sql.query(
						"SELECT group_concat(RAS) AS RAS FROM openv.milestones WHERE ? AND RAS", 
						{Project: ctx.name}, (err, vendors) => {

						var vendor = vendors[0] || { RAS: "none" };
							
						proj.RAS = vendor.RAS || "none";

						getFiles( ctx, (ctx,files) => {
							var 
								name = ctx.name,
								type = ctx.type,
								Name = name.toUpperCase(),
								envs = {  
									here: "/" + name,
									master: ENV.SERVICE_MASTER_URL + "/" + name,
									worker: ENV.SERVICE_WORKER_URL + "/" + name,
									totem: ENV.SERVICE_MASTER_URL,
									//nbook: ENV.SERVICE_WORKER_URL + "/" + name,
									repo: ENV.NOTEBOOK_REPO || ENV.PLUGIN_REPO || "https:repo.tbd",
									jira: ENV.JIRA || "https:jira.tbd",
									ras: ENV.RAS || "https:ras.tbd" 
								},

								ctx = Copy(site, Copy( ctx, {
									filename: paths.jadeRef,		// for jade
									query: {},	// default

									proj: proj,
									Name: Name,
									type: type,

									files: files,
									keys: keys,
									fields: fields,
									by: "NGA/R".tag( "https://research.nga.ic.gov" ),

									embed: (url,w,h) => {
										var
											keys = {},
											urlPath = url.parseURL(keys,{},{},{}),

											w = keys.w || w || 400,
											h = keys.h || h || 400,

											urlName = urlPath,
											urlType = "",
											x = urlPath.replace(/(.*)\.(.*)/, (str,L,R) => {
												urlName = L;
												urlType = R;
												return "#";
											});

										//Log("link", url, urlPath, keys);
										switch (urlType) { 
											case "jpg":  
											case "png":
												return "".tag("img", { src:`${url}?killcache=${new Date()}`, width:w, height:h });
												break;

											case "view": 
											default:
												return "".tag("iframe", { src: url, width:w, height:h });
										}
									},

									register: () => 
										"<!---parms endservice=https://myservice/" + ctx.name + "--->" 
										+ ctx.input({a:"aTest", b:"bTest"}),

									//input: tags => "<!---parms " + "".tag("&", tags || {}).substr(1) + "--->",

									reqts: {   // defaults
										js:  ["nodejs-8.9.x", "standard machine learning library".tag( "https://sc.appdev.proj.coe.ic.gov://acmesds/man" )].join(", "),
										py: "anconda-4.9.1 (iPython 5.1.0 debugger), numpy 1.11.3, scipy 0.18.1, utm 0.4.2, Python 2.7.13",
										m: "matlab R18, odbc, simulink, stateflow"
									},

									summary: "summary tbd",
									ver: "ver tbd",
									reqs: {
										distrib: "request to distribute NAME/Can you grant permission to distribute NAME?".replace(/NAME/g, Name),
										info: "request for information on NAME/Can you provide further information on NAME?".replace(/NAME/g, Name),
										help: "need help on NAME/Please provde me some help on notebook NAME".replace(/NAME/g, Name)
									},
									request: req => {
										var
											parts = (req || ctx.reqs.info || "request/need information").split("/"),
											label = parts[0] || "request",
											body = parts[1] || "request for information",
											pocs = ctx.pocs || {};

										//Log("pocs", pocs, label, body, name, req);
										return (pocs.admin||"").mailify( label, {subject: name, body: body} );
									},

									interface: () => "publish notebook to define interface",
									now: (new Date())+"",

									loopback: envs.worker + "." + type +"?endservice=" + envs.worker +".users",
									transfer: envs.worker + "." + type + "?endservice=",
									totem: envs.totem,
									
									download: envs.here + "." + type,
									status: envs.here + ".status",
									archive: envs.here + ".archive",
									suitors: envs.here + ".suitors",
									run: envs.here + ".run",
									view: envs.here + ".view",
									tou: envs.here + ".tou",
									brief: "/briefs.view?notebook=" + name,
									content: "/notebooks/" + name,
										// windows ie
										// "file://164.183.33.7/totem/notebooks/" + name,
										// windows ff
										// "file://///164.183.33.7/totem/notebooks/" + name,
										// linux
										//"file://local/service/debe/notebooks/" + name,
										
									rtp: "/rtpsqd.view?notebook=" + name,
									pub: envs.here + ".pub",
									
									jira: envs.jira + proj.JIRA,
									ras: envs.ras + proj.RAS,

									repo: envs.repo + name,
									repofiles: envs.repo + name + "/raw/master",
									relinfo: envs.master + "/releases.html?nb=" + name
								}));

								Each( ctx, (key,url) => {
									if ( url )
										if ( isString(url) ) {
											ctx["_"+key] = `%{${url}}`;
											ctx[key.toUpperCase()] = key.toUpperCase().tag( url );
											ctx[key.charAt(0).toUpperCase()+key.substr(1)] = envs.totem+"/"+url;
										}
								});

							cb(ctx);
						});
					});
				});
			});				
		});		
	},
	
	renderJade: function ( jade, ctx, cb ) { 
	/**
	@private
	@method renderJade
	Render Jade string this to res( err || html ) in a new context created for this request. 
	**/
		try {
			//cb( JADE.compile(jade, ctx) (ctx) );
			(JADE.compile(jade, ctx) (ctx)).Xinclude( "", html => cb(html) );
			//(JADE.compile(jade, ctx) (ctx)).Xinclude( "", html => html.Xfollow( "", ctx, html => cb(html) ) );
			//jade.Xkeys( ctx, jade => cb( JADE.compile( jade, ctx)(ctx) ) );
			//jade.Xkeys( ctx, jade => (JADE.compile( jade, ctx)(ctx)).Xinclude( "", html => cb(html) )  );
			//jade.Xinclude( "", ctx, jade => cb( JADE.compile(jade, ctx) (ctx) ) );
		}
		catch (err) {
			//Log("xjade", err);
			cb( err+"" );
		}
	},
		
	renderSkin: function (req,res) {
	/**
	@method renderSkin
	@member TOTEM
	Totem (req,res)-endpoint to render req.table using its associated jade engine. 
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/
		const { sql, query, table } = req;
		const { urls } = site;
		
		var 
			ctx = {  //< default site context to render skin
				name: (query.notebook || query.nb || query.project || query.task || query.option || table).toLowerCase(),
				typeOf: typeOf,
				table: table,
				dataset: table,
				//type: req.type,
				//parts: req.parts,
				action: req.action,
				//org: req.org,
				client: req.client,
				flags: req.flags,
				query: req.query,
				joined: req.joined,
				profile: req.profile,
				//group: req.group,
				//search: req.search,
				session: req.session,
				/*
				util: {
					cpu: (cpuavgutil() * 100).toFixed(0), // (req.log.Util*100).toFixed(0),
					disk: ((req.profile.useDisk / req.profile.maxDisk)*100).toFixed(0)
				},*/
				started: TOTEM.started,
				//filename: paths.jadeRef,  // jade compile requires
				url: req.url
			};

		//Log("skin>>>>> ctx=", ctx);
		
		function renderFile( file, ctx ) { 
		/**
		@private
		@method renderFile
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/

			try {
				FS.readFile( file, "utf-8", (err,jade) => {
					if (err) 
						res( err );

					else
						renderJade( jade, ctx, html => res(html) );
				})
			}
			catch (err) {
				res(  err );
			}
		}

		function renderNotebook( skinner, ctx ) { // render using plugin skin
		/**
		@private
		@method renderNotebook
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/

			var
				name = ctx.name,
				type = ctx.type,
				fields= ctx.fields,
				cols = [],
				drops = { id:1, odbcstamp: 1};

			Copy({		// keys to plugin.jade
				mode: req.type,
				uses: type ? [
					"execute".tag( `${name}.exe?Name=CASE` ),
					"run".tag( `${name}.run` ),
					"view".tag( `${name}.view` ),
					"terms".tag( `${name}.tou` ),
					"publish".tag( `${name}.pub` ),
					"usage".tag( `${name}.use` ),
					"project".tag( `${name}.proj` ),
					"archive".tag( `${name}.archive` ),
					"content".tag( `/notebooks/${name}` ),
					"download".tag( `${name}.${type}` ),
					"rtp".tag( `/rtpsqd.view?notebook=${name}` ),
					"brief".tag( `/briefs.view?notebook=${name}` ),
					"reset".tag( `${name}.reset` )
				].join(" || ") : [
					"view".tag( `${name}.view` )
				].join(" || "),
				//page: query.page,
				//refresh: query.refresh,
				//dims: query.dims,
				client: req.client,
				ds: name
			}, query);

			switch ( typeOf(fields) ) {
				case "Array":
					fields.forEach( field => {
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

							if ( key.startsWith("Save") ) qual += "hideoff" ;

							else
							if ( key.startsWith("_" ) ) qual += "off";

							//Log(key,qual);
							cols.push( key + "." + type + "." + doc + "." + qual );
						}
					});
					break;

				case "String":
					fields.split(",").forEach( field => {
						if ( field != "ID") cols.push( field );
					});	
					break;

				default:
					Each(fields, field => {
						if (field != "ID") cols.push( field );
					});	
			}

			query.cols = cols.groupify();
			/*if ( query.mode == "gbrief" ) // better to add this to site.context.plugin
				sql.query("SELECT * FROM ??.??", [req.group, query.ds], function (err,recs) {
					if (err)
						res( TOTEM.errors.badSkin );

					else {
						recs.each( function (n,rec) {
							delete rec.ID;
						});

						query.data = recs;
						pluginPath.render(req, res);
					}
				});

			else	*/

			//Log( paths.jades+"plugin.jade", query);
			renderFile( skinner, ctx );
		}		

		skinContext(sql, ctx, ctx => {

			if (ctx)  // render skin
				if ( ctx.name == ctx.table ) 	// not being spoofed				
					switch (ctx.type) {
						case "jade":
							sql.query( paths.engine, { // use skinning engine
								Name: ctx.name,
								Enabled: 1
							}, (err,engs) => {

								if ( eng = engs[0] )
									renderJade( eng.Code || "", ctx, html => res(html) );

								else
									res( errors.noEngine );
							});
							break;

						case "file":
							renderFile( paths.jades + ctx.name + ".jade", ctx );
							break;

						default:
							renderNotebook( paths.jades + "plugin.jade", ctx );
					}
			
				else	// being spoofed
					renderFile( paths.jades + ctx.table + ".jade", ctx );
			
			else
				res( errors.noEngine );
		});
	}
};
