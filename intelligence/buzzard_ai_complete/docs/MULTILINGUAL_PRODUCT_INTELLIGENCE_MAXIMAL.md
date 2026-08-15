# BUZZARD MULTILINGUAL PRODUCT INTELLIGENCE MAXIMAL

One product, one canonical ID; unlimited language representations.

## Features

- 59 supported languages (Europe, Nordic, Balkans, Arab)
- RTL support for Arabic variants
- Language detection and query normalization
- Synonym glossary for technical terms
- AI entity normalization pipeline metadata
- Translation schema with terminology lock and human-review gates

## CLI

```bash
cd intelligence
python3 main.py complete-multilingual-health
python3 main.py complete-multilingual-languages
python3 main.py complete-multilingual-normalize --text "Bremsbelag"
python3 main.py complete-multilingual-demo
python3 main.py complete-multilingual-docs
```

## API

- `GET /multilingual/health`
- `GET /multilingual/languages`
- `POST /multilingual/normalize`
- `GET /multilingual/glossary`
- `GET /multilingual/ai-pipeline`
- `GET /multilingual/translation-schema`
- `GET /multilingual/demo`

## Principle

User language → detect → normalize → synonym expansion → canonical entity/category → same product → answer in user language.

Legal, safety, medical, and technical compliance texts require human review.
