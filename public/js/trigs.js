module.exports = {  // learn hidden trigger function of a Markov process
	keys: {
		//Symbols: "json comment '[sym, sym, ...] state symbols or null to generate' ",
		Steps: "int(11) default 0 comment 'steps to next supervised learning' ",
		Batch: "int(11) default 0 comment 'override File.Steps' ",
		Dim: "int(11) default 150 comment 'pc model dimension [max coherence intervals]' ",		
		Model: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		Save_end: "json",
		Save_config: "json",	
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext",
		Autorun: "boolean default 0"
	},
	
	engine: function trigs(ctx, res) {  
	/* 
	Estimate hidden trigger function for Markov process given the context ctx:
	
		File.Stats_Gain = assumed detector gain = area under trigger function
		Stats.coherence_time = coherence time underlying the process
		Dim = samples in profile = max coherence intervals
		Flow.T = observation time
		Events = query to get events
	*/
		const { sqrt, floor, random, cos, sin, abs, PI, log, exp} = Math;
		
		function triggerProfile( solve, cb) {
		/**
		Use the Paley-Wiener Theorem to return the trigger function stats:

			x = normalized time interval of recovered trigger
			h = recovered trigger function at normalized times x
			modH = Fourier modulous of recovered trigger at frequencies f
			argH = Fourier argument of recovered trigger at frequencies f
			f = spectral frequencies

		via the callback cb(stats) given a solve request:

			evs = events list
			refLambda = ref mean arrival rate (for debugging)
			alpha = assumed detector gain
			N = profile sample times = max coherence intervals
			model = correlation model name
			Tc = coherence time of arrival process
			T = observation time
		*/
			
			var 
				ctx = {
					evs: ME.matrix( solve.evs ),
					N: solve.N,
					refLambda: solve.refLambda,
					alpha: solve.alpha,
					T: solve.T,
					Tc: solve.Tc
				},
				script = `
N0 = fix( (N+1)/2 );
fs = (N-1)/T;
df = fs/N;
nu = rng(-fs/2, fs/2, N); 
t = rng(-T/2, T/2, N); 
V = evpsd(evs, nu, T, "n", "t");  

Lrate = V.rate / alpha;
Accf = Lrate * ${solve.model}(t/Tc);
Lccf = Accf[N0]^2 + abs(Accf).^2;
Lpsd =  wkpsd( Lccf, T);
disp({ 
	evRates: {ref: refLambda, ev: V.rate, L0: Lpsd[N0]}, 
	idx0lag: N0, 
	obsTime: T, 
	sqPower: {N0: N0, ccf: Lccf[N0], psd: sum(Lpsd)*df }
});

Upsd = Lrate + Lpsd;
modH = sqrt(V.psd ./ Upsd );  

argH = pwt( modH, [] ); 
h = re(dft( modH .* exp(i*argH),T)); 
x = t/T; 
`;
			ME.exec(script,  ctx, function (ctx) {
				//Log("vmctx", ctx);
				cb({
					trigger: {
						x: ctx.x,
						h: ctx.h,
						modH: ctx.modH,
						argH: ctx.argH,
						f: nu
					}
				});
			});
		}
		
		var
			stats = ctx.Stats,
			file = ctx.File,
			flow = ctx.Flow;
		
		if (stats.coherence_time)
			FLOW.all(ctx, function (evs) {  // fetch all the events
				if (evs)
					triggerProfile({  // define solver parms
						evs: evs,		// events
						refLambda: stats.mean_intensity, // ref mean arrival rate (for debugging)
						alpha: file.Stats_Gain, // assumed detector gain
						N: ctx.Dim, 		// samples in profile = max coherence intervals
						model: ctx.Model,  	// name correlation model
						Tc: stats.coherence_time,  // coherence time of arrival process
						T: flow.T  		// observation time
					}, function (stats) {
						ctx.Save = stats;
						res(ctx);
					});
			});
		
		else
			res(null);
	}

}