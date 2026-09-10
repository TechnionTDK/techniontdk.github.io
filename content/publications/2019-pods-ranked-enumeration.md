---
title: Ranked Enumeration of Minimal Triangulations
authors:
  - Noam Ravid
  - Dori Medini
  - Benny Kimelfeld
venue: PODS
year: 2019
citation: "PODS 2019: 74-88"
links:
  doi: https://doi.org/10.1145/3294052.3319678
  paper: https://arxiv.org/pdf/1709.10254.pdf
areas: [enumeration-algorithms]
---
Tree decompositions facilitate computations on complex graphs by grouping vertices into bags interconnected in an acyclic structure; hence their importance in a plethora of problems such as query evaluation over databases and inference over probabilistic graphical models. Different applications take varying benefits from different tree decompositions, and hence, measure them by diverse (sometime complex) cost functions. For generic cost functions (such as width or fill-in), an optimal tree decomposition can be computed in some cases, notably when the number of minimal separators is bounded by a polynomial (due to Bouchitte and Todinca); we refer to this assumption as “poly-MS.” Yet, in general, finding an optimal tree decomposition is computationally intractable even for these cost functions, and approximations or heuristics are commonly used. Furthermore, the generic cost functions hardly cover the benefit measures needed in practice. Therefore, it has recently been proposed to devise algorithms for enumerating many decomposition candidates for applications to select from using specialized, or even machine-learned, cost functions. We present the first algorithm for enumerating the minimal triangulations of a graph by increasing cost, for a wide class of cost functions. Consequently, we get ranked enumeration of the (non-redundant) tree decompositions of a graph, for a class of cost functions that substantially generalizes the above generic ones. On the theoretical side, we establish the guarantee of polynomial delay if poly-MS is assumed, or if we are interested only in decompositions of a width bounded by a constant. Lastly, we describe an experimental evaluation on graphs of various domains (join queries, Bayesian networks and random graphs), and explore both the applicability of the poly-MS assumption and the performance of our algorithm relative to the state of the art.
