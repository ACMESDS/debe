module.exports = {  // learn hidden coherence parameters of a Markov process
	keys: {
		lma: "json comment '[init] initial estimate of coherence intervals for levenberg-marquardt alg' ",
		lfa: "json comment '[init] initial estimate for linear factor alg [use at your own risk]' ",
		bfs: "json comment '[start,end,step] initial estimate for brute force search' ",
		Use: "varchar(8) default 'lma' comment 'lma || lfs || bfs alg results used retained for estimated intervals' ",
		
		Save_end: "json",
		Save_config: "json",	
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function cints(ctx,res) {  
	/* 
	Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters:
	
		Use  || "lma" // solution to retain
		lfa || [50] // initial guess at coherence intervals
		bfs || [1,200,5]  // range and step to search coherence intervals
		lma	|| [50] // initial guess at coherence intervals
	
	and ctx.Flow parameters:
		
		F = count frequencies
		T = observation interval [1/Hz]
		N = ensemble size
	*/
		
		var
			flow = ctx.Flow;
		
		Log("cints ctx T,N", ctx);
		
		ctx.Save = $.coherenceIntervals({  // define solver parms
			H: flow.F,		// count frequencies
			T: flow.T,  		// observation time
			N: flow.N,		// ensemble size
			use: ctx.Use || "lma",  // solution to retain
			lfa: ctx.lfa || [50],  // initial guess at coherence intervals
			bfs: ctx.bfs || [1,200,5],  // range and step to search cohernece intervals
			lma: ctx.lma || [50]	// initial guess at coherence intervals
		});

		Log("cints stats for voxel "+ctx.Voxel.ID, ctx.Save);
		res(ctx);
	}

}