from PIL import Image

CHIP = 0
LAPROWS = 75
LAPCOLS = 75
IMROWS = 0
IMCOLS = 0
MAXROWS = 256
MAXCOLS = 256

def Chip(itau,otau,state):
	global CHIP, IMROWS,IMCOLS, LAPROWS,LAPCOLS, MAXROWS,MAXCOLS
	
	port = state['index']
	job = itau[port]['job']
	
	CHIP = Image.open(job)
		
	print "hack Chip:"+job, CHIP.bits, CHIP.size, CHIP.format, CHIP.mode
	
	IMCOLS = CHIP.size[0]
	IMROWS = CHIP.size[1]
	
def Water(itau,otau,state):
	global CHIP, IMROWS,IMCOLS, LAPROWS,LAPCOLS, MAXROWS,MAXCOLS
	
	for stream in range(0,len(otau)):
		job = otau[stream]['job']
		print "hack Water:" + job
		otau[stream]['job'] = ""
	
def Land(itau,otau,state):
	global CHIP, IMROWS,IMCOLS, LAPROWS,LAPCOLS, MAXROWS,MAXCOLS

	stream = 0
	streams = len(otau)
	
	for row in range(0,IMROWS,MAXROWS-LAPROWS):
		rows = min(MAXROWS, IMROWS-row)
		if rows<LAPROWS:
			row = max(0,IMROWS-MAXROWS)
			rows = IMROWS-row
			
		for col in range(0,IMCOLS,MAXCOLS-LAPCOLS):
			cols = min(MAXCOLS, IMCOLS-col)
			if cols<LAPCOLS:
				col = max(0,IMCOLS-MAXCOLS)
				cols = IMCOLS-col
			
			if stream < streams:
				job = otau[stream]['job']
				stream = stream + 1
				print "hack Land:" + job, col,row, col+cols,row+rows, stream,streams
				
				CHIP.crop( (col,row, col+cols,row+rows) ).save(job + ".jpg")

def tau(itau,otau,state):
	
	#print state
	print "python sample i=0:"  + str(len(itau)-1) + " o=0" + str(len(otau)-1)
