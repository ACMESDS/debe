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
				},
				script = `
fs = (N-1)/T;
nu = rng(-fs/2, fs/2, N); 
t = rng(-T/2, T/2, N); 
CA = ${solve.model}(t/Tc);
Gh = evpsd(evs, nu, T, "n", "t");  
N0 = fix( (N-1)/2 );
Gd = wkpsd( CA[N0+1]^2 + abs(CA).^2, T);
modH = sqrt(Gh ./ (lambda + Gd) );  
df = 2*fs/N;
disp( [lambda, N0, T, CA[N0+1], sum(Gd)*df] );
disp( Gd );
H = pwt( modH, [] ); 
h = dft(H,T); 
`;

			ME.exec(script,  ctx, function (ctx) {
				//Log("vmctx", ctx);
				cb({
					trigger_profile: {
						t: ctx.t,
						p: ctx.h
					}
				});
			});
		}
		
		var
			file = ctx._File,
			flow = ctx._Flow;
		
		GET.forAll(ctx, function (evs) {  // fetch all the events
			if (evs)
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