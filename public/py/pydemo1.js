module.exports = {
	keys: {
		Save: "json",
		Description: "mediumtext",
		Pipe: "json",
		Test: "text",
		a: "float comment 'a param' "
	},

	docs: {
		Test: `
blog markdown documents a usecase:

	Das all

`,
		Save: `
here is some long winded comment
with a fancy eqn !$ \\alpha = 123 $ and get this ...
$$ \\beta = \\alpha + 1 $$ and a plot [plot;100;100](/data/energy.json;x=name;y=name) and a ref #{now} time.
the end. ` 
	},

	engine: `
def pydemo1(ctx):
	print "welcome to python you lazy bird"
	#print "sql", SQL0

	#SQL0.execute("SELECT * from app.Htest", () )
	#for (rec) in SQL0:
	#	print rec

	ctx['Save'] = [ {'x':1, 'y':2, 'z':0}, {'x':3, 'y':4, 'z':10}]
`
/*
#from testlib import *
#print "loc", locals()
import testlib as TLIB

def pydemo1(ctx, os):
	print "welcome to python you lazy bird"
	print "test",os['TLIB'].testf(123)

	SQL0 = os['SQL0']
	SQL0.execute("SELECT * from app.Htest", () )
	#SQL0.execute("SELECT 1 as x, 2 as y", () )
	for (rec) in SQL0:
		print rec

	return [ {'x':1, 'y':2, 'z':0}, {'x':3, 'y':4, 'z':10}]
`*/
};
