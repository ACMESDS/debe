module.exports = {  // learn hidden trigger function of a Markov process
	usecase: {
		Symbols: "json comment '[sym, ...] state symbols or null to generate' ",
		Steps: "int(11) default 0 comment 'steps to next supervised learning' ",
		Batch: "int(11) default 0 comment 'override _File.Steps' ",
		Dim: "int(11) default 150 comment 'pc model dimension (max coherence intervals)' ",		
		Model: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		Save_end: "json",
		Save_config: "json",	
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function triggerFunction(ctx, res) {  
	/* 
	Estimate hidden trigger function for Markov process given ctx and:
		_File.Actors = ensembe size
		_File.States = number of states consumed by process
		_File.Steps = number of time steps
		_Events = query to get events
	*/
		function triggerProfile( solve, cb) {
			var 
				ctx = {
					evs: ME.matrix( solve.evs ),
					N: solve.D,
					lambda: solve.lambda,
					T: solve.T
				};
				
			ME.exec(`
nu = rng(-pi, pi, N); 
t = rng(-T/2, T/2, N); 
fs = N/T; 
Gu = evpsd(evs, nu, T, "n", "t");  
modH = sqrt(Gu ./ (lambda + dft(corA, fs)));  
H = pwt( modH, [] ); 
h = dft(H,fs); 
`, 
					ctx, function (vmctx) {
						cb({
							t: vmctx.t._data,
							trigger_profile: vmctx.h._data
						});
			});
		}
		
		var
			file = ctx._File,
			flow = ctx._Flow;
		
		//Log("cints ctx", ctx);
		triggerProfile({  // define solver parms
			evs: flow.store,		// count frequencies
			lambda: file.mean_intensity, // mean arrival rate
			D: ctx.Dim, 		// profile sample times = max coherence intervals
			model: ctx.Model,  	// name of model
			T: flow.T,  		// observation time
			N: flow.N		// ensemble size
		}, function (stats) {
			ctx.Save = stats;
			res(ctx);
		});
	}

}