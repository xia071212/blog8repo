"""Prepare Blog 8 for the existing Quarto website without publishing it."""
from pathlib import Path
import argparse, re, shutil, zipfile
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--website-dir',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
dest=args.website_dir.resolve();dest.mkdir(parents=True,exist_ok=True)
html=(root/'results/blog8.html').read_text()
lead=re.search(r'<p class="prose lead">(.*?)</p>',html,re.S).group(1)
html=re.sub(r'<header>.*?</header>','',html,count=1,flags=re.S)
html=re.sub(r'<p class="prose lead">.*?</p>','',html,count=1,flags=re.S)
html=re.sub(r'<figure class="hero">.*?</figure>','',html,count=1,flags=re.S)
html=html.replace('../README.md','README.md')
html=html.replace('</style>','html,body{background:#fbf8f1}body{max-width:none;box-shadow:none}main{max-width:none;padding:0 2px}section:first-child{margin-top:0}</style>')
(dest/'interactive.html').write_text(html)
shutil.copy2(root/'assets/household-sampling.png',dest/'illustration.png')
shutil.copy2(root/'README.md',dest/'README.md')
(dest/'blog8.css').write_text('.blog8-post #title-block-header .description{font-style:italic;font-weight:400}\n.blog8-post img[src$="illustration.png"]{max-height:420px;width:100%;object-fit:contain}\n.blog8-post .source-note{font-size:.85rem;border-top:1px solid #ddd;padding-top:1rem}\n')
qmd='''---
title: "How Can One Sample Tell Us About an Entire Population?"
description: "How can a household survey quantify uncertainty and test a claim about average spending?"
author: "Yuting Xia"
date: 2026-11-01
date-format: "MMMM D, YYYY"
categories: [Simulation, Bootstrap, Statistical Inference]
body-classes: blog8-post
image: illustration.png
image-alt: "Watercolor illustration of household survey cards and a neighborhood, connecting a sample to its population."
toc: false
css: blog8.css
resources:
  - interactive.html
  - replication.zip
  - README.md
---

'''+lead+'''

![](illustration.png){fig-alt="An economist studies household survey cards and spending receipts beside a window overlooking the wider community."}

```{=html}
<iframe id="inference-demo" src="interactive.html" title="Interactive household spending: sampling, bootstrap confidence intervals and hypothesis tests" style="width:100%;height:5300px;border:0;" loading="eager"></iframe>
<script>
const inferenceFrame=document.getElementById("inference-demo");
inferenceFrame.addEventListener("load",()=>{
 const main=inferenceFrame.contentDocument.querySelector("main");
 const resize=()=>{inferenceFrame.style.height=Math.ceil(main.getBoundingClientRect().height+30)+"px"};
 new ResizeObserver(resize).observe(main);resize();
});
</script>
```

::: {.source-note}
**Data and replication.** All households are simulated. [GitHub replication repository](https://github.com/xia071212/blog8repo) and [download the complete replication files](replication.zip) or read the [reproduction instructions and model assumptions](README.md). The watercolor illustration is AI-generated; all six analytical figures are computed from the simulation.
:::
'''
(dest/'index.qmd').write_text(qmd)
with zipfile.ZipFile(dest/'replication.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file() and not any(x in p.parts for x in ['.git','__pycache__','node_modules']) and p.name!='.DS_Store':z.write(p,p.relative_to(root))
print(dest)
