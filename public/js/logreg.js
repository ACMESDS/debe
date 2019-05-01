module.exports = {  // logistic regression
	keys: {
		Method: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		numStep: "int(11) default 0 comment 'number of steps in lrm solver' ",
		learningRate: "float default 0 comment 'lrm learning rate' ",
		Save_model: "json",
		Save_predict: "json",
		Pipe: "json",
		Description: "mediumtext"
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
		var
			stats = ctx.Stats,
			x = ctx.x,
			y = ctx.y,
			use = ctx.Method;
		
		x.length = 10;
		y.length = 10;
		Log("logreg evs>>", use, "xy=", [x.length, y.length]);

		ctx.save = (cls) => {
			ctx.Save = {Save_model: cls};
			res(ctx);
		};
		
		ctx.solve = ctx;
		
		$(` cls = ${use}Train( x, y, solve, save ); `, ctx, (ctx) => {
			Log("logreg done");
		});
		
//y0 = lrmPredict( cls, x0);`, 
		
	}

}