"""Reproduce Blog 8 data, statistical results and six figures with Python.

Run this file from any working directory. It does not build or edit the website.
"""
from pathlib import Path
import csv
import json
from simulation import (
    RandomStream, make_population, draw_sample, bootstrap_means,
    confidence_interval, statistics, test_result,
)
from figures import save_figures


def save_csv(path, columns, rows):
    with path.open('w', newline='') as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(columns)
        writer.writerows(rows)


def main():
    # 1. Setup: define project-relative paths, parameters and fixed random streams.
    project_dir = Path(__file__).resolve().parents[1]
    data_dir = project_dir / 'data'
    tables_dir = project_dir / 'results' / 'tables'
    figures_dir = project_dir / 'results' / 'figures'
    for directory in [data_dir, tables_dir, figures_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    parameters = {
        'n': 150, 'mu': 3000, 'B': 1200, 'confidence': 95,
        'R': 1000, 'M': 10000, 'nullMean': 3000, 'alpha': 5,
        'seed': 20261101,
    }
    survey_random = RandomStream(parameters['seed'] + 100)
    bootstrap_random = RandomStream(parameters['seed'] + 200)
    coverage_random = RandomStream(parameters['seed'] + 300)
    null_random = RandomStream(parameters['seed'] + 400)

    # 2. Generate and save data: create the population and select distinct households.
    population = make_population(parameters['mu'])
    sample, household_ids = draw_sample(population, parameters['n'], survey_random)
    assert len(set(household_ids)) == parameters['n']
    assert abs(statistics(population)['mean'] - parameters['mu']) < 1e-8
    save_csv(data_dir / 'population.csv', ['household_id', 'monthly_spending'],
             enumerate(population, start=1))
    save_csv(data_dir / 'sample.csv', ['draw_id', 'household_id', 'monthly_spending'],
             ((i+1, household_ids[i], value) for i, value in enumerate(sample)))

    # 3. Analyze and save results.
    # 3a. Resample the observed survey with replacement and take percentile endpoints.
    bootstrap = bootstrap_means(sample, parameters['B'], bootstrap_random)
    interval = confidence_interval(bootstrap, parameters['confidence'])
    save_csv(tables_dir / 'bootstrap.csv', ['resample_id', 'mean'], enumerate(bootstrap, start=1))

    # 3b. Draw a fresh survey for each coverage experiment; construct one CI per survey.
    coverage = []
    for experiment in range(parameters['R']):
        fresh_sample, _ = draw_sample(population, parameters['n'], coverage_random)
        fresh_means = bootstrap_means(fresh_sample, parameters['B'], coverage_random)
        lower, upper = confidence_interval(fresh_means, parameters['confidence'])
        covers = lower <= parameters['mu'] <= upper
        coverage.append({'low': lower, 'high': upper, 'covers': covers})
    save_csv(tables_dir / 'coverage.csv',
             ['experiment_id', 'lower', 'upper', 'covers_true_mean'],
             ((i+1, row['low'], row['high'], int(row['covers'])) for i, row in enumerate(coverage)))

    # 3c. Generate the null distribution, recalculating the standard error in each survey.
    null_population = make_population(parameters['nullMean'])
    null_statistics = []
    for simulation in range(parameters['M']):
        null_sample, _ = draw_sample(null_population, parameters['n'], null_random)
        null_summary = statistics(null_sample)
        statistic = (null_summary['mean'] - parameters['nullMean']) / null_summary['se']
        null_statistics.append(statistic)
    hypothesis_test = test_result(null_statistics, sample, parameters)
    save_csv(tables_dir / 'null_statistics.csv', ['simulation_id', 't'],
             enumerate(null_statistics, start=1))
    summary = {
        'parameters': parameters, 'sample': statistics(sample), 'ci': interval,
        'coverage': sum(row['covers'] for row in coverage) / parameters['R'],
        'test': hypothesis_test,
    }
    (tables_dir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')

    # 4. Create and save the six figures from the analysis objects above.
    # SVG geometry, colors and labels match the interactive JavaScript charts.
    save_figures(figures_dir, population, sample, bootstrap, interval,
                 coverage, null_statistics, hypothesis_test, parameters)
    print(json.dumps(summary, indent=2))
    print('Saved data to', data_dir)
    print('Saved tables and figures to', tables_dir.parent)


if __name__ == '__main__':
    main()
