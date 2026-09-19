# NOTICE — p23-rag-graphrag-web-search

## Source of the topic (Источник темы)

This project implements the topic described in catalogue entry **P-023**
(graphrag with web-search flags), as listed in
`<portfolio>/docs/КАТАЛОГ_ПОРТФОЛИО.md` (batch 2, RAG variant #23).

All code, tests, and documentation in this repository are original
(TypeScript, Node 22+), written independently for this portfolio.
No third-party code was copied.

The "web search" part is intentionally **offline**: it does not call any
external API, needs no keys, and does not open network connections. It
emulates a deterministic search over the built-in corpus so the project
can run in CI and in demos without any account or credential.

## Assets

This "web search" is a rule-based, deterministic search over the corpus
graph (entities, relations, communities). It is *not* a real search
engine and makes no network requests. See README.md for the full list of
CLI commands and the environment variables.

## License

MIT. See LICENSE file in the project root (or the "license" field of
package.json). No attribution beyond this NOTICE is required.
