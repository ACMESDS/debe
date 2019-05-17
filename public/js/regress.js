module.exports = {  // regression
	addkeys: {
		Method: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		lrm_numSteps: "int(11) default 0 comment 'number of steps in lrm solver' ",
		lrm_learningRate: "float default 0 comment 'lrm learning rate' ",
		
		pls_latentVectors: "int(11) default 0 comment 'number of pls latenent vectors' ",
		pls_tolerance: "float default 0 comment 'pls tolerance' ",
		
		ols_degree: "int(11) default 0 comment 'maximum degree of the polynomial' ",

		knn_k: "int(11) default 0 comment 'number of nearest neighbors to use in knn majority voting' ",
		
		som_iterations: "int(11) default 0 comment 'Number of iterations over the training set for the training phase (default: 10). The total number of training steps will be iterations * trainingSet.length' ",
		som_learningRate: "float default 0 comment' Multiplication coefficient for the learning algorithm (default: 0.1)' ",
		som_method: "varchar(32) default 'random' comment 'Iteration method of the learning algorithm (default: random)' ",
		
		Save_raf: "json comment 'raf model' ",
		Save_dtr: "json comment 'dtr model' ",
		Save_lrm: "json comment 'lrm model' ",
		Save_svm: "json comment 'svm model' ",
		Save_plc: "json comment 'plc model' ",
		Save_knn: "json comment 'knn model' ",
		Save_som: "json comment 'som model' ",
		Save_ols: "json comment 'old model' ",
		Save_predict: "json comment 'predictions stash' ",
		Save_train: "json comment 'training stash' ",

		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function regress(ctx, res) {  
	/* 
	Train regressor given (x,y) data, or predict from given x data, where:

		Method: regression technique to USE = lrm | svm | pls | knn	| ols | ...
		Save_USE: training model for used Method saved here
		USE_solve: solver parameter for used Method 
	*/
		var
			stats = ctx.Stats,
			x = ctx.x,
			y = ctx.y,
			use = ctx.Method.toLowerCase(),
			solveKey = use +"_",
			loaders = {
				svm: $.SVM.restore,
				lrm: $.LRM.load,
				knn: $.KNN.load,
				pls: $.PLS.load,
				som: $.SOM.load,
				raf: (model) => model,
				dtr: (model) => model,
				ols: ctx.ols_degree ? $.SPR.load : $.MLR.load
			},
			loader = loaders[use],
			model = ctx[ `Save_${use}` ], 
			solve = {};
		
		for (var key in ctx) 
			if ( key.indexOf( solveKey ) == 0 ) solve[ key.substr( solveKey.length ) ] = ctx[key];
		
		//Log("solve", solve, loader);
		
		if ( loader)
			if ( x && y ) {  // train the model
				//x.length = 10;
				//y.length = 10;
				Log("regress train>>", use, "xy:", [x.length, y.length]);

				if (x.length == y.length)
					$(` cls = ${use}Train( x, y, solve, save ); `, 
						Copy({
							save: (cls) => {
								ctx.Save = {};
								ctx.Save[ `Save_${use}` ] = cls;
								res(ctx);
							},
							solve: solve
						}, ctx), (ctx) => {
							Log("regressor trained");
						});

				else 
					res(new Error("bad x and/or y dimensions") );
			}

			else
			if ( x ) {	// predict using the model

				//x.length = 4;
				Log("regress predict>>", use, "x:", [x.length]);

				if ( model )
					$(` y = ${use}Predict( cls, x );`, 
						Copy({
							cls: loader(model)
						}, ctx), (ctx) => {
							ctx.Save = {Save_predict: ctx.y};
							res(ctx);
							Log("regress predicted");
						});
				
				else
					res( new Error("regressor never trained") );
			}
		
			else
				res( new Error("no x or y provided to regressor") );
		
		else
			res( new Error("invalid regression method") );
		
	}

}