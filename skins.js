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
const {site, paths, error, primeSkin, probeSite } = TOTEM;

const {skinContext, renderJade} = module.exports = {
	skinContext: function (nbook, prime) {
		var
			parts = nbook.split("."),
			name = parts[0] || "NoName",
			type = parts[1] || "js",
			envs = {  
				master: ENV.SERVICE_MASTER_URL + "/" + name,
				worker: ENV.SERVICE_WORKER_URL + "/" + name,
				totem: ENV.SERVICE_MASTER_URL,
				//nbook: ENV.SERVICE_WORKER_URL + "/" + name,
				repo: ENV.PLUGIN_REPO
			},
			ctx = Copy( prime || {}, {
				query: {},
				filename: paths.jadeRef,
				
				Name: name.toUpperCase(),
				name: name,
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
					js: "nodejs-8.9.x and [man-latest](https://sc.appdev.proj.coe.ic.gov://acmesds/man)",
					py: "anconda-4.9.1 (iPython 5.1.0 debugger), numpy 1.11.3, scipy 0.18.1, utm 0.4.2, Python 2.7.13",
					m: "matlab R18, odbc, simulink, stateflow"
				},
				
				summary: "summary tbd",
				//reqts: infokeys.envs[type] || "reqts tbd",
				ver: "ver tbd",
				reqs: {
					info: "request for information/please provide some information",
					help: "need help/please provde me some help on this notebook"
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
				
				loopback:  envs.worker + "." + type +"?endservice=" + envs.worker +".users",
				transfer: envs.worker + "." + type + "?endservice=",
				status: envs.master + ".status",
				md: envs.master + ".md",
				suitors: envs.master + ".suitors",
				run: envs.master + ".run",
				view: envs.master + ".view",
				tou: envs.master + ".tou",
				pub: envs.master + ".pub",
				imgtest: envs.totem + "/shares/a1.jpg",
				//worker: envs.worker,
				//master: envs.master,
				totem: envs.totem,
				//totem: envs.master,  // generally want these set to the master on 8080 so that a curl to totem on 8080 can return stuff
				repo: envs.repo + name,
				repofiles: envs.repo + name + "/raw/master",
				relinfo: envs.master + "/releases.html?nbook=" + nbook
			}, ".");

		Each( ctx, (key,url) => { 
			if ( isString( url ) ) ctx["_"+key] = "%{" + url + "}" ;
		});

		return ctx;
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
			nb = query.notebook || query.nb || query.project || query.task,
			dsname = table,
			ctx = Copy( nb ? skinContext( nb ) : {}, Copy(site, {  //< default site context to render skin
				typeOf: typeOf,
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
				//group: req.group,
				//search: req.search,
				session: req.session,
				/*
				util: {
					cpu: (cpuavgutil() * 100).toFixed(0), // (req.log.Util*100).toFixed(0),
					disk: ((req.profile.useDisk / req.profile.maxDisk)*100).toFixed(0)
				},*/
				started: TOTEM.started,
				filename: paths.jadeRef,  // jade compile requires
				url: req.url
			}) );

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

		function renderNotebook( name, type, fields, ctx ) { // render using plugin skin
		/**
		@private
		@method renderNotebook
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/

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
					"download".tag( `${name}.${type}` ),
					"brief".tag( `/briefs.view?options=${name}` ),
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

			var
				cols = [],
				drops = { id:1, odbcstamp: 1};

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
			renderFile( paths.jades+"plugin.jade", ctx );
		}		

		function buildSchema( ds, type, ctx ) {
		/**
		@private
		@method buildSchema
		Render table at path this to res( err || html ) in a new context created for this request.  
		**/			
			sql.query( 
				"SHOW FULL COLUMNS FROM ??", 
				sql.reroute( ds ), 
				(err,fields) => {

				//Log(err, fields);
					
				if (err) // render jade file
					renderFile( paths.jades+ds+".jade", ctx );

				else // render notebook
					renderNotebook( ds, type, fields, ctx );
			});	
		}

		sql.forFirst( "", paths.engine, { // Probe engine
			Name: dsname,
			Enabled: 1
		}, eng => {

			if (eng)  // render jade view or notebook
				if ( eng.Type == "jade" )
					renderJade( eng.Code || "", ctx, html => res(html) );

				else
					buildSchema( dsname, eng.Type, ctx );

			else  // render a table
				buildSchema( dsname, "", ctx );

		});
	}
};
