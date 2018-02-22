import matplotlib.pyplot as plt
import matplotlib.cm as cm
import math

def trade(N,K,rely0):

	rho0 = 0.5
	FAR = 0.4
	delta = 0
	n = 0
	delay = range(0,K)
	rely = range(0,K)
	#rely0 = 0.5
	
	for k in range (0,K):
		n = n + math.pow(N,k)
		
	print "total cores=",n
	
	for k in range(0,K):
		rho = math.pow(FAR/N,k) * rho0
		delayk = 1/(1+math.pow(rho,2))
		
		print k,delayk
		
		if k == 0:
			delay[k] = delayk
			rely[k] = rely0
		else:
			delay[k] = delay[k-1] + delayk
			print k,math.pow(N,k)
			rely[k] = 1 - math.pow(rely0,math.pow(N,k))

	print delay
	print rely
	
	return (delay,rely)
	
	#plt.plot(delay,rely,'bo')
	#plt.xlabel('Mean Delay')
	#plt.ylabel('Reliability')
	#plt.show()

def trades():
	
	(d,r) = trade(4,4,0.5)
	
	plt.plot(d,r,'bo-')

	(d,r) = trade(4,4,0.9)
	
	plt.plot(d,r,'ro-')

	plt.xlabel('Mean Delay')
	plt.ylabel('Reliability')
	plt.show()
