module.exports = {
	usecase: {
		Symbols: "json",
		Steps: "int(11)",
		Solve: "json",
		Description: "mediumtext"
	},
	
	engine: function estpr(ctx,res) {  // learn hidden parameters of Markov process
		/* 
		Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters:
			Symbols = [sym, ...] state symbols or null to generate
			Batch = steps to next supervised learning
			Steps = override _File.Steps
			Model = name of model used for pc estimates
			MinEigen = smallest eigenvalue for pc estimates
			lma = [init] initial estimate of coherence intervals for levenberg-marquardt alg
			lfs = [init] "" for linear factor alg (use at your own risk)
			bfs = [start,end,step] "" for brute force search
			Use = "lma" || "lfs" || "bfs" alg results used retained for estimated intervals
			_File.Actors = ensembe size
			_File.States = number of states consumed by process
			_File.Steps = number of time steps
			_Events = query to get events
		*/
		//LOG("estpr", ctx);
		
		var 
			ran = new RAN({ // configure the random process generator
				getpcs: function (model, min, M, win, ctx, cb) {
				
					SQL.query(
						"SELECT * FROM app.ran WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value > ? AND correlation_model = ? ORDER BY eigen_index", 
						[M-win, M+win, min, model],
						function (err, pcs) {

						var vals = [], vecs = [];

						pcs.forEach( function (pc) {
							vals.push( pc.eigen_value );
							vecs.push( JSON.parse( pc.eigen_vector ) );
						});

						cb(ctx, {
							values: vals,
							vectors: vecs
						});
					});

					SQL.release();
				},
							
				learn: function (cb) {  // event getter callsback cb(events) or cb(null) at end
					STEP(ctx, cb);
				},  // event getter when in learning mode
				
				N: ctx._File.Actors,  // ensemble size
				//wiener: 0,  // wiener process steps
				sym: ctx.Symbols,  // state symbols
				steps: ctx.Steps || ctx._File.Steps, // process steps
				batch: ctx.Batch || 0,  // steps to next supervised learning event 
				K: ctx._File.States,	// number of states 
				trP: {}, // trans probs
				solve: {  // solver parms for unsupervised learning
					pc: {  // principle components options for intensity/rate estimates
						model: ctx.Model,  // assumed correlation model for underlying CCGP
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