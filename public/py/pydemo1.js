module.exports = {
	usecase: {
		Save: "json"
	},
	
	engine: `
def pydemo1(ctx,os):
	print "welcome to python you lazy bird"
	ctx['Save'] = [ {'x':1, 'y':2, 'z':0}, {'x':3, 'y':4, 'z':10}]
	# print ctx
	if True:
		sql = os['SQL0']
		sql.execute("SELECT * from app.Htest", () )
		for (Rec) in sql:
			print Rec
`
}