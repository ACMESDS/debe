module.exports = {
	usecase: {},
	
	engien: function haar(ctx,res) {
		LIBS.DET.runDetector("haar", ctx, res);
	}
}