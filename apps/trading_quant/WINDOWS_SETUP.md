# Windows Development Guide

Welkom op je laptop! Om de development van Neural Nexus / OrionX voort te zetten op Windows, volg je deze stappen:

## 1. Prerequisites
Zorg dat je de volgende tools geïnstalleerd hebt op Windows:
- **Node.js** (LTS versie) - Nodig voor `server.js` en de API's.
- **Python 3** - Nodig voor `serve_dashboard.py` (indien we die nog gebruiken voor specifieke scripts) en `solana_quant_bot`.
- Optioneel: **Ollama voor Windows** (Als je lokale modellen zoals `hermes3:8b` wilt draaien op je laptop GPU).

## 2. Opstarten
We hebben een speciaal script voor je klaargezet. 
Dubbelklik op **`start_windows.bat`**. 
Dit script zal automatisch:
1. ExpressJS installeren als dependencies missen.
2. De `server.js` Orion-node opstarten (Poort 3000).
3. De `omni_qa_agents.js` Guardian agents lanceren.

## 3. Paden Aanpassen (Termux -> Windows)
**Belangrijk:** In de code (`server.js`, `omni_qa_agents.js`) staan momenteel hardcoded Termux-paden, zoals:
`/data/data/com.termux/files/home/.omni/todo.json`

Als je op Windows verder ontwikkelt, zul je in de volgende sessie een functie moeten schrijven (of mij de opdracht moeten geven) om dynamische paden te gebruiken:
```javascript
const path = require('path');
const todoPath = path.join(__dirname, 'todo.json');
```
Dit is de eerste taak die we op de laptop zullen oppakken!

Succes op de Windows omgeving!
