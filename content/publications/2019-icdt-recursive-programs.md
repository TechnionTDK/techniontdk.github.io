---
title: Recursive Programs for Document Spanners
authors:
  - Liat Peterfreund
  - Balder ten Cate
  - Ronald Fagin
  - Benny Kimelfeld
venue: ICDT
year: 2019
citation: "CoRR abs/1712.08198 (2017). To appear in ICDT 2019"
status: to-appear
links:
  paper: https://arxiv.org/pdf/1712.08198.pdf
areas: [text-analysis]
selected: true
---
A document spanner models a program for Information Extraction (IE) as a function that takes as input a text document (string over a finite alphabet) and produces a relation of spans (intervals in the document) over a predefined schema. A well-studied language for expressing spanners is that of the regular spanners: relational algebra over regex formulas, which are regular expressions with capture variables. Equivalently, the regular spanners are the ones expressible in non-recursive Datalog over regex formulas (which extract relations that constitute the extensional database). This paper explores the expressive power of recursive Datalog over regex formulas. We show that such programs can express precisely the document spanners computable in polynomial time. We compare this expressiveness to known formalisms such as the closure of regex formulas under the relational algebra and string equality. Finally, we extend our study to a recently proposed framework that generalizes both the relational model and the document spanners.
