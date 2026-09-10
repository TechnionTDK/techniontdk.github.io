---
title: Computing Optimal Repairs for Functional Dependencies
authors:
  - Ester Livshits
  - Benny Kimelfeld
  - Sudeepa Roy
venue: PODS
year: 2018
citation: "PODS 2018: 225-237"
links:
  paper: https://arxiv.org/pdf/1712.07705.pdf
areas: [inconsistent-data-management]
---
We investigate the complexity of computing an optimal repair of an inconsistent database, in the case where integrity constraints are Functional Dependencies (FDs). We focus on two types of repairs: an optimal subset repair (optimal S-repair) that is obtained by a minimum number of tuple deletions, and an optimal update repair (optimal U-repair) that is obtained by a minimum number of value (cell) updates. For computing an optimal S-repair, we present a polynomial-time algorithm that succeeds on certain sets of FDs and fails on others. We prove the following about the algorithm. When it succeeds, it can also incorporate weighted tuples and duplicate tuples. When it fails, the problem is NP-hard, and in fact, APX-complete (hence, cannot be approximated better than some constant). Thus, we establish a dichotomy in the complexity of computing an optimal Srepair. We present general analysis techniques for the complexity of computing an optimal U-repair, some based on the dichotomy for S-repairs. We also draw a connection to a past dichotomy in the complexity of finding a “most probable database” that satisfies a set of FDs with a single attribute on the left hand side; the case of general FDs was left open, and we show how our dichotomy provides the missing generalization and thereby settles the open problem.
