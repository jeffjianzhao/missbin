
MissBiN is a visual analysis tool for detecting and examining missing links in bipartite networks. Details about the tool can be found in our publications below.

>Jian Zhao, Maoyuan Sun, Francine Chen, Patrick Chiu. Understanding Missing Links in Bipartite Networks with MissBiN. IEEE Transactions on Visualization and Computer Graphics, 28(6), pp. 2457-2469, 2022.

>Jian Zhao, Maoyuan Sun, Francine Chen, Patrick Chiu. MissBiN: Visual Analysis of Missing Links in Bipartite Networks. Proceedings of the IEEE Visualization and Visual Analytics Conference, pp. 71-75, 2019.

<img src="https://www.jeffjianzhao.com/paper-imgs/missbin.png" width="100%" />

A video demonstration of the system can be viewed [here](https://youtu.be/TGdNhqsr3_g).



# Data Inputs

Currently, the tool loads a bipartite network and precomputed predicted links using various methods (e.g., adamic adar, preferential attachment, etc.). All inputs need to be in the JSON format. The bipartite network should be:

```
{
    "nodes": [
        [   # nodes in the first group of the bipartite network
            {
                "id": str,      # node name id
                "attr": [...]   # array of node attributes (can be empty)
            },
            ...
        ],
        [   # nodes in the second group of the bipartite network
            {"id": str, "attr": [...]},
            ...
        ]
    ],
    links: [
        {
            "source": int,  # index of the node in the first group
            "target": int,  # index of the node in the second group 
            "weight": float,    # link weight (for unweighted network, setting all to 1.0)
            "attr":[...]    # array of link attributes (can be empty)
        },
        ...
    ]
}
```

The predicted links of the bipartite network should be:
```
[
    {
        "source": int,  # index of the node in the first group
        "target": int,  # index of the node in the second group 
        "weight": float,    # prediction probability 
    },
]
```

If no visualization of predicted links is needed, just use an empty array. 

Examples are provided based on the Crescent dataset [1] in `data/`, which includes the bipartite network `crescent.json` and results of different link prediction methods (`crescent-[method].json`) as well as one without prediction `crescent-none.json`. 

[1] Hughes, F., & Schum, D. (2003). Discovery-proof-choice, the art and science of the process of intelligence analysis-preparing for the future of intelligence analysis. Washington, DC: Joint Military Intelligence College.

# Required Software

[Node.js](https://nodejs.org/en) is required to run the code. This code is tested with:
* Node.js v20.12.1
* npm v10.5.1

[MBEA (Maximal Biclique Enumeration Algorithm)](https://github.com/ddervs/MBEA) is required to compute biclusters. A complied binary on MacOSX is placed in `libs/` and you should build your own on your platform. If you do not need to visualize biclusters, you can ignore it.

[NetworkX](https://networkx.org/) is used to calculate various network metrics, which is required by `libs/computegraph.py`.  

[clusterfck]() is needed to perform hierarchical clustering on the network nodes. Since this package is no longer available on npm, you need to manually install it (see below).

# MissBiN Web Application

Use the following steps to run the web application:

* create a directory `tmp/` in the main folder, which is used to store MBEA outputs
* if necessary, edit the names of the data files in `js/main.js`: 
  ```
    var app_parameter = {
        // need to consistent with the data folder on the server side
        data: 'data/crescent.json',
        prediction_methods: ['none', 'bc_adamic_adar', 'bc_common_neighbors', 'bc_jaccard', 'bc_preferential_attachement', 'bc_random_walk']
    };
  ```
* run `npm install`
* copy and paste the extracted `clusterfck.zip` to `node_modules\`
* run `./node_modules/.bin/gulp`
* visit `http://localhost:8000/`

