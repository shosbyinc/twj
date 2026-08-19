---
slug: smooth-until-proven-otherwise
rubric: science
title: Smooth Until Proven Otherwise
standfirst: Water pouring from a tap can be modelled by equations whose viscous form emerged in 1822 and 1845. Variants of the same continuum framework underpin modern fluid engineering. Yet for one fundamental three-dimensional case, nobody has proved that every smooth start stays smooth forever.
question: What is being trusted, when the guarantee behind it has never been proved?
formula: ρ(∂u/∂t + u·∇u) = −∇p + µ∇²u + f
hook: Invisible laws shape visible motion.
cover: images/smooth-until-proven-otherwise.jpg
cover_alt: A turquoise spiral of water droplets inside a thin circle, above the Navier–Stokes equation
published: 2026-08-18
author: The Water Journal
status: published
---

## What the equations say

The Navier–Stokes equations are Newton's second law, written for a fluid. Claude-Louis Navier reached them in 1822 by a molecular argument that was, by modern standards, wrong; George Gabriel Stokes arrived at the same equations from continuum reasoning in 1845, and his derivation is the one that survived.

:::figure ρ(∂u/∂t + u·∇u) = −∇p + µ∇²u + f | Navier–Stokes, viscous incompressible form | Navier 1822; Stokes 1845

Read from the left: mass density times acceleration — force per unit volume — where the acceleration of a parcel of water has a term for how the velocity changes in time and a term for the parcel being carried into places where the velocity is different. On the right, the forces — the push of pressure differences, the internal friction of viscosity, and whatever else is acting, gravity included.

For water at everyday speeds a second equation is added, saying that the fluid is incompressible: what flows into any small volume flows out of it.

:::figure ∇·u = 0 | Incompressibility | Continuity at constant density

That is the whole model. It contains no molecules: it treats water as a continuum, a substance that can be subdivided forever. That assumption is part of the idealisation. It becomes important when asking what a hypothetical singularity would mean physically; the mathematical regularity problem exists within the idealised model itself.

- **Known.** Flowing water is governed by the same fundamental equations.
- **Unproven.** The equations are almost two centuries old. No one has proved that their solutions in three dimensions always stay smooth — or found a case where they do not. A proof either way carries a prize of $1,000,000.

## What is actually unknown

The question is not whether Navier–Stokes is useful. It is whether this idealised three-dimensional system can evolve from perfectly smooth finite-energy data into a mathematical singularity. Start with a smooth pattern of motion carrying finite energy, in three dimensions, with no walls and no forcing. Let the equations run. Does the flow stay smooth forever, or can a singularity form in finite time?

That is the Millennium Prize problem, stated by the Clay Mathematics Institute in 2000 and formulated for it by Charles Fefferman. Prove global smoothness, or produce a solution that breaks down. Either answer wins.

The two-dimensional version was settled long ago: in the plane, solutions exist, are unique and stay smooth. Three dimensions is where the problem lives, and the difference is not a technicality. In two dimensions a vortex cannot be stretched along its own axis. In three it can, and stretching a vortex spins it faster, the way a skater pulls their arms in. That mechanism concentrates motion into smaller and smaller regions, and nobody has been able to prove that viscosity always wins the race against it.

What is known sits either side of the gap. In 1934 Jean Leray proved that weak solutions — objects that satisfy the equations in an averaged sense — exist for all time, for any finite-energy start. They may not be unique and they may not be smooth. In 1982 Caffarelli, Kohn and Nirenberg showed that for suitable weak solutions, any singular set must be extraordinarily small: its one-dimensional parabolic Hausdorff measure is zero.

In 2019 Tristan Buckmaster and Vlad Vicol proved non-uniqueness in a broader class of finite-energy weak solutions. Their constructions were not shown to be Leray–Hopf solutions and need not satisfy the standard energy inequality.

That boundary has now moved. In a preprint first posted in 2025 and revised through 2026, Thomas Hou, Yixuan Wang and Changhe Yang give a computer-assisted proof claiming non-uniqueness even within the unforced Leray–Hopf class. It has not yet been through peer review, and it does not settle the Millennium Prize problem: its initial data are scale-invariant and not smooth at the origin, while the prize question begins from smooth data.

:::numbers Clay Mathematics Institute; Fefferman 2000; Leray 1934
$1,000,000 | The Clay Mathematics Institute prize for a proof, or a disproof, of global existence and smoothness.
1 of 7 | Millennium Prize Problems resolved. The Poincaré Conjecture; Grigori Perelman declined the prize.
2 and 3 | Dimensions. Solved in the plane; open in space, where a vortex can be stretched along its own axis.
1934 | Leray's proof that weak solutions exist for all time. Their uniqueness and smoothness have been open ever since.
:::

## It works anyway

None of this stops anyone from using the equations. They are solved numerically every day, at scale, for aircraft and turbines and weather and blood flow and the shape of a bottle neck. The absence of a proof has never grounded a plane.

What engineering does instead is discretise: chop the fluid into cells and step forward in time. The difficulty reappears in practice as computational cost. Turbulent flow contains motion across an enormous hierarchy of scales, from the size of the system down to the smallest dissipative eddies, and resolving all of them directly becomes prohibitively expensive in most high-Reynolds-number engineering flows. So most industrial computation models the small scales rather than resolving them — which works, and is not the same as knowing what the equations do down there.

This is the honest position of the field. The equations are trusted because, within their domain of applicability, they have proved extraordinarily successful — not because global regularity has been proved.

> The equations are not in doubt. Our guarantees about them are.

## Where the hunt is now

Two lines of attack are open. One looks for a proof that smoothness always holds. The other looks for the opposite: an explicit flow that tears itself into a singularity, which would answer the question by counterexample.

The second line has been the more active. Work on related equations — the frictionless Euler equations, and simplified models of them — has produced blow-up results, some of them computer-assisted. In September 2025 a collaboration including Google DeepMind reported the systematic discovery of new families of unstable singularities in three fluid equations, using neural networks trained directly on the equations themselves.

It is worth being precise about what that is and is not. The work discovered families of unstable self-similar singularities in the CCF model, the two-dimensional incompressible porous-media equation and the two-dimensional Boussinesq system, the last of which is closely related to axisymmetric three-dimensional Euler with a boundary. None is a singularity of three-dimensional Navier–Stokes. They are numerical constructions of extraordinary accuracy, intended as the raw material for computer-assisted proofs, not proofs themselves. And they are unstable: they require initial conditions tuned so precisely that any perturbation destroys them. The authors argue that unstable singularities may be exactly what matters for the boundary-free Euler and Navier–Stokes problems, where stable blow-up is not expected.

The headlines that followed said an AI had solved a Millennium Prize problem. It had not. What happened is more interesting and less final: a method that can hunt for objects mathematicians could not previously locate, in equations adjacent to the one that carries the prize.

## What an answer would mean

Suppose someone produces the counterexample: a flow of viscous, incompressible fluid in which a smooth, finite-energy start develops a singularity in finite time. What would have been discovered?

Not that water does this. A blow-up would establish a breakdown of the mathematical continuum solution. Real water would never reach a literal infinity: molecular physics would intervene long before that limit. The result would be a fact about the equations, not evidence that a glass of water can produce infinite velocity.

That is a strange kind of prize question, and it is why it is worth a million dollars rather than a footnote. The equations are the foundation of how a civilisation designs anything that moves through or carries fluid. Not knowing whether the equations can break their own smoothness means not knowing the full terms on which they are being trusted.

The water in a glass is extraordinarily well described by a language written two hundred years ago — a language whose three-dimensional mathematics nobody can yet guarantee for all time.

---

### Sources and notes

**01 — The problem**

C. L. Fefferman, "Existence and smoothness of the Navier–Stokes equation," official problem description, Clay Mathematics Institute Millennium Prize Problems (2000). — the precise statement, in three dimensions, for smooth finite-energy initial data.

J. Leray, "Sur le mouvement d'un liquide visqueux emplissant l'espace," *Acta Mathematica*, vol. 63 (1934), pp. 193–248. — global existence of finite-energy weak solutions.

L. Caffarelli, R. Kohn and L. Nirenberg, "Partial regularity of suitable weak solutions of the Navier–Stokes equations," *Communications on Pure and Applied Mathematics*, vol. 35, no. 6 (1982), pp. 771–831. — the possible singular set is of one-dimensional parabolic Hausdorff measure zero.

T. Hou, Y. Wang and C. Yang, "Nonuniqueness of Leray–Hopf solutions to the unforced incompressible 3D Navier–Stokes Equation," arXiv:2509.25116 (2025–2026). — computer-assisted proof claiming non-uniqueness within the unforced Leray–Hopf class; a preprint, not yet peer-reviewed. The initial data are scale-invariant and not smooth at the origin, so the result does not address the Millennium Prize question.

T. Buckmaster and V. Vicol, "Nonuniqueness of weak solutions to the Navier–Stokes equation," *Annals of Mathematics*, vol. 189, no. 1 (2019), pp. 101–144. — non-uniqueness in a class of finite-energy weak solutions that are not shown to be Leray–Hopf and need not satisfy the energy inequality.

**02 — The current search**

Y. Wang et al., "Discovery of unstable singularities," arXiv:2509.14185 (2025), with Google DeepMind and academic collaborators. — systematic numerical discovery of unstable self-similar singularities in the CCF model, the 2D incompressible porous-media equation and the 2D Boussinesq system, using physics-informed neural networks; presented as candidates for subsequent computer-assisted validation.

J. Chen and T. Y. Hou, "Finite Time Blowup of 2D Boussinesq and 3D Euler Equations with C^1,α Velocity and Boundary," *Communications in Mathematical Physics*, vol. 383, no. 3 (2021), pp. 1559–1667. — blow-up results for related equations.

**Note on evidence**

The 2025 singularity results are numerical, of very high precision, and concern equations related to but not identical with three-dimensional Navier–Stokes. They are described by their authors as a basis for future computer-assisted proofs. No claim that the Millennium Prize problem has been solved is supported by them.

The prize question concerns smooth solutions. Results about weak solutions — existence, partial regularity, non-uniqueness — constrain the landscape without answering it.

Navier's 1822 derivation reached the correct equations from a molecular model now regarded as unsound; the continuum derivation is due to Stokes in 1845. The names on the equations record priority, not a shared method.
