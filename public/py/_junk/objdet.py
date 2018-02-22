import cv2

import matplotlib.pyplot as plt
import matplotlib.cm as cm

def tau(itau,otau,state):
	print "in objdet tau machine"
	
def find():
	if 0:
		FEATURES_PATH = "/home/admin/sigma/apps/app1/swag/faces/images/test/"
		CASCADES_PATH = "/home/admin/sigma/apps/app1/swag/faces/cascades/haarcascade_"
		feature_names = [
			"frontalface_alt",
			"eye_tree_eyeglasses" ]
	else:
		FEATURES_PATH = "/home/admin/sigma/python_modules/helipads/images/test/"
		CASCADES_PATH = "/home/admin/sigma/python_modules/helipads/cascades/zfull/"
		feature_names = [
			"cascade" ]
		
	MAXDEPTH = len(feature_names)
	TILES = 6
	
	feature_classifiers = [0] * MAXDEPTH
	objs = [0] * TILES

	MAXDEPTH = len(feature_names)
	
	for depth in range(0,MAXDEPTH):
		print "loading cascade: " + CASCADES_PATH + feature_names[depth] + ".xml"
		feature_classifiers[depth] = cv2.CascadeClassifier(CASCADES_PATH + feature_names[depth] + ".xml")

	for tile in range(5,6):
		print "reading: "+FEATURES_PATH+"tile"+str(tile)+".jpg"
		frame = cv2.imread( FEATURES_PATH+"tile"+str(tile)+".jpg" )
    
		frame = cv2.cvtColor( frame, cv2.COLOR_BGR2GRAY )
		frame = cv2.equalizeHist( frame )
		
		objs[tile] = feature(0,MAXDEPTH,[0,0,0,0],"features",frame,feature_classifiers,feature_names)

		#plt.imshow(frame, cmap = cm.Greys_r)
		#print objs[tile]
		
	plt.show()
		
def feature(depth,maxdepth,mybox,myname,frame,classifiers,names):
	
	objs = []
	
	if depth < maxdepth:
		print "finding: "+names[depth]+" frame="+str(len(frame))+" x "+str(len(frame[0]))
		
		# scaleFactor specifies how much the image size is reduced at each image scale step, and thus defines a 
		# scale pyramid during the detection process.  E.g. 1.05 means reduce size by 5% when going to next image 
		# scale step.  Smaller step sizes will thus increase the chance of detecting the features at diffrent scales. 
		#
		# minNeighbors specifies number is required neighboring detects to declare a single detect.  A higher value
		# results in less detections of higher quality. 3~6 is a good value.
		#
		# minSize defines minimum possible object size: objects smaller than this size are simply ignored.
		#
		# maxSize defines maximum possible object size: objects larger than this size are simply ignored.

		for (x,y,w,h) in classifiers[depth].detectMultiScale( 
			frame, 			# frame to find feature at this depth
			1.01, 			# frame scaling 
			16, 			# minimum number of neighbors
			0, 				# legacy flag not used
			(10,10), 		# minimize acceptable widht,height of feature
			(110,110) ):	# maximal acceptable width,height of feature

			print depth,x,y,w,h

			frame[y,x:x+w] = 255
			frame[y+h,x:x+w] = 255
			frame[y:y+h,x] = 255
			frame[y:y+h,x+w] = 255
			
			objs.append( 
				feature(
					depth+1,
					maxdepth,
					[x,y,w,h],
					names[depth],
					frame[y:y+h, x:x+w],	# rows x cols base at (0,0) = top-left
					classifiers,
					names) )
		
	return {'box': mybox, 'name': myname, 'objs': objs}
