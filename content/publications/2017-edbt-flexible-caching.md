---
title: Flexible Caching in Trie Joins
authors:
  - Oren Kalinsky
  - Yoav Etsion
  - Benny Kimelfeld
venue: EDBT
year: 2017
citation: "EDBT 2017: 282-293"
links:
  paper: https://arxiv.org/pdf/1602.08721.pdf
areas: [query-optimization]
---
Traditional algorithms for multiway join computation are based on rewriting the order of joins and combining results of intermediate subqueries. Recently, several approaches have been proposed for algorithms that are “worst-case optimal” wherein all relations are scanned simultaneously. An example is Veldhuizen’s Leapfrog Trie Join (LFTJ). An important advantage of LFTJ is its small memory footprint, due to the fact that intermediate results are full tuples that can be dumped immediately. However, since the algorithm does not store intermediate results, recurring joins must be reconstructed from the source relations, resulting in excessive memory traffic. In this paper, we address this problem by incorporating caches into LFTJ. We do so by adopting recent developments on join optimization, tying variable ordering to tree decomposition. While the traditional usage of tree decomposition computes the result for each bag in advance, our proposed approach incorporates caching directly into LFTJ and can dynamically adjust the size of the cache. Consequently, our solution balances memory usage and repeated computation, as confirmed by our experiments over SNAP datasets.
