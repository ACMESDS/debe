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
	
	engine: function trigs(ctx, res) {  
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
					T: solve.T,
					Tc: solve.Tc
				};

			ME.exec(`
fs = (N-1)/T;
nu = rng(-fs/2, fs/2, N); 
t = rng(-T/2, T/2, N); 
CA = ${solve.model}(t/Tc);
N0 = (N+1)/2;
Gu = evpsd(evs, nu, T, "n", "t");  
modH = sqrt(Gu ./ (lambda + wkpsd( CA[N0]^2 + abs(CA).^2, T)) );  
H = pwt( modH, [] ); 
h = dft(H,T); 
`, 
					ctx, function (ctx) {
						//Log("vm", ctx);
						cb({
							t: ctx.t._data,
							trigger_profile: ctx.h._data
						});
			});
			
			
		}
		
		var
			file = ctx._File,
			flow = ctx._Flow;
		
		BULK(ctx, function (evs) {  // fetch all the events
			Log("bulk evs=", evs.length);
			triggerProfile({  // define solver parms
				evs: evs,		// events
				lambda: file.mean_intensity, // mean arrival rate
				D: ctx.Dim, 		// profile sample times = max coherence intervals
				model: ctx.Model,  	// complex correlation model
				Tc: file.coherence_time,  // coherence time of arrival process
				T: flow.T,  		// observation time
				N: flow.N		// ensemble size
			}, function (stats) {
				ctx.Save = stats;
				res(ctx);
			});
		});
	}

}