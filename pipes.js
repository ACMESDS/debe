// UNCLASSIFIED
/**
@requires child_process
@requires fs
@requires randpr
@requires reader
@requires man
@requires totem
@requires geohack

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

var
	READ = require("reader"),
	FS = require("fs"),
	CP = require("child_process"), 	
	GEO = require("geohack"),
	TOTEM = require("totem"),
	ENUM = require("enum"),
	$ = require("man"),
	RAN = require("randpr");

const { Copy,Each,Log,isObject,isString,isFunction,isError,isArray } = ENUM;
const { getVoxels } = GEO;
const { getFile, getSite, thread } = TOTEM;

var PIPE = module.exports = {
	config: function(opts) {
		Copy( opts || {}, PIPE );
	},
	
	pipeStream: function(sql, job,cb) { // pipe data from streamed file
		sql.insertJob( job, job => { 
			function getEvents(job, cb) {
				FS.createReadStream("."+job.path,"utf8").get( "", evs => cb( {evs: evs}, job ) );
			}

			getEvents( job, (evs,job) => cb(evs,job) );
		});
	},

	pipeImage: function(sql,job,cb) {   // run image scripting pipe
		sql.insertJob( job, job => { 
			function getImage( job, cb) {

				function readFile(path,cb) {	// read and forward jpg to callback
					$.IMP.read( "."+ path )
					.then( img => { 
						Log("read", path, img.bitmap.height, img.bitmap.width);
						img.readPath = path;
						cb(img); 
						return img; 
					} )
					.catch( err => Log(err) );
				}

				var
					path = job.path,
					ctx = job.ctx,
					query = job.query,
					data = {},
					firstKey = "";

				for (var key in query)  // first key is special scripting-with-callback key
					if ( !firstKey ) {
						firstKey = key;

						`read( path, img => cb( ${query[key]} ) )`
						.parseJS( Copy(ctx, { // define parse context
							read: readFile,
							path: path,
							cb: rtn => {
								data[firstKey] = rtn;
								query[firstKey] = firstKey;
								cb( data, job );
							}
						}) );
					}  

				if ( !firstKey ) readFile(path, img => cb( {Image:img}, job) );
			}

			getImage( job, (data,job) => cb(data,job) );
		});	
	},

	pipeJson: function(sql,job,cb) { // send raw json data to the plugin
		sql.insertJob( job, job => { 
			function getEvents(job, cb) {
				// Log(">>fetch", path);
				getSite( job.path, null, info => cb( info.parseJSON( {} ), job ) );
			}

			getEvents( job, (evs,job) => cb(evs,job) );
		});
	},

	pipeDoc: function(sql,job,cb) { // nlp pipe
		function sumScores(scores, metrics) {
			var 
				entities = metrics.entities,
				count = metrics.count,
				ids = metrics.ids,
				topics = metrics.topics;
				//dag = metrics.dag;

			scores.forEach( score => {
				/*
				if ( targetid = ids.actors[score.actors[score.actors.length-1]] )
					score.ants.forEach( ant => {
						dag.add( ids.actors[ant], targetid, score.sentiment );
					});  */

				/*
				if ( score.level > metrics.level ) {
					metrics.level = score.level;
					metrics.topic = score.topic;
				}  */

				metrics.sentiment += score.sentiment;
				//for (var n=0,rel=score.relevance,N=rel.length; n<N; n++)  if (rel.charAt(n) == "y") metrics.relevance++;

				metrics.relevance += score.relevance;
				metrics.weight += score.weight;
				metrics.agreement += score.agreement;

				score.actors.forEach( actor => {
					if ( !entities.addString( "Actor:"+actor ) ) {
						ids.actors[actor] = count.actors++;
						metrics.actors.push(actor);
					}
				});

				score.links.forEach( link => {
					if ( !entities.addString( "Link:"+link ) ) {
						ids.links[link] = count.links++;
						metrics.links.push(link);
					}
				});	

			}); 

		}

		function ldaDoc(doc, topics, terms, cb) {	// laten dirichlet doc analysis
			var docs = doc.replace(/\n/gm,"").match( /[^\.!\?]+[\.!\?]+/g );
			cb( LDA( docs , topics||2, terms||2 ) );
		}

		function anlpDoc(frag, scores) {	// homebrew NER

			var 
				rubric = READ.spellRubric,
				classif = READ.classif,
				paths = READ.paths,
				checker = READ.checker, 
				analyzer = READ.analyzer,
				tokenizer = READ.tokenizer,
				stemmer = READ.stemmer,
				rules = READ.rules,
				lexicon = READ.lexicon,
				tagger = READ.tagger,

				dag = metrics.dag,
				freqs = metrics.freqs,
				scores = metrics.scores,
				topics = metrics.topics;

			var 
				tokens = tokenizer.tokenize(frag),
				sentiment = analyzer.getSentiment(tokens),
				tags = tagger.tag(tokens).taggedWords,
				stems = [],
				relevance = "",
				links = [],
				actor = "",
				actors = [],
				classifs = [],
				agreement = 0,
				weight = 0;

			classif.forEach( (cls,n) => classifs[n] = cls.getClassifications(frag) );
			tokens.forEach( token => stems.push( stemmer(token) ) );
			//stems.forEach( stem => relevance += checker.isCorrect(stem) ? "y" : "n" );
			tags.forEach( (tag,n) => tags[n] = tag.tag );

			tags.forEach( (tag,n) => { 
				if ( tag.startsWith("?") || tag.startsWith("NN") ) actor += tokens[n];
				else {
					if ( actor ) { actors.push( actor ); actor = ""; }
					if ( tag.startsWith("VB") ) links.push( tokens[n] ); 
				}
			});
			if ( actor ) actors.push( actor ); 

			var ref = classifs[0][0];
			classifs.forEach( classif => { 
				if ( classif[0].label == ref.label ) agreement++; 
				weight += classif[0].value;
			});

			if ( ref.label in topics ) topics[ref.label] += ref.value; else topics[ref.label] = ref.value;

			//Log(frag, sentiment);
			scores.push({
				pos: tags.join(";"),
				frag: frag,
				classifs: classifs,
				tokens: tokens,
				agreement: agreement / classifs.length,
				weight: weight,
				stems: stems,
				sentiment: sentiment,
				links: links,
				actors: actors,
				relevance: 0
			});
		}

		function snlpDoc(frag,cb) {	// stanford NER
			var 
				stanford = READ.stanford,
				entities = metrics.entities,
				count = metrics.count,
				ids = metrics.ids,
				topics = metrics.topics,
				//dag = metrics.dag,		
				scores = [], 
				nlps = [],
				done = 0;

				frags.forEach( frag => {
					( async() => {
						var nlp = await stanford.process("en", frag);
						nlps.push( nlp );
						var actors = []; nlp.entities.forEach( ent => actors.push( ent.utteranceText ) );
						if ( nlp.intent in topics ) topics[nlp.intent] += nlp.score; else topics[nlp.intent] = nlp.score;

						cb({
							classifs: [{value: nlp.score, label: nlp.intent}],
							sentiment: nlp.sentiment.score,
							relevance: 0,
							agreement: 1,
							links: ["related"], // nlp.actions ?
							actors: actors,
							weight: 1
						});
					}) ();
				});

				if ( !frags.length ) cb(metrics, scores);
		}
		
		var
			methods = [anlpDoc, snlpDoc],
			metrics = {
				// dag: new ANLP.EdgeWeightedDigraph(),
				freqs: new ANLP.TfIdf(),
				entities: new ANLP.Trie(false),
				count: {
					links: 0,
					actors: 0
				},
				ids: {
					links: {},
					actors: {}
				},
				actors: [],
				links: [],			
				sentiment: 0,
				relevance: 0,
				agreement: 0,
				weight: 0,
				topics: {},
				scores: [],
				level: 0
			},
			scores = metrics.scores,
			freqs = metrics.freqs;

		sql.insertJob( job, job => { 
			function getDoc( job, cb) {

				function readFile(path,cb) {	// read and forward doc to callback
					
					READ.readFile( "."+path, rec => {
						if (rec) {
							var 
								docs = (rec.doc||"").replace(/\n/g,"").match( /[^\.!\?]+[\.!\?]+/g ) || [],
								scored = 0;
							
							docs.forEach( doc => {
								if (doc) {
									freqs.addDocument(doc);									
									methods.forEach( nlp => nlp( doc , score => {
										scores.push( score );
										if ( ++scored == docs.length ) {
											["DTO", "DTO cash"].forEach( find => {
												freqs.tfidfs( find, (n,score) => scores[n].relevance += score );
											});

											sumScores( scores, metrics );	
											cb(metrics, scores);
										}
									}) );
								}
								
								else 
									scored++;
							});
						}
						
						else
							cb( sum );
					});
				}

				var
					path = job.path,
					ctx = job.ctx,
					query = job.query,
					data = {},
					firstKey = "";

				for (var key in query)  // first key is special scripting-with-callback key
					if ( !firstKey ) {
						firstKey = key;

						`read( path, doc => cb( ${query[key]} ) )`
						.parseJS( Copy(ctx, { // define parse context
							read: readFile,
							path: path,
							cb: rtn => {
								data[firstKey] = rtn;
								query[firstKey] = firstKey;
								cb( data, job );
							}
						}) );
					}  

				if ( !firstKey ) readFile(path, doc => cb( {Doc:doc}, job) );
			}

			getDoc( job, (data,job) => cb(data,job) );
		});
	},

	pipeDB: function(sql,job,cb) {  // pipe database source
		sql.query( "SELECT * FROM app.??", job.class, (err,recs) => {
			if (!err) cb( {data:recs}, job );
		});
	},

	pipeAOI: function(sql,job,cb) {	// stream indexed events or chips through supervisor 
		getFile( job.client, job.path, file => {
			function chipFile( file, job ) { 
				//Log( "chip file>>>", file );
				var ctx = job.ctx;

				ctx.File = file;
				getVoxels(sql, job.query, file, meta => {  // process voxels over queried aoi
					ctx.meta = meta;

					sql.insertJob( job, job => {  // put voxel into job regulation queue
						function getImage(chips, job, cb) {
							chips.get( "wms", function image(img) {
								//Log("wms recover job", job.ctx.Method);
								cb(img, job);
							});
						}

						var
							ctx = job.ctx, 		 // recover job context
							meta = ctx.meta,
							file = meta.File,
							chips = meta.Chips,
							evs = meta.Events;

						//Log(">>>chips", chips);
						if (chips)   // place chips into chip supervisor
							getImage( chips, job, (img,job) => {
								var ctx = job.ctx;
								//Log(">>>chip ctx", ctx);
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

										//Log("learning ctx", ctx);

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
												//Log("filter", ev);
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
}

// UNCLASSIFIED