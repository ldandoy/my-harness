<div align="center">
  <img src="docs/banner.svg" alt="my-harness" width="700" />
</div>

<div align="center">

![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![CI](https://github.com/ldandoy/my-harness/actions/workflows/ci.yml/badge.svg)

</div>

> Un harness agentique TypeScript minimaliste construit sur Ollama.  
> Boucle · Outils · Sandbox · Garde-fous — en moins de 400 lignes de code.

## Prérequis

- **Node.js ≥ 24** → [nodejs.org](https://nodejs.org)
- **Ollama** installé et en marche → [ollama.ai](https://ollama.ai)
- Un modèle local : `ollama pull qwen2.5`

## Installation

```bash
git clone https://github.com/ldandoy/my-harness.git
cd my-harness
npm install
```

## Utilisation

```bash
npm run dev "Qu'y a-t-il dans le dossier src ?"
npm run dev "Lance les tests et corrige le code si ça échoue."
```

## Outils disponibles

- `list_directory` Liste un dossier du workspace
- `read_file` Lit un fichier du workspace
- `write_file` Écrit un fichier dans le workspace
- `run_command` Exécute une commande (liste blanche + confirm.)

## .harness/settings.json

`.harness/settings.json` stocke tes permissions de commandes entre les sessions.
Créé automatiquement au premier « Toujours autoriser », ou manuellement.

> **À ajouter dans `.gitignore`** : les permissions sont propres à chaque dev.

## Roadmap

- [x] Commandes autorisées dans un fichier JSON externe
- [x] Restructurer `src/tools/` — `registry.ts` au niveau `src/`
- [x] Restructurer les `types`dans un répertoire
- [x] Ajouter une interface graphique avec Ink
- [ ] Streaming des réponses du modèle

## Licence

[MIT](LICENSE) © 2026 Overconsulting