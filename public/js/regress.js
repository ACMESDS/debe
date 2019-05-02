module.exports = {  // regression
	addkeys: {
		Method: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		numSteps: "int(11) default 0 comment 'number of steps in lrm solver' ",
		learningRate: "float default 0 comment 'lrm learning rate' ",
		latentVectors: "int(11) default 0 comment 'number of pls latenent vectors' ",
		tolerance: "float default 0 comment 'pls tolerance' ",
		k: "int(11) default 0 comment 'number of nearest neighbors to use in knn majority voting' ",
		
		Save_lrm: "json comment 'lrm model' ",
		Save_svm: "json comment 'svm model' ",
		Save_plc: "json comment 'plc model' ",
		Save_knn: "json comment 'knn model' ",
		Save_predict: "json comment predictions ",

		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function regress(ctx, res) {  
	/* 
	Train lrm | svm | pls | knn | etc regressor given (x,y) data, or predict given x data where solver parameters include:

		Method: regression technique to use = lrm | svm | pls | knn		
		numSteps: number of steps in lrm solver
		learningRate: lrm learning rate
		latentVectors: number of pls latenent vectors
		tolerance: pls tolerance
		k: number of nearest neighbors to use in knn majority voting
	*/
		var
			stats = ctx.Stats,
			x = ctx.x,
			y = ctx.y,
			use = ctx.Method,
			loaders = {
				svm: $.SVM.restore,
				lrm: $.LRM.load,
				knn: $.KNN.load,
				pls: $.PLS.load
			},
			loader = loaders[use],
			model = ctx[ `Save_${use}` ];
		
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
							solve: ctx
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