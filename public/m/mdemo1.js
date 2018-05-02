module.exports = {
	usecase: {
		Save: "json",
		a: "float",
		b: "json"
	},

	engine: `
function Save = mdemo1(ctx)
	Save = ctx.a + ctx.b;
end
`
}