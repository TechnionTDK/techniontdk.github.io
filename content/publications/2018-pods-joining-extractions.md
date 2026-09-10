---
title: Joining Extractions of Regular Expressions
authors:
  - Dominik D. Freydenberger
  - Benny Kimelfeld
  - Liat Peterfreund
venue: PODS
year: 2018
citation: "PODS 2018: 137-149"
links:
  paper: https://arxiv.org/pdf/1703.10350.pdf
areas: [text-analysis, query-optimization, enumeration-algorithms]
---
Regular expressions with capture variables, also known as “regex formulas,” extract relations of spans (interval positions) from text. These relations can be further manipulated via Relational Algebra as studied in the context of document spanners, Fagin et al.’s formal framework for information extraction. We investigate the complexity of querying text by Conjunctive Queries (CQs) and Unions of CQs (UCQs) on top of regex formulas. We show that the lower bounds (NPcompleteness and W\[1\]-hardness) from the relational world also hold in our setting; in particular, hardness hits already single-character text! Yet, the upper bounds from the relational world do not carry over. Unlike the relational world, acyclic CQs, and even gamma-acyclic CQs, are hard to compute. The source of hardness is that it may be intractable to instantiate the relation defined by a regex formula, simply because it has an exponential number of tuples. Yet, we are able to establish general upper bounds. In particular, UCQs can be evaluated with polynomial delay, provided that every CQ has a bounded number of atoms (while unions and projection can be arbitrary). Furthermore, UCQ evaluation is solvable with FPT (Fixed-Parameter Tractable) delay when the parameter is the size of the UCQ.
