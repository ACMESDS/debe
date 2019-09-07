module.exports = {
	keys: {
		Symbols: "json",
		Steps: "int(11) default 0",
		lma: "json",
		lfa: "json",
		bfs: "json",
		Use: "varchar(8) default 'lma'",
		Batch: "int(11) default 0",
		Dim: "int(11) default 150",
		MinEigen: "float default 1e-1",
		Model: "varchar(16) default 'sinc'",		
		Description: "mediumtext"
	},
	
	engine: function estpr(ctx,res) {  // learn hidden parameters of Markov process
	/* 
	Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters:
		Symbols = [sym, ...] state symbols or null to generate
		Batch = steps to next supervised learning
		Steps = override File.Steps
		Model = name of model used for pc estimates
		MinEigen = smallest eigenvalue for pc estimates
		Dim = pc model dims (max coherence intervals)
		lma = [init] initial estimate of coherence intervals for levenberg-marquardt alg
		lfs = [init] "" for linear factor alg (use at your own risk)
		bfs = [start,end,step] "" for brute force search
		Use = "lma" || "lfs" || "bfs" alg results used retained for estimated intervals
		File.Actors = ensembe size
		File.States = number of states consumed by process
		File.Steps = number of time steps
		_Events = query to get events
	*/
		//LOG("estpr", ctx);
		
		var 
			ran = new RAN({ // configure the random process generator
				/*getpcs: function (model, Emin, M, Mwin, Mmax, ctx, cb) {
				
					function genpcs(dim, steps, model, cb) {
						LOG("gen pcs", dim, steps, model); 
						var
							pcgen = new RAN({
								models: [model],  // models to gen
								Mmax: dim,  	// max coherence intervals
								Mstep: steps 	// step intervals
							});
						
						SQL.beginBulk();
						
						pcgen.config( function (pc) {
							var 
								vals = pc.values,
								vecs = pc.vectors,
								N = vals.length, 
								ref = vals[N-1];
							
							vals.forEach( (val, idx) => {
								var
									save = {
										correlation_model: pc.model,
										coherence_intervals: pc.intervals,
										eigen_value: val,
										eigen_index: idx,
										ref_value: ref,
										max_intervals: dim,
										eigen_vector: JSON.stringify( vecs[idx] )
									};
								
								SQL.query("INSERT INTO app.pcs SET ? ON DUPLICATE KEY UPDATE ?", [save,save] );
							});
						});
						
						SQL.endBulk();
						cb();						
					}

					function sendpcs( pcs ) {
						var vals = [], vecs = [];
						pcs.forEach( function (pc) {
							vals.push( pc.eigen_value );
							vecs.push( JSON.parse( pc.eigen_vector ) );
						});

						cb(ctx, {
							values: vals,
							vectors: vecs
						});
						
						SQL.release();
					}
						
					function findpcs( cb ) {
						var M0 = Math.min( M, Mmax-Mwin*2 );
						
						SQL.query(
							"SELECT * FROM app.pcs WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value > ? AND least(?,1) ORDER BY eigen_index", 
							[M0-Mwin, M0+Mwin, Emin, {
								max_intervals: Mmax, 
								correlation_model: model
							}],
							function (err, pcs) {
								if (!err) cb(pcs);
						});
					}
					
					findpcs( function (pcs) {
						if (pcs.length) 
							sendpcs( pcs );
						
						else
						SQL.query(
							"SELECT count(ID) as Count FROM app.pcs WHERE least(?,1)", {
								max_intervals: Mmax, 
								correlation_model: model
							}, 
							function (err, test) {  // see if pc model exists
							
							//LOG( "modtest", Mmax, model, M, Mwin, pcs);
							if ( !test[0].Count )  // pc model does not exist so make it
								genpcs( Mmax, Mwin*2, model, function () {
									findpcs( sendpcs );
								});
								
							else  // search was too restrictive so no need to remake model
								sendpcs(pcs);
						});							
					});
				},*/
							
				learn: function (cb) {  // event getter callsback cb(events) or cb(null) at end
					STEP(ctx, cb);
				},  // event getter when in learning mode
				
				N: ctx.File.Actors,  // ensemble size
				//wiener: 0,  // wiener process steps
				sym: ctx.Symbols,  // state symbols
				steps: ctx.Steps || ctx.File.Steps, // process steps
				batch: ctx.Batch || 0,  // steps to next supervised learning event 
				K: ctx.File.States,	// number of states 
				trP: {}, // trans probs
				solve: {  // solver parms for unsupervised learning
					pc: {  // principle components options for intensity estimates
						model: ctx.Model,  // assumed correlation model for underlying CCGP
						dim: ctx.Dim || 150,  // max coherence intervals / pc dim
						min: ctx.MinEigen	// min eigen value to use
					},
					use: ctx.Use,
					lfa: ctx.lfa, // [50],  // initial guess at M = # coherence intervals
					bfs: ctx.bfs, // [1,200,5],  // M range and step to search
					lma: ctx.lma	// initial guess at M = # coherence intervals
				},					
				filter: function (str, ev) {  // retain only end event containing last estimates
					switch ( ev.at ) {
						case "end":
						case "batch":
							str.push(ev);
					}
				}  // on-event callbacks
			});

		ran.pipe( function (evs) { // sync pipe
			ctx.Save = evs;
			res( ctx );
		}); 

	}

}