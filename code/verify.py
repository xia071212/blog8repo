"""Check the sampling and inference calculations independently of the main run."""
import math
from simulation import (RandomStream, draw_sample, bootstrap_means,
                        confidence_interval, quantile, statistics, test_result)


def main():
    assert quantile([0, 10, 20], .25) == 5
    assert statistics([1, 2, 3])['se'] == 1 / math.sqrt(3)
    population = list(range(20000))
    for size in [10, 150, 1000, 20000]:
        values, ids = draw_sample(population, size, RandomStream(123))
        assert len(values) == len(set(ids)) == size
        assert all(value == household_id - 1 for value, household_id in zip(values, ids))
    try:
        draw_sample([1, 2], 3, RandomStream(1))
        raise AssertionError('Oversized sample was accepted')
    except ValueError:
        pass
    values = bootstrap_means([1, 9], 500, RandomStream(123))
    assert 1 in values and 9 in values  # Repeated observations are possible.
    assert values == bootstrap_means([1, 9], 500, RandomStream(123))
    narrow = confidence_interval(values, 80)
    wide = confidence_interval(values, 99)
    assert wide[0] <= narrow[0] <= narrow[1] <= wide[1]
    null = [-3, -1, 0, 1, 3]
    result = test_result(null, [1, 2, 3], {'nullMean': 1, 'alpha': 5})
    assert result['extreme'] == 2
    assert result['pvalue'] == 3 / 6
    assert not result['reject']
    assert test_result(list(range(-100, 101)), [1000, 1001, 1002],
                       {'nullMean': 0, 'alpha': 5})['reject']
    print('Passed: sampling without replacement, bootstrap replacement, reproducibility,')
    print('known quantile/SE, interval nesting, exact p-value counts and rejection.')


if __name__ == '__main__':
    main()
