module.exports = {  // learn hidden trigger function of a Markov process
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
	
	engine: function trigs(ctx, res) {  
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
		// const { sqrt, floor, random, cos, sin, abs, PI, log, exp} = Math;
		
		var
			stats = ctx.Stats,
			file = ctx.File,
			flow = ctx.Flow;
		
		Log("trigs ctx evs", ctx.Events);
		
		if (stats.coherence_time)
			ctx.Events.$( "t", evs => {  // fetch all events
				if (evs)
					$.triggerProfile({  // define solver parms
						evs: evs,		// events
						refLambda: stats.mean_intensity, // ref mean arrival rate (for debugging)
						alpha: file.Stats_Gain, // assumed detector gain
						N: ctx.Dim, 		// samples in profile = max coherence intervals
						model: ctx.Model,  	// name correlation model
						Tc: stats.coherence_time,  // coherence time of arrival process
						T: flow.T  		// observation time
					}, stats => {
						ctx.Save = stats;
						res(ctx);
					});
			});
		
		else
			res(null);
	}

}