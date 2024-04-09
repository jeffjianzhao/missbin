
MissBiN is a visual analysis tool for detecting and examining missing links in bipartite networks. Details about the tool can be found in our publication below.

>Jian Zhao, Maoyuan Sun, Francine Chen, Patrick Chiu. MissBiN: Visual Analysis of Missing Links in Bipartite Networks. Proceedings of the IEEE Visualization and Visual Analytics Conference, pp. 71-75, 2019.

<img src="https://www.jeffjianzhao.com/paper-imgs/missbin.png" width="100%" />

A video demonstration of the system can be viewed [here](https://youtu.be/TGdNhqsr3_g).



# Missing Link Prediction 

## create directories

./results

./outputs 

## setup environment

virtualenv myenv

source myenv/bin/activate

pip install -r requirements.txt

## conduct experiments

python runexp.py

# MissBiN Visualization

## create directories

./data

./tmp

## pre-processing

copy MBEA executable to ./libs

copy <data>.json to ./data

run ./libs/precmpviz.py on <data>.json

## setup environment and run

npm install

gulp