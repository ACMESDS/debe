module.exports = {  // logistic regression
	keys: {
		Dim: "int(11) default 150 comment 'pc model dimension [max coherence intervals]' ",		
		Model: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		Save_end: "json",
		Save_config: "json",	
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext",
		Autorun: "boolean default 0"
	},
	
	engine: function logreg(ctx, res) {  
	/* 
	Estimate hidden trigger function for Markov process given context ctx parameters:
	
		Dim 	// samples in profile = max coherence intervals
		Model  	// name correlation model
	
	ctx.Flow parameters:
	
		T = observation time
	
	ctx.File parameters:
	
		Stats_Gain = assumed detector gain = area under trigger function
	
	and ctx.Stats parameters:
	
		coherence_time = coherence time underlying the process
		mean_intensity = ref mean arrivale rate (for debugging)
	*/
		const { sqrt, floor, random, cos, sin, abs, PI, log, exp} = Math;
		
		function regress( solve, cb) {
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
			
			Log("logreg", {
				evs: solve.evs.length, 
				refRate: solve.refLambda,
				ev0: solve.evs[0]
			});
				
		}
		
		var
			stats = ctx.Stats,
			file = ctx.File,
			flow = ctx.Flow;
		
		Log("logreg ctx", ctx.Events.length);
		
		ctx.Events.$( "all", function (evs) {  // fetch all events
			if (evs)
				regress({  // define solver parms
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
	}

}