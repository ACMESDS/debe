module.exports = {  // learn hidden trigger function of a Markov process
	usecase: {
		Symbols: "json comment '[sym, sym, ...] state symbols or null to generate' ",
		Steps: "int(11) default 0 comment 'steps to next supervised learning' ",
		Batch: "int(11) default 0 comment 'override _File.Steps' ",
		Dim: "int(11) default 150 comment 'pc model dimension [max coherence intervals]' ",		
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
					lambda0: solve.lambda,
					T: solve.T,
					Tc: solve.Tc
				},
				script = `
N0 = fix( (N-1)/2 );
fs = N/T;
df = fs/N;
nu = rng(-fs/2, fs/2, N); 
t = rng(-T/2, T/2, N); 

uh = evpsd(evs, nu, T, "n", "t");  

ud = {ccf: uh.meanRate^2 * ${solve.model}(t/Tc)};
ud.psd =  wkpsd( ud.ccf[N0+1]^2 + abs(ud.ccf).^2, T);
disp({ 
	refRate: lambda0, 
	evRate: uh.meanRate, 
	idx0lag: N0, 
	obsTime: T, 
	refSqPower: ud.ccf[N0+1], 
	evSqPower: sum(ud.psd)*df });

modH = sqrt(uh.psd ./ (lambda0 + ud.psd) );  

H = pwt( modH, [] ); 
h = dft(H,T); 
`;
/*
disp(uh.psd );
disp( ud.psd );
*/
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
			file = ctx.File,
			flow = ctx.Flow;
		
		GET.forAll(ctx, function (evs) {  // fetch all the events
			if (evs)
				triggerProfile({  // define solver parms
					evs: evs,		// events
					lambda: file.mean_intensity, // mean arrival rate (ref only for debugging)
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