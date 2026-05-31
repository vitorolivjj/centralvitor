# Central Vitor

Hub de painéis do Vitor — servido em **https://vitoroliv.com**.

Por enquanto exibe uma página "em breve". Os painéis serão adicionados dentro de `public/`.

## Estrutura

```
centralvitor/
├── public/            # raiz web servida pelo nginx
│   └── index.html     # página inicial (em breve)
├── deploy/
│   └── deploy.sh      # atualiza a VPS (git pull) — rodar na VPS
└── README.md
```

Futuros painéis: criar subpastas em `public/` (ex.: `public/maestro/`, `public/financeiro/`).

## Infra

| Item | Valor |
|------|-------|
| Domínio | vitoroliv.com (+ www) |
| VPS | 5.78.215.136 (Ubuntu 24.04) |
| Web server | nginx, root em `/opt/centralvitor/public` |
| SSL | Let's Encrypt (renovação automática) |

## Deploy / atualização

Site estático: basta dar push no `main` e rodar o pull na VPS.

```bash
# na VPS
cd /opt/centralvitor && ./deploy/deploy.sh
```
