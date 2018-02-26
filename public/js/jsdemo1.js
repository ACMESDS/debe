module.exports = {
	usecase: {
		Save: "json",
		M: "int(11)",
		Job: "json",
		Share: "boolean"
	},
	
	engine: function jsdemo1(ctx, res) {
		LOG("jsdemo1 ctx", ctx);
		//LOG("A="+ctx.A.length+" by "+ctx.A[0].length);
		//LOG("B="+ctx.B.length+" by "+ctx.B[0].length);

		ctx.Save = [ {u: ctx.M}, {u:ctx.M+1}, {u:ctx.M+2} ];
		res(ctx);

		LIBS.GET.byStep( ctx, function (evs) {
			LOG(evs);
		});
		//MAT(ctx, "D=A*A'; E=D+D*3; disp(entry); ");
		// LOG( "D=", ctx.D, "E=", ctx.E);
	}
}