# TASK-011 — Spec UX: Kanban Tasks (Camada Operacional)

**Mockup:** [TASK-011-kanban-v1.png](./TASK-011-kanban-v1.png)  
**Loide · 2026-05-31 · skill `loide-ux`**

## Quem usa

Vitor no cockpit mobile — precisa ver e mover tasks entre colunas em segundos.

## Fluxo

1. Camada **Operacional** (tab 2) → seção Tasks Kanban
2. Scroll horizontal nas 6 colunas
3. Toque no card → drawer/modal editar (título, prioridade, projeto)
4. Botão **+** flutuante (verde) → criar task rápida (título + coluna Backlog)
5. Long-press ou menu ⋮ no card → mover coluna / arquivar

## Estrutura

- **Topbar:** tabs Macro | **Operacional** | Mapa
- **Kanban:** 6 colunas fixas, scroll horizontal, cards compactos
- **Card:** título (2 linhas max), dot prioridade (alta=amarelo, normal=verde, baixa=dim)
- **FAB +** canto inferior direito (acima bottom nav)
- **Bottom nav:** 3 camadas

## Microcopy

| Elemento | Texto |
|----------|-------|
| FAB | + (aria: Nova task) |
| Colunas | Backlog · Planejando · Executando · Revisão · Concluído · Arquivado |
| Empty | Nenhuma task aqui |
| Erro save | Não foi possível salvar. Tente de novo. |

## Notas para Dev

- Implementar em `public/js/kanban.js` + seção em `#layer-2`
- Status DB: `backlog|planejando|executando|revisao|concluido|arquivado`
- Mobile: scroll-snap nas colunas; desktop: colunas visíveis sem scroll se couber
- Reutilizar tokens `app.css`; sem framework
- Drag opcional v1 — troca via menu no card é OK para MVP

## Próximo

- Mockup rabisco captura 1-toque (E4 TASK-011)
- Dev implementa CRUD + kanban view
