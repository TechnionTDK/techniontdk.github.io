---
title: Probabilistic Inference Over Repeated Insertion Models
authors:
  - Batya Kenig
  - Lovro Ilijasic
  - Haoyue Ping
  - Benny Kimelfeld
  - Julia Stoyanovich
venue: AAAI
year: 2018
citation: "AAAI 2018"
links:
  paper: https://www.cs.drexel.edu/~julia/documents/aaai2018.pdf
areas: [preference-data-management]
selected: true
---
Distributions over rankings are used to model user preferences in various settings including political elections and electronic commerce. The Repeated Insertion Model (RIM) gives rise to various known probability distributions over rankings, in particular to the popular Mallows model. However, probabilistic inference on RIM is computationally challenging, and provably intractable in the general case. In this paper we propose an algorithm for computing the marginal probability of an arbitrary partially ordered set over RIM. We analyze the complexity of the algorithm in terms of properties of the model and the partial order, captured by a novel measure termed the “cover width”. We also conduct an experimental study of the algorithm over serial and parallelized implementations. Building upon the relationship between inference with rank distributions and counting linear extensions, we investigate the inference problem when restricted to partial orders that lend themselves to efficient counting of their linear extensions.
