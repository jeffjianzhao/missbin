import random, sys, os, time
import numpy as np
import simplejson as json
import pickle

import sys
predictdir = os.path.abspath('../../linkprediction')
sys.path.insert(0, predictdir)

from linkpredict import *
from runexp import *


if __name__ == '__main__':
	methods = ['bc_jaccard', 'bc_common_neighbors', 'bc_adamic_adar', 'bc_preferential_attachement', 'bc_random_walk']

	#inputFile = 'tm_dc_crime_2017>5.json'
	inputFile = sys.argv[1]
	weighted = False

	with open(inputFile, 'r') as inf:
		data = json.load(inf)
		rowNum = len(data['nodes'][0])
		colNum = len(data['nodes'][1])

		relMatrix = np.zeros([rowNum, colNum])
		if weighted:
			for lk in data['links']:
				relMatrix[lk['source'], lk['target']] = lk['weight']
		else:
			for lk in data['links']:
				relMatrix[lk['source'], lk['target']] = 1	# binary network
			

	lknum = np.sum(np.count_nonzero(relMatrix, axis = 0))
	print('{0} links, {1} nodes'.format(lknum, relMatrix.shape))

	bicresults_dict = dict(bicluster_driven_mbea(relMatrix, 0.0, predictdir + '/../libs-mac/MBEA', [2, 2], ## 
		predictdir + '/outputs/mbeaInput.txt', predictdir + '/outputs/bics_initial.txt'))

	results, times = runPrediction(relMatrix, methods, weighted, bicresults_dict)

	for midx, ranklist in enumerate(results):
		ouputData = []
		for lk in ranklist:
			r, c = lk[0].split("--")
			ouputData.append({'source':r, 'target':c, 'weight':lk[1]})

		json.dump(ouputData, open(inputFile + '-' + methods[midx] + '.json', 'w'))