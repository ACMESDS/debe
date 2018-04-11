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
			Solve = { ... } learning parameters
			File.Actors = ensembe size
			File.States = number of states consumed by process
			File.Steps = number of time steps
			Steps = override File
			Load = event query
		*/
		LOG("estpr", ctx);
		
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
					GET.byStep(ctx, cb);
				},  // event getter when in learning mode
				
				N: ctx._File.Actors,  // ensemble size
				//wiener: 0,  // wiener process steps
				sym: ctx.Symbols,  // state symbols
				//store: [], 	// use sync pipe() since we are running a web service
				steps: ctx.Steps || ctx._File.Steps, // process steps
				K: ctx._File.States,	// number of states 
				trP: {}, // trans probs
				solve: {  // solver parms for unsupervised learning
					batch: 0,  // steps to next supervised learning batch 
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
							LOG(ev);
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