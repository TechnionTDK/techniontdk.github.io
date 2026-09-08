---
title: "Document Spanners: A Formal Approach to Information Extraction"
authors:
  - Ronald Fagin
  - Benny Kimelfeld
  - Frederick Reiss
  - Stijn Vansummeren
venue: J. ACM
year: 2015
citation: "J. ACM 62(2): 12:1-12:51 (2015)"
links:
  paper: https://dl.acm.org/citation.cfm?id=2699442
areas: [text-analysis]
selected: true
---
An intrinsic part of information extraction is the creation and manipulation of relations extracted from text. In this article, we develop a foundational framework where the central construct is what we call a *document spanner* (or just *spanner* for short). A spanner maps an input string into a relation over the spans (intervals specified by bounding indices) of the string. The focus of this article is on the representation of spanners. Conceptually, there are two kinds of such representations. Spanners defined in a *primitive* representation extract relations directly from the input string; those defined in an *algebra* apply algebraic operations to the primitively represented spanners. This framework is driven by SystemT, an IBM commercial product for text analysis, where the primitive representation is that of regular expressions with capture variables.

We define additional types of primitive spanner representations by means of two kinds of automata that assign spans to variables. We prove that the first kind has the same expressive power as regular expressions with capture variables; the second kind expresses precisely the algebra of the *regular*spanners—the closure of the first kind under standard relational operators. The *core* spanners extend the regular ones by string-equality selection (an extension used in SystemT). We give some fundamental results on the expressiveness of regular and core spanners. As an example, we prove that regular spanners are closed under difference (and complement), but core spanners are not. Finally, we establish connections with related notions in the literature.
