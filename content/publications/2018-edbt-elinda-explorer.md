---
title: "eLinda: Explorer for Linked Data"
authors:
  - Tal Yahav
  - Oren Kalinsky
  - Oren Mishali
  - Benny Kimelfeld
venue: EDBT
year: 2018
citation: "EDBT 2018: 658-661"
links:
  paper: http://openproceedings.org/2018/conf/edbt/paper-271.pdf
areas: [knowledge-bases]
---
To realize the premise of the Semantic Web towards knowledgeable machines, one might often integrate an application with emerging RDF graphs. Nevertheless, capturing the content of a rich and open RDF graph by existing tools requires both time and expertise. We demonstrate eLinda—an explorer for Linked Data. The challenge addressed by eLinda is that of understanding the rich content of a given RDF graph. The core functionality is an exploration path, where each step produces a bar chart (histogram) that visualizes the distribution of classes in a set of nodes (URIs). In turn, each bar represents a set of nodes that can be further expanded through the bar chart in the path. We allow three types of explorations: subclass distribution, property distribution, and object distribution for a property of choice. To efficiently compute the exploration queries, we offer a query engine powered by a worst-case-optimal join algorithm.
