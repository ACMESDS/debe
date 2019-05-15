module.exports = {  // regression
	addkeys: {
		Method: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		//lrm_numSteps: "int(11) default 0 comment 'number of steps in LRM solver' ",
		//lrm_learningRate: "float default 0 comment 'LRM learning rate' ",
		lrm_solver: "varchar(32) default 'lbfgs' comment 'solver method = liblinear | newton-cg | libfgs | sag |n saga' ",
		"lrm_max#iter": "int(11) default 1000 comment 'maximum iterations to run solver' ",
		"lrm_multi#class": `
varchar(32) default 'multinomial' comment '
If "ovr", then a binary problem is fit for each label. If "ultinomial" the loss minimised is the multinomial loss 
fit across the entire probability distribution, even when the data is binary. ‘multinomial’ is unavailable when 
solver=’liblinear’. ‘auto’ selects ‘ovr’ if the data is binary, or if solver=’liblinear’, and otherwise selects ‘multinomial ' `,

		pls_latentVectors: "int(11) default 0 comment 'number of pls latenent vectors' ",
		pls_tolerance: "float default 0 comment 'pls tolerance' ",
		
		ols_normalize: "boolean default 0 comment 'normalize the regressors by subtracting the mean and dividing by the l2-norm' ",

		knn_k: "int(11) default 0 comment 'number of nearest neighbors to use in knn majority voting' ",		
		
		enr_alpha: "float default 1 comment 'Constant that multiplies the penalty terms. See the notes for the exact mathematical meaning of this parameter. alpha = 0 is equivalent to an ordinary least square, solved by the LinearRegression object. For numerical reasons, using alpha = 0 with the Lasso object is not advised.' ",
		"enr_l1#ratio": "float default 	0.5 comment 'The ElasticNet mixing parameter, with 0 <= l1#ratio <= 1. For l1#ratio = 0 the penalty is an L2 penalty. For l1#ratio = 1 it is an L1 penalty. For 0 < l1#ratio < 1, the penalty is a combination of L1 and L2.' ",	
		
		"brr_n#iter": "int(11) default 300 comment 'Maximum number of iterations. Should be greater than or equal to 1' ",
		"brr_alpha#1": "float default 1e66 comment 'Hyper-parameter : shape parameter for the Gamma distribution prior over the alpha parameter. ' ",
		"brr_alpha#2": "float default 1e-6 comment 'Hyper-parameter : inverse scale parameter (rate parameter) for the Gamma distribution prior over the alpha parameter', ",
		"brr_lambda#1": "float default 1e-6 comment 'Hyper-parameter : shape parameter for the Gamma distribution prior over the lambda parameter.' ",
		"brr_lambda#2": "float default 1e-6 comment 'Hyper-parameter : inverse scale parameter (rate parameter) for the Gamma distribution prior ' ",
		
		som_iterations: "int(11) default 0 comment 'Number of iterations over the training set for the training phase (default: 10). The total number of training steps will be iterations * trainingSet.length' ",
		som_learningRate: "float default 0 comment' Multiplication coefficient for the learning algorithm (default: 0.1)' ",
		som_method: "varchar(32) default 'random' comment 'Iteration method of the learning algorithm (default: random)' ",
		
		Save_raf: "json comment 'raf model' ",
		Save_enr: "json comment 'raf model' ",
		Save_brr: "json comment 'raf model' ",
		Save_dtr: "json comment 'dtr model' ",
		Save_lrm: "json comment 'LRM model' ",
		Save_svm: "json comment 'svm model' ",
		Save_plc: "json comment 'plc model' ",
		Save_knn: "json comment 'knn model' ",
		Save_som: "json comment 'som model' ",
		Save_ols: "json comment 'old model' ",
		Save_predict: "json comment predictions ",

		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: `
def pyregress(ctx):
	#Train regressor given (x,y) data, or predict from given x data, where:
	#
	#	Method: regression technique to USE = lrm | svm | pls | knn	| ols | ...
	#	Save_USE: trained model saved here
	#	USE_solver: parameter feed to solver
	#
	global LMS,LRM,OLS,BRR,ENR
	from sklearn import linear_model as LMS
	LRM = LMS.LogisticRegression
	OLS = LMS.LinearRegression
	BRR = LMS.BayesianRidge
	ENR = LMS.ElasticNet
	print BRR,ENR
	#
	def serialize(cls):
		mod = {}
		for key, val in cls.__dict__.items():
			if (type(val) is NP.ndarray) and key[-1:] == "_":
				mod[key] = val.tolist()
			else:
				mod[key] = val
		print "ser", mod
		return mod
	#
	def deserialize(mod, cls):
		for key in mod:
			val = mod[key]
			if type(val) is list:
				setattr(cls, key, NP.array(val))
			else:
				setattr(cls, key, val)
		return cls
	#
	def copy(src, tar):
		for key in src:
			tar[key] = src[key]
		return tar
	#
	print "******************** pyregress ******************"
	#from sklearn.datasets import load_iris
	#x, y = load_iris(return_X_y=True)
	#print "x",x, "y",y
	x = NP.array( ctx['x'] )
	y = NP.reshape( NP.array( ctx['y'] ), (len(x),) ) if 'y' in ctx else None
	use = ctx['Method'].lower()
	USE = use.upper()
	model = ctx['Save_lrm']
	maker = {
		'lrm': LRM,
		'ols': OLS,
		'enr': ENR,
		'brr': BRR
	}
	make = maker[use] if use in maker else None
	solve = {}
	for key in ctx:
		if key.find(use+"_") == 0:
			solve[ key[len(use)+1:].replace("#","_") ] = ctx[key]
	print "solve",use,solve
	#
	if make:
		if y != None:		# requesting a training
			print "x",x.shape,"y",y.shape, make
			cls = deserialize( solve, make() )
			ctx['Save'] = {'Save_'+use: serialize( cls.fit(x,y) )}
		else:		# requesting a prediction
			if model != None:
				cls = deserialize( copy(model, solve), make() )
				ctx['Save'] = {'Save_predict': cls.predict(x).tolist() }
			else:
				ctx['Save'] = {}
				print "model never trained"
		print "saved", ctx['Save']
	else:
		print "invalid method"
`
		
}