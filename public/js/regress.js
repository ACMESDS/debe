module.exports = {  // regression
	addkeys: {
		Method: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		Keep: "int(11) default 0 comment 'number of (x,y) values to retain during training' ",

		hyper_lrm: `json comment '
numSteps: int>=[1] number of steps in LRM solver
learningRate: float >= [0] LRM learning rate
' `,

		hyper_pls: `json comment '
latentVectors: int >= [1] number of pls latenent vectors
tolerance: float >= [0] tolerance
' `,
		
		hyper_ols: `json comment '
degree: int >= [0] Maximum degree of the polynomial (0=linear ols)
' `,

		hyper_knn: `json comment '
k: int >= [1] Number of nearest neighbors to use in knn majority voting.
' `,
		
		hyper_eln: `json comment '
alpha: float >= 0 [1] Constant that multiplies the penalty terms. See the notes for the exact mathematical meaning of this parameter. alpha = 0 is equivalent to an ordinary least square, solved by the LinearRegression object. For numerical reasons, using alpha = 0 with the Lasso object is not advised.
l1_ratio: 0<= float [0.5] <=1 Mixing parameter.  For l1_ratio = 0 the penalty is an L2 penalty. For l1_ratio = 1 it is an L1 penalty. For 0 < l1_ratio < 1, the penalty is a combination of L1 and L2.
' `,
		
		hyper_las: `json comment '
alpha: float>=0 [1] Constant that multiplies the L1 term. alpha = 0 is equivalent to an ordinary least square, solved by LinearRegression.
normalize : [False | True].  Ignored when fit_intercept is set to False. If True, the regressors X will be normalized before regression by subtracting the mean and dividing by the l2-norm.
max_iter: int >= 1[1] Maximum number of iterations.
tol: float >= [0] Optional tolerance for the optimization: if the updates are smaller than tol, the optimization code checks the dual gap for optimality and continues until it is smaller than tol.
' `,
		
		hyper_brr: `json comment '
n_iter: int >=1 [300] Maximum number of iterations.
alpha_1: float [1e66] shape parameter for the Gamma distribution prior over the alpha parameter.
alpha_2: float [1e-6] inverse scale parameter (rate parameter) for the Gamma distribution prior over the alpha parameter.
lambda_1: float [1e-6] shape parameter for the Gamma distribution prior over the lambda parameter.
lambda_2: float [1e-6] inverse scale parameter (rate parameter) for the Gamma distribution prior.
' `,
		
		hyper_som: `json comment '
iterations: int >= 1 [10] Number of iterations over the training set for the training phase. The total number of training steps will be iterations * trainingSet.length.
learningRate: float>=0 [0.1] Multiplication coefficient for the learning algorithm.
method: [random | ...] Iteration method of the learning algorithm (default: random)
' `,
		
		hyper_dtr: `json comment '
latentVectors: int >=[1] Number of latent vectors
tolerance: float>= [0] tolerance
' `,

		hyper_svm: `json comment '' `,
		hyper_raf: `json comment '' `,
				
		Save_raf: "json comment 'raf model' ",
		Save_eln: "json comment 'eln model' ",
		Save_brr: "json comment 'brr model' ",
		Save_dtr: "json comment 'dtr model' ",
		Save_lrm: "json comment 'lrm model' ",
		Save_svm: "json comment 'svm model' ",
		Save_plc: "json comment 'plc model' ",
		Save_knn: "json comment 'knn model' ",
		Save_som: "json comment 'som model' ",
		Save_ols: "json comment 'ols model' ",
		Save_las: "json comment 'lasso model' ",

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
			solve = ctx[`hyper_${use}` ] || {};
		
		/*
		for (var key in ctx) 
			if ( key.indexOf( solveKey ) == 0 ) solve[ key.substr( solveKey.length ) ] = ctx[key];
		*/
		
		Log("solve", solve, loader);
		
		if ( loader)
			if ( x && y ) {  // train the model
				//x.length = 10;
				//y.length = 10;
				Log("regress train>>", use, "xy:", [x.length, y.length]);

				if (x.length == y.length)
					$(`cls = ${use}_train( x, y, solve, save ); `, 
					  
						Copy({
							save: (cls) => {
								$(`u = shuffle(x,y,Keep);`, ctx, (ctx) => {
									ctx.Save = {
										Save_train: {
											method: use,
											x: ctx.u.x._data,
											y: ctx.u.y._data
										}
									};
									ctx.Save[ `Save_${use}` ] = cls;
									res(ctx);
								});
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
					$(` y = ${use}_predict( cls, x );`, 
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