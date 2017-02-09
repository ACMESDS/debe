import sys
print sys.path
print sys.version
#print sys.prefix
#print sys.exec_prefix

import cv2
print "cv2 imported"

def find(tau0,tau1,tau2):
	FEATURES_PATH = "/home/admin/sigma/node_modules/tauif/machines/opencv/objdet/"
	CASCADES_PATH = "/home/admin/sigma/node_modules/tauif/machines/opencv/objdet/cascades/haarcascade_"
	TILES = 1
	
	print "in find feature"
	print itau
	
	feature_names = [
		"frontalface_alt",
		"eye_tree_eyeglasses"]
		
	MAXDEPTH = len(feature_names)
	
	feature_classifiers = [0] * MAXDEPTH
	objs = [0] * TILES
		
	for depth in range(0,MAXDEPTH):
		print "loading cascade: " + feature_names[depth]
		feature_classifiers[depth] = cv2.CascadeClassifier(CASCADES_PATH + feature_names[depth] + ".xml")

	for tile in range(0,TILES):
		print "reading tile: tile"+str(tile)+".jpg"
		frame = cv2.imread( FEATURES_PATH+"tile"+str(tile)+".jpg" )
    
		frame = cv2.cvtColor( frame, cv2.COLOR_BGR2GRAY )
		frame = cv2.equalizeHist( frame )
		
		objs[tile] = feature(0,MAXDEPTH,[0,0,0,0],"features",frame,feature_classifiers,feature_names)

		print objs[tile]
		
	otau = []
	return otau
		
def feature(depth,maxdepth,mybox,myname,frame,classifiers,names):
	
	objs = []
	
	if depth < maxdepth:
		print "looking for "+names[depth]+" frame="+str(len(frame))+"x"+str(len(frame[0]))
		
		for (x,y,w,h) in classifiers[depth].detectMultiScale( frame, 1.1, 1, 0, (1,1), (100,100) ):
			objs.append( 
				feature(
					depth+1,
					maxdepth,
					[x,y,w,h],
					names[depth],
					frame[y:y+h, x:x+w],
					classifiers,
					names) )
		
	return {'box': mybox, 'name': myname, 'objs': objs}
