# json-render vs ingenui — experiment results

800 responses. Token counts: count_tokens with claude-haiku-5-5.

## System prompt (same catalog)

| | chars | tokens |
|---|---:|---:|
| ingenui | 4213 | 1570 |
| json-render | 16452 | 6032 |

## UI tokens of actual responses

Successful responses (ingenui 393, json-render 395), UI part only: ingenui 351 vs json-render 969 tokens on average — **×2.76**.

| task | ingenui (mean) | json-render (mean) | ratio |
|---|---:|---:|---:|
| product | 250 | 712 | ×2.84 |
| dashboard | 285 | 881 | ×3.09 |
| profile | 236 | 718 | ×3.04 |
| order | 248 | 788 | ×3.18 |
| weather | 397 | 1196 | ×3.01 |
| plans | 548 | 1694 | ×3.09 |
| team | 496 | 749 | ×1.51 |
| incident | 340 | 1008 | ×2.97 |

## Same UI, two notations

Slides' product sample: JSX 250 tokens vs SpecStream 637 tokens.

Real model output (377 valid ui+jsx blocks, each converted to the equivalent SpecStream): JSX 130055 tokens vs SpecStream 361942 tokens — **×2.78**.

| task | blocks | JSX (mean) | SpecStream (mean) | ratio |
|---|---:|---:|---:|---:|
| product | 50 | 250 | 659 | ×2.63 |
| dashboard | 49 | 283 | 874 | ×3.09 |
| profile | 50 | 236 | 679 | ×2.88 |
| order | 50 | 248 | 699 | ×2.82 |
| weather | 32 | 387 | 1212 | ×3.13 |
| plans | 50 | 548 | 1681 | ×3.07 |
| team | 46 | 494 | 1042 | ×2.11 |
| incident | 50 | 339 | 930 | ×2.74 |

## Generation (each library's own prompt, same request)

| condition | format | n | success | (95% CI) | valid | content | UI tokens (median) | output tokens (mean) | latency (median) | $/request | $/success |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| haiku-nothink | ingenui | 160 | **96%** | 91%–98% | 99% | 96% | 302 | 376 | 1.4s | $0.00036 | $0.00037 |
| haiku-nothink | json-render | 160 | **99%** | 96%–100% | 99% | 99% | 818 | 966 | 2.7s | $0.00110 | $0.00111 |
| haiku-low | ingenui | 160 | **100%** | 98%–100% | 100% | 100% | 304 | 427 | 1.6s | $0.00038 | $0.00038 |
| haiku-low | json-render | 160 | **99%** | 96%–100% | 99% | 99% | 796 | 1439 | 4.7s | $0.00133 | $0.00135 |
| sonnet-low | ingenui | 40 | **100%** | 91%–100% | 100% | 100% | 317 | 364 | 2.9s | $0.00702 | $0.00702 |
| sonnet-low | json-render | 40 | **98%** | 87%–100% | 98% | 100% | 989 | 998 | 5.2s | $0.02228 | $0.02285 |
| opus-low | ingenui | 40 | **100%** | 91%–100% | 100% | 100% | 360 | 405 | 3.1s | $0.01486 | $0.01486 |
| opus-low | json-render | 40 | **100%** | 91%–100% | 100% | 100% | 1002 | 984 | 6.8s | $0.04427 | $0.04427 |

### Failure reasons (responses affected)

- **haiku-nothink / ingenui**: content: missing facts / unwired action (6); jsx-error: Unsupported expression in attribute "…": {…} (1)
- **haiku-nothink / json-render**: catalog: elements.*.type: Invalid option: expected one of "…"|"…"|"…"|"…"|"…"|"…"|"…"|"…"| (2)
- **haiku-low / json-render**: spec: Element "…" has "…" but no children. The repeated template must be a child element:  (2)
- **sonnet-low / json-render**: catalog: elements.*.children: Invalid input: expected array, received undefined (1)

### Success per task

| condition | format | product | dashboard | profile | order | weather | plans | team | incident |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| haiku-nothink | ingenui | 20/20 | 14/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 19/20 |
| haiku-nothink | json-render | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 18/20 | 20/20 |
| haiku-low | ingenui | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 |
| haiku-low | json-render | 20/20 | 20/20 | 20/20 | 18/20 | 20/20 | 20/20 | 20/20 | 20/20 |
| sonnet-low | ingenui | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| sonnet-low | json-render | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 4/5 | 5/5 | 5/5 |
| opus-low | ingenui | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| opus-low | json-render | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |
