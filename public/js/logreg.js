module.exports = {  // logistic regression
	keys: {
		Method: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		numSteps: "int(11) default 0 comment 'number of steps in lrm solver' ",
		learningRate: "float default 0 comment 'lrm learning rate' ",
		latentVectors: "int(11) default 0 comment 'number of pls latenent vectors' ",
		tolerance: "float default 0 comment 'pls tolerance' ",
		k: "int(11) default 0 comment 'number of nearest neighbors to use in knn majority voting' ",
		
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
		
		if ( y ) {  // train the model
			//x.length = 10;
			//y.length = 10;
			Log("logreg train>>", use, "xy=", [x.length, y.length]);

			$(` cls = ${use}Train( x, y, solve, save ); `, 
				Copy({
					save: (cls) => {
						ctx.Save = {Save_model: cls};
						res(ctx);
					},
					solve: ctx
				}, ctx), (ctx) => {
					Log("logreg trained");
				});
		}
		
		else {	// predict using the model
			
			var
				restore = {
					def: (cls) => cls,
					svm: $.SVM.restore,
					lrm: $.LRM.load,
					knn: $.KNN.load,
					pls: $.PLS.load
				};
			
			//x.length = 4;
			Log("logreg predict>>", use, "x=", [x.length]);
			
			$(` y = ${use}Predict( cls, x );`, 
				Copy({
					cls: (restore[use] || restore.def)(ctx.Save_model)
				}, ctx), (ctx) => {
					ctx.Save = {Save_predict: ctx.y};
					res(ctx);
					Log("logreg predicted");
				});
		}
		
//y0 = lrmPredict( cls, x0);`, 
		
	}

}