# How Can One Sample Tell Us About an Entire Population?

An interactive Blog 8 for economics undergraduates. Open [the complete offline article](results/blog8.html) in a modern browser. The repository contains the source code, simulated data, saved figures and interactive article. Read [Blog 8](https://xia071212.github.io/myrepo/blog/posts/post8/) on the website. The [GitHub replication repository](https://github.com/xia071212/blog8repo) contains all files needed to reproduce the results.

## Reproduce

1. Keep `code/`, `data/`, `results/`, and `assets/` together. Install Node.js 20 or newer; no packages or network access are required. Tested with Node.js v20.15.1.
2. Run `code/reproduce.mjs` with Node (from any working directory). This regenerates all data, figures, tables, summary values, and the self-contained article.
3. Open `results/blog8.html`. Reset restores the saved baseline. Controls accept typed numbers within practical bounds; combinations above 500 million bootstrap draws are rejected with an explanation.

## Source and assumptions

All observations are synthetic, not estimates of any actual city. Generate 20,000 lognormal values with log standard deviation 0.45, using Box–Muller normal draws and fixed population seed 71023. Rescale the values so their empirical mean equals μ (up to floating-point precision). This finite empirical distribution is the teaching population. Observed, coverage, and null surveys use simple random sampling **without replacement**, implemented with a partial Fisher–Yates shuffle. Households cannot repeat within a survey. Each new survey starts from the full population, so different surveys are independent and may overlap. Bootstrap resamples alone draw **with replacement** from their observed survey. The ordinary percentile bootstrap and s/√n standard error are small-sampling-fraction approximations without a finite-population correction: n/N is 0.75% by default and at most 5% in the interface. The exact finite-population standard-error correction is √(1 − n/N), approximately 0.996 at baseline. Null simulations use the same without-replacement design as the observed survey, calibrating the test to that design.

The baseline uses μ = $3,000, n = 150, B = 1,200 resamples per interval, 95% confidence, 1,000 independent survey experiments, 10,000 null simulations, μ₀ = $3,000, and α = 5%. The simulation seed is 20261101. Distinct deterministic streams use seed offsets 100 (survey), 200 (bootstrap), 300 (coverage), and 400 (null). Redraw counters affect the observed survey and its bootstrap only; population shape and coverage experiments remain fixed for comparisons. Sampling settings apply with the sampling button; bootstrap and null controls apply within their sections. Unapplied edits are identified in the status message.

For each coverage experiment, draw a fresh survey, produce B new resamples, and take a percentile interval. Quantiles use linear interpolation at position (length − 1) × probability. Coverage uses all experiments; Figure 4 shows the first 100. Monte Carlo standard error for coverage is √[coverage × (1 − coverage) / experiments]. A 95% percentile interval is approximate; low n, skewness, and finite B can reduce coverage. There is no filtering or seed search to force 95%.

The test uses t = (sample mean − μ₀)/(sample standard deviation / √n), with sample variance denominator n − 1. Null surveys come from the same population shape rescaled to μ₀. Thus this is a simulated **model-specific** test, not a distribution-free test of a mean and not an assumed theoretical Student t curve. Recompute both mean and standard error in each null survey. Extremeness is ordered by |t|: p = (1 + number of null |t| values ≥ observed |t|)/(M + 1). Reject if p ≤ α. The rejection boundary is the corresponding order statistic of simulated |t| (rank ceil[(1 − α)(M + 1)]). Histogram bins approximate the shaded boundaries; readouts and decisions use unbinned values. At very small α with few simulations the attainable p-value resolution is 1/(M + 1).

Changing confidence updates the percentile interval; changing α updates the null rejection region. They are separate controls. A percentile bootstrap CI and this model-specific test are not guaranteed to give exactly equivalent decisions.

## Organization and outputs

The entry script follows the classroom `reproducibility_demo.Rmd` structure: numbered setup, data generation, analysis with saved results, then figures. It uses JavaScript so the offline article and command-line replication execute the same statistical functions, avoiding inconsistent implementations.

| File | Purpose |
|---|---|
| `code/reproduce.mjs` | Numbered entry point, project-relative paths, saves results and assembles article |
| `code/simulation.mjs` | Seeded generator, sampling, bootstrap, coverage, simulated null test |
| `code/build_blog_assets.py` | Optional website packaging: copies the article and illustration into a Quarto post and creates the replication download; uses Python standard library |
| `code/verify.mjs` | Numerical checks for deterministic reproduction, quantiles, standard error, arbitrary inputs, CI nesting, p-values and rejection |
| `assets/household-sampling.png` | AI-generated watercolor theme illustration, embedded in the offline article; not a statistical figure |
| `code/charts.mjs` | Shared, labeled SVG figures |
| `code/article.html`, `style.css`, `app.js` | Editable English article, presentation, and interactive controls |
| `data/population.csv` | `household_id`, `monthly_spending`: exact 20,000-household population used in Figure 1 |
| `data/sample.csv` | `draw_id`, `household_id`, `monthly_spending`: distinct sampled households in Figure 2 |
| `results/bootstrap.csv` | `resample_id`, `mean`: plotted in Figure 3 |
| `results/coverage.csv` | `experiment_id`, `lower`, `upper`, `covers_true_mean` (0/1): Figure 4 and full coverage count |
| `results/null_statistics.csv` | `simulation_id`, `t`: Figures 5–6 |
| `results/summary.json` | Parameters, sample statistics, CI, coverage, test result, tested runtime |
| `results/figures/*.svg` | Six saved baseline figures, generated by the same code as the live plots |
| `results/blog8.html` | Complete offline article, including source engine, baseline arrays and controls |

Dollar amounts are monthly spending per household. There are no missing values, external inputs, joins, or unpublished survey records. No dependencies file is needed because only Node's standard library is used. Article prose is 749 words, excluding controls, figures, readouts, title and footer; the build reports its exact whitespace-based count.

## Validation

Numerical checks in `code/verify.mjs` verify sampling without replacement, bootstrap replacement, reproducibility, quantiles, standard errors, interval nesting, p-value counts and rejection decisions. The baseline covers the true mean in 941 of 1,000 surveys (94.1%). Browser controls support arbitrary numeric values within the stated limits; computations run in a worker.
