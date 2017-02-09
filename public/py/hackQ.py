from PIL import Image

DATAPATH = "/home/admin/sigma/apps/app1/public/stores/"

maxCols = 200
maxRows = 200
lapCols = 80
lapRows = 80
Q = []
im = 0

def tau(itau,otau,state):
	
	print "push = " + str(state.push)
	print "pull = " + str(state.pull)

	if state.push:	
		ijob = itau[0]['Job']
		print "read from = " + ijob

		im = Image.open(DATAPATH + ijob)
		
		print im.bits, im.size, im.format, im.mode
		
		imCols = im.size[0]
		imRows = im.size[1]
		
		sec = 0
		for row in range(0,imRows,maxRows-lapRows):
			rows = min(maxRows, imRows-row)
			if rows<lapRows:
				row = max(0,ImRows-maxRows)
				rows = min(maxRows, imRows-row)
				
			for col in range(0,imCols,maxCols-lapCols):
				cols = min(maxCols, imCols-col)
				if cols<lapCols:
					col = max(0,ImCols-maxCols)
					cols = min(maxCols, imCols-col)
				
				if Q.length == Qmax:
					state.drops = state.drops+1
					print "drop",col,row,col+cols,row+rows
				else:
					Q.append( {'box': (col,row, col+cols,row+rows), 'job': ijob+str(sec)} )
					print "queue",col,row,col+cols,row+rows
						
				sec = sec + 1
			
	if state.pull:
		state.depth = Q.length

		if Q.length:
			sec = Q.pop()
			im.crop( sec.box ).save(DATAPATH + sec.job,"jpeg")
			print "saved",col,row,col+cols,row+rows

			state['job'] = sec.job
			print "save to = " + sec.job
