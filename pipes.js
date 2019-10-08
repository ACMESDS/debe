/**
@class DEBE.Pipes

Provide a (stream, image, etc) PIPE(sql,job,cb) for DEBE plugins.   Each PIPE will callback 

	cb(data,job) 
	
with a data object suitable for the specific pipe.  The PIPE may optionally regulate the job using sql.insertJob.  If the PIPE needs to 
save its data (e.g. when it supervising a workflow), it will callback 

		cb(data, job, (ctx,save) => { 
			save( data, ctx );		// save its data under plugin context ctx
		});

The pipe job contains:

		qos: ms job regulation interval
		priority: 0, 1, ... job prirority
		client: "client name"
		class: "name of pipe"
		credit: >=0 remaining job credits
		name: "name of plugin"
		task: "plugin usecase"
		notes: ".... notes"
		query: {...} query parms
		path: "/dataset.type?..." pipe path
		ctx: {...} plugin context keys
*/
var		// nodejs
	CP = require("child_process"), 		//< Child process threads
	STREAM = require("stream"), 		//< pipe streaming
	FS = require("fs"); 				//< filesystem and uploads

var		// totem
	READ = require("reader"),		// partial config of NLP now to avoid string prototype collisions
	ENUM = require("enum"),
	TOTEM = require("totem"),
	GEO = require("geohack"),
	$ = require("man");

function Trace(msg,req,fwd) {	// execution tracing
	"pipe>".trace(msg,req,fwd);
}

const { Copy } = ENUM;
const { sqlThread, uploadFile, getFile, probeSite } = TOTEM;
const { getVoxels } = GEO;

module.exports = {
	pipeStream: function (log, sql, job, cb) {
		FS.open( "."+job.path, "r", (err, fd) => {
			if (err) 
				cb(null);

			else {
				var 
					evs = [],
					rem = "",
					src = FS.createReadStream( "", { fd:fd, encoding: "utf8" }),
					sink = new STREAM.Writable({
						objectMode: true,
						write: function (recs,en,cb) {
							(rem+recs).split("\n").forEach( rec => {
								if (rec)
									try {
										evs.push( JSON.parse(rec) );
									}
									catch (err) {
										rem = rec;
									}
							});
							cb(null);  // signal no errors
						}
					});

				sink
					.on("finish", () => {
						log("streamed", evs.length);
						cb( {$: evs} );
					})
					.on("error", err => cb(null) );

				src.pipe(sink);  // start the pipe
			}
		});		
	},

	pipeImage: function(log, sql, job, cb) {
		$.JIMP.read( "."+ job.path )
			.then( img => { 
				log("image", img.bitmap.height, img.bitmap.width);
				img.readPath = path;
				cb( {$:img} ); 
				return img; 
			} )
			.catch( err => cb(null) );	
	},

	pipeJson: function(log, sql, job, cb) { // pipe json data with callback cb(json,job) || cb(null)
		//log(">pipe json", job.path.tag("?", job.query) );
		probeSite( job.path.tag("?", job.query), info => cb( {$: info.parseJSON( null )} ) );
	},

	pipeDoc: function(log, sql, job, cb) { // pipe nlp docs with callback cb(doc,job) || cb(null)		
		var
			path = job.path,
			ctx = job.ctx,
			scoreDoc = READ.score,
			use = ctx.Method ? READ.nlps[ctx.Method] : null;

		//log("use",  ctx.Method, use );
		if ( path.startsWith("/") )	// supervise doc at specified file path
			READ.readFile( "."+path, rec => {
				//log( rec );
				if (rec) 
					if ( rec.doc ) 
						if ( use )
							scoreDoc( rec.doc, [use], metrics => cb({$:rec.doc, $$:metrics}) );
						else
							cb({$:rec.doc});

					else 
						log("skip empty doc");

				else
					log("all docs read");
			});

		else // doc is the path
			if (use)
				scoreDoc( path, [use], metrics => cb({$:path, $$:metrics}) );
			else
				cb({$:rec.doc});
	},

	pipeDB: function(log, sql, job, cb) {  // pipe database source with callback cb(rec,job) || cb(null)
		var parts = job.path.substr(1).split(".");

		sql.query( isEmpty(job.query)
				? "SELECT * FROM app.??"
				: "SELECT * FROM app.?? WHERE least(?,1)", [parts[0], job.query] )

			.on( "result", rec => cb( {Rec: rec} ) )
			.on( "error", err => cb(null) );
	},

	pipeAOI: function(log, sql, job, cb) {	// stream indexed events or chips through supervisor 
		getFile( job.client, job.path, file => {
			function chipFile( file, job ) { 
				//log( "chip file>>>", file );
				var ctx = job.ctx;

				ctx.File = file;
				getVoxels(sql, job.query, file, meta => {  // process voxels over queried aoi
					ctx.meta = meta;

					sql.insertJob( job, job => {  // put voxel into job regulation queue
						function getImage(chips, job, cb) {
							chips.get( "wms", function image(img) {
								//log("wms recover job", job.ctx.Method);
								cb(img, job);
							});
						}

						var
							ctx = job.ctx, 		 // recover job context
							meta = ctx.meta,
							file = meta.File,
							chips = meta.Chips,
							evs = meta.Events;

						//log(">>>chips", chips);
						if (chips)   // place chips into chip supervisor
							getImage( chips, job, (img,job) => {
								var ctx = job.ctx;
								//log(">>>chip ctx", ctx);
								ctx.Image = img;
								cb( [], job );
							});

						else
						if (evs) {		// run voxelized events thru event supervisor
							var
								supervisor = new RAN({ 	// learning supervisor
									learn: function (supercb) {  // event getter callsback supercb(evs) or supercb(null,onEnd) at end
										var 
											supervisor = this;

										//log("learning ctx", ctx);

										evs.get( "t", evs => {  // route events thru supervisor, run plugin, then save supervisor logs
											Trace( evs 
												  ? `SUPERVISING voxel${ctx.Voxel.ID} events ${evs.length}` 
												  : `SUPERVISED voxel${ctx.Voxel.ID}` );

											if (evs) // feed supervisor
												supercb(evs);

											else // terminate supervisor and start engine
												supercb(null, function onEnd( flow ) {  // attach supervisor flow context
													ctx.Flow = flow; 
													ctx.Case = "v"+ctx.Voxel.ID;
													Trace( `STARTING voxel${ctx.Voxel.ID}` );

													cb( {}, job, (ctx,save) => {
														supervisor.end( ctx.Save || [], logs => {
															save(logs, ctx);
														});
													});
												});	
										});
									},  

									N: query.actors || file._Ingest_Actors,  // ensemble size
									keys: query.keys || file.Stats_stateKeys,	// event keys
									symbols: query.symbols || file.Stats_stateSymbols || file._Ingest_States,	// state symbols
									steps: query.steps || file._Ingest_Steps, // process steps
									batch: query.batch || 0,  // steps to next supervised learning event 
									trP: {},	// transition probs
									filter: function (str, ev) {  // filter output events
										switch ( ev.at ) {
											case "batch":
												//log("filter", ev);
											case "config":
											case "end":
												str.push(ev);
										}
									}  
								});

							supervisor.pipe( stats => { // pipe supervisor to this callback
								Trace( `PIPED voxel${ctx.Voxel.ID}` );
							}); 
						}
					});	
				});
			}

			function restoreFile( file, job, cb ) {
				CP.exec("", () => {  //<< fix: add script to copy and unzip from S3 buckets
					Trace("RESTORING "+file.Name);
					cb(file,job);
					thread( sql => {
						sql.query("UPDATE app.files SET _State_Archived=false WHERE ?", {ID: file.ID});
						sql.release();
					});
				});
			}										

			["stateKeys", "stateSymbols"].parseJSON(file);

			if (file._State_Archived) 
				restoreFile( file, job, (file, job) => chipFile(file, job) );

			else
				chipFile( file, job );
		});
	}

};
