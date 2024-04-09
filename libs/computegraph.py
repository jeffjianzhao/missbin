import sys
import networkx as nx
from networkx.algorithms import bipartite
import json


def main():
	lines = sys.stdin.readlines()
	data = json.loads(lines[0])

	graph = nx.Graph()
	graph.add_nodes_from(data['nodes0'], bipartite = 0)
	graph.add_nodes_from(data['nodes1'], bipartite = 1)
	graph.add_edges_from(data['links'])

	c = max(nx.connected_components(graph), key=len)
	graph = graph.subgraph(c)

	nodes0, nodes1 = nx.bipartite.sets(graph)
	closeness = bipartite.centrality.closeness_centrality(graph, nodes0)
	betweenness = bipartite.centrality.betweenness_centrality(graph, nodes0)
	degrees = bipartite.centrality.degree_centrality(graph, nodes0)
	
	print(json.dumps({'closeness': closeness, 'betweenness': betweenness, 'degree': degrees}))

if __name__ == '__main__':
	main()


