"""Save the same six SVG views used by the interactive article, using Python only."""
import math
from html import escape
from decimal import Decimal, ROUND_HALF_UP
from simulation import mean

INK, TEAL, ORANGE, GRID = '#263b39', '#207d78', '#bf603f', '#e5e9e3'


def fmt(value):
    if abs(value) >= 100:
        return f'{math.floor(value + 0.5):,}'
    rounded = Decimal(float(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return format(rounded, 'f').rstrip('0').rstrip('.') if rounded else '0'


def text(x, y, label, extra=''):
    return f'<text x="{x}" y="{y}" {extra}>{escape(str(label))}</text>'


def frame(title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 310" role="img" aria-label="{escape(title)}">'
            f'<title>{escape(title)}</title><style>text{{font-family:Arial,sans-serif;font-size:12px;fill:{INK}}} '
            '.small{font-size:11px}</style>' + body + '</svg>')


def histogram(values, title, xlabel, domain=None, lines=(), shade=None, interval=None):
    lower, upper = domain if domain is not None else (min(values), max(values))
    if lower == upper:
        upper = lower + 1
    bins, counts = 40, [0] * 40
    step = (upper - lower) / bins
    for value in values:
        index = max(0, min(bins - 1, math.floor((value - lower) / step)))
        counts[index] += 1
    maximum = max(counts) / len(values) * 100
    x = lambda value: 58 + (value - lower) / (upper - lower) * 632
    y = lambda value: 250 - value / maximum * 184
    body = text(58, 22, title, 'font-weight="bold"')
    body += text(58, 44, 'Share of observations (%)', 'class="small"')
    for i in range(5):
        value = maximum * i / 4
        body += f'<path d="M58 {y(value)}H690" stroke="{GRID}"/>'
        body += text(50, y(value) + 4, fmt(value), 'text-anchor="end"')
    if interval:
        body += f'<rect x="{x(interval[0])}" y="60" width="{x(interval[1])-x(interval[0])}" height="190" fill="{TEAL}" opacity=".1"/>'
    for i, count in enumerate(counts):
        midpoint = lower + (i + .5) * step
        top = y(count / len(values) * 100)
        color = ORANGE if shade and shade(midpoint) else TEAL
        body += (f'<rect x="{x(lower+i*step)+.4}" y="{top}" width="{632/bins-.8}" height="{250-top}" '
                 f'fill="{color}" opacity=".8"><title>{fmt(lower+i*step)}–{fmt(lower+(i+1)*step)}: '
                 f'{count} observations</title></rect>')
    for i in range(5):
        value = lower + i * (upper - lower) / 4
        body += text(x(value), 269, fmt(value), 'text-anchor="middle"')
    body += text(374, 298, xlabel, 'text-anchor="middle"')
    for i, line in enumerate(lines):
        position = max(58, min(690, x(line['value'])))
        color = line.get('color', ORANGE)
        dash = '5 4' if line.get('dash') else 'none'
        body += f'<path d="M{position} 62V250" stroke="{color}" stroke-width="2" stroke-dasharray="{dash}"/>'
        anchor = 'start' if 'labelX' in line else 'end'
        body += text(line.get('labelX', 690), line.get('labelY', 36 + i*15),
                     line['label'] + ': ' + fmt(line['value']), f'text-anchor="{anchor}" class="small"')
    return frame(title, body)


def coverage_chart(rows, true_mean):
    shown = rows[:100]
    lower = min([row['low'] for row in shown] + [true_mean])
    upper = max([row['high'] for row in shown] + [true_mean])
    x = lambda value: 58 + (value - lower) / (upper - lower) * 632
    body = text(58, 22, 'Figure 4 · Does each interval capture the truth?', 'font-weight="bold"')
    body += text(58, 43, f'First {len(shown)} independent samples · teal = covers μ; orange = misses μ', 'class="small"')
    for i, row in enumerate(shown):
        y = 60 + i * 190 / len(shown)
        color = TEAL if row['covers'] else ORANGE
        status = 'covers' if row['covers'] else 'misses'
        body += (f'<path d="M{x(row["low"])} {y}H{x(row["high"])}" stroke="{color}" stroke-width="1.4">'
                 f'<title>Sample {i+1}: ${fmt(row["low"])}–${fmt(row["high"])}; {status}</title></path>')
    body += f'<path d="M{x(true_mean)} 52V252" stroke="{INK}" stroke-width="2"/>'
    for i in range(5):
        value = lower + i * (upper - lower) / 4
        body += text(x(value), 272, fmt(value), 'text-anchor="middle"')
    body += text(374, 298, 'Confidence interval for mean monthly spending ($)', 'text-anchor="middle"')
    return frame('Repeated-sample confidence interval coverage', body)


def save_figures(directory, population, sample, bootstrap, interval, coverage, null_statistics, test, parameters):
    true_mean = parameters['mu']
    spending_domain = [0, math.ceil(max(population) / 1000) * 1000]
    observed, critical = test['observed'], test['critical']
    null_domain = [min(min(null_statistics), -abs(observed))-.2,
                   max(max(null_statistics), abs(observed))+.2]
    figures = {
        'population': histogram(population, 'Figure 1 · The simulated population',
            'Monthly household spending ($)', spending_domain,
            [{'value': true_mean, 'label': 'True mean μ'}]),
        'sample': histogram(sample, 'Figure 2 · Your randomly drawn sample',
            'Monthly household spending ($)', spending_domain,
            [{'value': true_mean, 'label': 'True mean μ', 'dash': True},
             {'value': mean(sample), 'label': 'Sample mean', 'color': INK}]),
        'bootstrap': histogram(bootstrap, 'Figure 3 · Means from resampling your sample',
            'Bootstrap sample mean ($)', [min(min(bootstrap),true_mean)*.995, max(max(bootstrap),true_mean)*1.005],
            [{'value': interval[0], 'label': 'Lower CI', 'dash': True},
             {'value': interval[1], 'label': 'Upper CI', 'dash': True},
             {'value': true_mean, 'label': 'True mean μ', 'color': INK, 'labelX': 58, 'labelY': 59}], interval=interval),
        'coverage': coverage_chart(coverage, true_mean),
        'null': histogram(null_statistics, 'Figure 5 · What happens if the null is true?',
            'Test statistic t = (sample mean − null mean) / SE', null_domain,
            [{'value': observed, 'label': 'Observed t', 'color': INK},
             {'value': -critical, 'label': 'Rejection boundary', 'dash': True},
             {'value': critical, 'label': 'Rejection boundary', 'dash': True}], shade=lambda value: abs(value)>=critical),
        'pvalue': histogram(null_statistics, 'Figure 6 · How extreme is your result?',
            'Simulated null test statistic (standard errors)', null_domain,
            [{'value': -abs(observed), 'label': '−|observed t|', 'dash': True},
             {'value': abs(observed), 'label': '+|observed t|', 'dash': True}], shade=lambda value: abs(value)>=abs(observed)),
    }
    for name, svg in figures.items():
        (directory / (name + '.svg')).write_text(svg)
