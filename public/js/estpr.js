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
		Log(">>>>>>>>>>>>>estpr");
		
		var 
			ran = new RAN({ // configure the random process generator
				getPCs: function (model, min, M, win, cb) {
					var vals = [], vecs = [];
					SQL.query(
						"SELECT * FROM app.ran WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value > ? AND correlation_model = ? ORDER BY eigen_index", 
						[M-win, M+win, min, model],
						function (err, recs) {
							recs.forEach( function (rec) {
								vals.push( rec.eigen_value );
								vecs.push( JSON.parse( rec.eigen_vector ) );
							});

							cb({
								values: vals,
								vectors: vecs
							});
					});

					SQL.release();
				},
							
				N: ctx._File.Actors,  // ensemble size
				wiener: 0,  // wiener process steps
				sym: ctx.Symbols,  // state symbols
				//store: [], 	// use sync pipe() since we are running a web service
				steps: ctx.Steps || ctx._File.Steps, // process steps
				K: ctx._File.States,	// number of states 
				learn: function (cb) {  // event getter callsback cb(events) or cb(null) at end
					GET.byStep(ctx, cb);
				},  // event getter when in learning mode
				solve: ctx.Solve || {  // solver parms for unsupervised learning
					batch: 0,  // steps to next batch estimate
					pc: {  // principle components for intensity/rate estimates
						model: "sinc",  // assumed correlation model for underlying CCGP
						limit: 0.1	// min eigen value to use
					},
					//lfa: [50],  // initial guess at M = # coherence intervals
					//bfs: [1,200,5],  // M range and step to search
					lma: [50]	// initial guess at M = # coherence intervals
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