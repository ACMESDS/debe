from PIL import Image

print "in test"
#import cv2
#print "loaded cv2"
#import numpy

DATAPATH = "/home/admin/sigma/apps/app1/public/stores/"

maxCols = 200
maxRows = 200
lapCols = 80
lapRows = 80
Q = []

def frame(itau,otau,parm):
	
	print "python frame"
	print itau
	print parm
	otau[0]["job"] = "testjob"
	otau[0]["xyz"] = 456.0  # using 456 gets returned as '' - why?
	otau[0]["work"] = 10.1
	return 123
	
def helipads(itau,otau,parm):

	print "python helipads"
	print otau
	print parm
	return 0

def faces(itau,otau,parm):

	print "python faces"
	print otau
	print parm
	return 0
