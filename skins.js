/**
@class DEBE.Skinning
*/

var		// 3rd party
	JADE = require('jade');				//< using jade as the skinner	

var		// totem
	TOTEM = require("totem"),
	ENUM = require("enum");

function Trace(msg,req,fwd) {	// execution tracing
	"skin>".trace(msg,req,fwd);
}

const {Log,Copy,typeOf} = ENUM;

module.exports = {
	renderSkin: function (req,res) {
	/**
	@method renderSkin
	@member TOTEM
	Totem (req,res)-endpoint to render req.table using its associated jade engine. 
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/
		var 
			sql = req.sql,
			query = req.query,
			paths = TOTEM.paths,
			site = TOTEM.site,  
			error = TOTEM.errors,
			primeSkin = TOTEM.primeSkin,
			urls = site.urls,
			//routers = TOTEM.byActionTable.select,
			dsname = req.table,
			ctx = Copy(site, {  //< default site context to render skin
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
				filename: TOTEM.paths.jadeRef,  // jade compile requires
				url: req.url
			});

		function dsContext(ds, cb) { // callback cb(ctx) with skinning context ctx

			if ( extctx = primeSkin[ds] ) // if there is a ctx extender, render in ds context
				sql.serialize( extctx, {Task: ds}, ctx, cb );

			else  // render in default site context
				cb( ctx );
		}

		dsContext(dsname, ctx => {  // get skinning context for this skin

			function renderFile( file, ctx ) { 
			/**
			@private
			@method renderFile
			Render Jade file at path this to res( err || html ) in a new context created for this request.  
			**/
				try {
					JADE.renderFile( file, ctx ).Xinclude( "", html => res(html) );
				}
				catch (err) {
					Trace(err+"");
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

				//Log([query, req.search]);

				var
					cols = [],
					drops = { id:1, odbcstamp: 1};

				switch (fields.constructor.name) {
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
				//Log( ">>>>>>cols", query.cols );
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

					if (err) // render jade file
						renderFile( paths.jades+ds+".jade", ctx );

					else // render notebook
						renderNotebook( ds, type, fields, ctx );
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

			sql.forFirst( "", paths.engine, { // Probe engine
				Name: dsname,
				Enabled: 1
			}, eng => {

				if (eng)  // render jade view or notebook
					if ( eng.Type == "jade" )
						renderJade( eng.Code || "", ctx );
					
					else
						buildSchema( dsname, eng.Type, ctx );
				
				/* else
				if ( route = routers[dsname] )   // render ds returned by an engine 
					route(req, recs => { 
						//Log({eng:recs, ds:req.table});
						if (recs)
							renderNotebook( dsname, "", recs[0] || {}, ctx );

						else
							buildSchema( dsname, ctx );
					});	 */

				else  // render a table
					buildSchema( dsname, "", ctx );

			});
		});
	}
};
