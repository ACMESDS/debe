module.exports = {
	usecase: {
		Save: "json"
	},

	engine: `
function mademo1(ctx,res)
	ctx.Save = ctx.a + ctx.b;
	res(ctx);
end
`
}