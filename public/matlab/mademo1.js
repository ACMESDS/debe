module.exports = {
	usecase: {
		Save: "json"
	},

	engine: `
function rtn = mademo1(ctx)
	rtn = ctx.a + ctx.b;
end
`
}