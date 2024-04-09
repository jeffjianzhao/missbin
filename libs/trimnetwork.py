import simplejson as json
import sys

def trimnet(filename, num):
	data = json.load(open(filename, 'r'))

	nodes = data['nodes']
	for lk in data['links']:
		if not nodes[0][lk['source']].has_key('degree'):
			nodes[0][lk['source']]['degree'] = 0
		if not nodes[1][lk['target']].has_key('degree'):
			nodes[1][lk['target']]['degree'] = 0

		nodes[0][lk['source']]['degree'] += 1
		nodes[1][lk['target']]['degree'] += 1

	indexmap = [[], []]

	newnodes = [[], []]
	for n in nodes[0]:
		if n.has_key('degree') and n['degree'] > num:
			del n['degree']
			newnodes[0].append(n)
			indexmap[0].append(len(newnodes[0]) - 1)
		else:
			indexmap[0].append(-1)
	for n in nodes[1]:
		if n.has_key('degree') and n['degree'] > num:
			del n['degree']
			newnodes[1].append(n)
			indexmap[1].append(len(newnodes[1]) - 1)
		else:
			indexmap[1].append(-1)


	newlinks = []
	for lk in data['links']:
		lk['source'] = indexmap[0][lk['source']]
		lk['target'] = indexmap[1][lk['target']]
		if lk['source'] != -1 and lk['target'] != -1:
			#lk['weight'] = 1
			newlinks.append(lk)

	data['nodes'] = newnodes
	data['links'] = newlinks

	json.dump(data, open(filename[0:-5] + '_cut.json', 'w'))

if __name__ == '__main__':
	# filename = 'slack_user_conversation_real.json'
	# data = json.load(open(filename, 'r'))
	
	# nodes = data['nodes'][0]
	# for i, n in enumerate(nodes):
	# 	n['attr'] = n['id']  + '-' + n['attr']
	# 	n['id'] = 'U' + str(i)

	# with open('slack_user_conversation.json', 'w') as out:
	# 	json.dump(data, out)

	trimnet(sys.argv[1], sys.argv[2])
	#trimnet('dc_crime_2017>5.json', 0)
	#trimnet('slack_user_conversation.json', 0)

	

