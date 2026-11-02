"""Statistical helpers for the household-spending simulation.

The random stream and arithmetic order match the JavaScript demonstration.
NumPy batches the bootstrap draws; it does not substitute a different RNG.
"""
import math
import numpy as np


class RandomStream:
    """Mulberry32 uniform draws, matching the website's seeded generator."""

    def __init__(self, seed):
        self.state = float(int(seed) & 0xFFFFFFFF)

    def values(self, count):
        # The published JS implementation accumulates its state as a float64.
        # Sequential cumsum preserves that exact stream, including rounding on
        # long runs; bitwise operations then convert each state to uint32.
        increments = np.full(count + 1, float(0x6D2B79F5))
        increments[0] = self.state
        states = np.cumsum(increments)[1:]
        self.state = float(states[-1]) if count else self.state
        values = np.remainder(states, 4294967296).astype(np.uint32)
        mixed = (values ^ (values >> 15)) * (values | np.uint32(1))
        mixed ^= mixed + (mixed ^ (mixed >> 7)) * (mixed | np.uint32(61))
        return ((mixed ^ (mixed >> 14)).astype(np.float64) / 4294967296)


def mean(values):
    # Explicit left-to-right accumulation also works consistently on Python 3.12+.
    total = 0.0
    for value in values:
        total += float(value)
    return total / len(values)


def statistics(values):
    average = mean(values)
    squared_deviations = [(float(value) - average) ** 2 for value in values]
    # Match JavaScript's sum / (n - 1), without an intermediate division by n.
    total = 0.0
    for deviation in squared_deviations:
        total += deviation
    sd = math.sqrt(total / (len(values) - 1))
    return {'mean': average, 'sd': sd, 'se': sd / math.sqrt(len(values))}


def make_population(true_mean, size=20000, seed=71023):
    uniforms = RandomStream(seed).values(size * 2)
    spending = []
    for i in range(size):
        normal = math.sqrt(-2 * math.log(1 - uniforms[2*i])) * math.cos(2 * math.pi * uniforms[2*i+1])
        spending.append(math.exp(0.45 * normal))
    scale = true_mean / mean(spending)
    return [value * scale for value in spending]


def draw_sample(population, size, random):
    """Simple random sample without replacement; return values and household IDs."""
    if not isinstance(size, int) or not 1 <= size <= len(population):
        raise ValueError('Sample size must be between 1 and population size.')
    swaps, sample, household_ids = {}, [], []
    for i, uniform in enumerate(random.values(size)):
        j = i + math.floor(uniform * (len(population) - i))
        picked = swaps.get(j, j)
        swaps[j] = swaps.get(i, i)
        sample.append(population[picked])
        household_ids.append(picked + 1)
    return sample, household_ids


def bootstrap_means(sample, repetitions, random):
    """Resample the observed sample WITH replacement, keeping its original size."""
    sample_array = np.asarray(sample, dtype=np.float64)
    indices = (random.values(repetitions * len(sample)) * len(sample)).astype(np.int64)
    resamples = sample_array[indices].reshape(repetitions, len(sample))
    # cumsum preserves left-to-right sums, rather than NumPy's pairwise sum.
    return (np.cumsum(resamples, axis=1)[:, -1] / len(sample)).tolist()


def quantile(sorted_values, probability):
    position = (len(sorted_values) - 1) * probability
    lower = math.floor(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    return sorted_values[lower] + (position - lower) * (sorted_values[upper] - sorted_values[lower])


def confidence_interval(values, confidence):
    ordered = sorted(values)
    tail = (1 - confidence / 100) / 2
    return [quantile(ordered, tail), quantile(ordered, 1 - tail)]


def test_result(null_statistics, sample, parameters):
    sample_stats = statistics(sample)
    observed = (sample_stats['mean'] - parameters['nullMean']) / sample_stats['se']
    extreme = sum(abs(value) >= abs(observed) for value in null_statistics)
    pvalue = (extreme + 1) / (len(null_statistics) + 1)
    absolute_statistics = sorted(abs(value) for value in null_statistics)
    rank = math.ceil((1 - parameters['alpha'] / 100) * (len(null_statistics) + 1)) - 1
    critical = absolute_statistics[min(len(null_statistics) - 1, rank)]
    return {'observed': observed, 'extreme': extreme, 'pvalue': pvalue,
            'critical': critical, 'reject': pvalue <= parameters['alpha'] / 100}
