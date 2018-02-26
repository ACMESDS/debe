module.exports = {
	usecase: {
		Symbols: "json",
		Steps: "int(11)",
		Description: "mediumtext"
	},
	
	engine: function estpr(ctx,res) {  // learn hidden parameters of Markov process
		/* 
		Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters:
			Symbols = [sym, ...] state symbols or null to generate
			Batch = batch size in steps
			File.Actors = ensembe size
			File.States = number of states consumed by process
			File.Steps = number of time steps
			Steps = override File
			Load = event query
		*/
		//var exp = Math.exp, log = Math.log, sqrt = Math.sqrt, floor = Math.floor, rand = Math.random;

		//LOG(ctx);

		var 
			ran = new RAN({ // configure the random process generator
				N: ctx._File.Actors,  // ensemble size
				wiener: 0,  // wiener process steps
				sym: ctx.Symbols,  // state symbols
				store: [], 	// use sync pipe() since we are running a web service
				steps: ctx.Steps || ctx._File.Steps, // process steps
				batch: ctx.Batch, // batch size in steps 
				K: ctx._File.States,	// number of states 
				learn: function (cb) {  // event getter callsback cb(events) or cb(null) at end
					GET.byStep(ctx, cb);
				},  // event getter when in learning mode
				filter: function (str, ev) {  // retain only end event containing last estimates
					switch ( ev.at ) {
						case "end":
						case "batch":
							str.push(ev);
					}
				}  // on-event callbacks
			});

		ran.pipe( [], function (evs) { // sync pipe
			ctx.Save = evs;
			res( ctx );
		}); 

	}

}