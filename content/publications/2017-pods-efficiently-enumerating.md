---
title: Efficiently Enumerating Minimal Triangulations
authors:
  - Nofar Carmeli
  - Batya Kenig
  - Benny Kimelfeld
venue: PODS
year: 2017
citation: "PODS 2017: 273-287"
links:
  paper: http://batyak.cswp.cs.technion.ac.il/wp-content/uploads/sites/81/2017/07/tdenum.pdf
areas: [enumeration-algorithms]
selected: true
---
We present an algorithm that enumerates all the minimal triangulations of a graph in incremental polynomial time. Consequently, we get an algorithm for enumerating all the proper tree decompositions, in incremental polynomial time, where “proper”means that the tree decomposition cannot be improved by removing or splitting a bag. The algorithm can incorporate any method for (ordinary, single result) triangulation or tree decomposition, and can serve as an anytime algorithm to improve such a method. We describe an extensive experimental study of an implementation on real data from di↵erent fields. Our experiments show that the algorithm improves upon central quality measures over the underlying tree decompositions, and is able to produce a large number of high-quality decompositions.
