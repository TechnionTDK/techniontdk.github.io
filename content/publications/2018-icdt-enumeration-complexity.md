---
title: Enumeration Complexity of Conjunctive Queries with Functional Dependencies
authors:
  - Nofar Carmeli
  - Markus Kröll
venue: ICDT
year: 2018
citation: "ICDT 2018: 11:1-11:17"
links:
  paper: https://arxiv.org/pdf/1712.07880.pdf
areas: [query-optimization, enumeration-algorithms]
---
We study the complexity of enumerating the answers of Conjunctive Queries (CQs) in the presence of Functional Dependencies (FDs). Our focus is on the ability to list output tuples with a constant delay in between, following a linear-time preprocessing. A known dichotomy classifies the acyclic self-join-free CQs into those that admit such enumeration, and those that do not. However, this classification no longer holds in the common case where the database exhibits dependencies among attributes. That is, some queries that are classified as hard are in fact tractable if dependencies are accounted for. We establish a generalization of the dichotomy to accommodate FDs; hence, our classification determines which combination of a CQ and a set of FDs admits constant-delay enumeration with a linear-time preprocessing. In addition, we generalize a hardness result for cyclic CQs to accommodate a common type of FDs. Further conclusions of our development include a dichotomy for enumeration with linear delay, and a dichotomy for CQs with disequalities. Finally, we show that all our results apply to the known class of “cardinality dependencies” that generalize FDs (e.g., by stating an upper bound on the number of genres per movies, or friends per person).
