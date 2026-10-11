# Próximos passos — Despertar

## Semana de teste: 11/10/2026 a 18/10/2026

Usar o app todos os dias, normalmente, e anotar o que achar (pode ser no bloco de notas do celular).

### O que observar

- [ ] **Lembretes:** chegam na hora certa? Algum deixou de chegar? (A Xiaomi pode bloquear se o app não estiver "sem restrição" de bateria.)
- [ ] **Missões:** estão fáceis ou difíceis demais? Água, flexões, abdominais, agachamentos, passos e horário de dormir.
- [ ] **Passos:** o número bate com o Google Fit? Atualiza ao abrir o app?
- [ ] **Jejum:** os avisos de metade e de fim do jejum chegaram?
- [ ] **Treinos:** registrar séries é rápido? Faltou algum exercício?
- [ ] **XP e níveis:** está subindo rápido ou devagar demais?
- [ ] **Penalidade:** −5 XP por missão perdida está justo, leve ou pesado?
- [ ] **Gráficos e conquistas:** mostram o que você queria ver?
- [ ] **Bugs:** algo travou, sumiu ou mostrou valor errado? Anote o que fez antes de acontecer.

### Pendências rápidas

- [ ] Fazer backup (Configurações → Exportar) e salvar no Drive
- [ ] Atualizar a versão compartilhada do portfólio (menu Compartilhar)
- [ ] Fechar a porta do servidor no PC: `sudo ufw delete allow 8081/tcp`

## Depois da semana de teste

1. **Revisão:** passar as anotações para o Claude e ajustar valores (XP, metas, penalidade, horários).
2. **Corrigir bugs** encontrados.
3. **Novo APK de desenvolvimento** (`npx eas-cli@latest build --profile development --platform android`) antes de programar coisas novas, porque o APK de desenvolvimento antigo não tem os módulos de backup e de ícone.
4. **Escolher novidades** (ideias, nada decidido):
   - Avatar que muda visualmente conforme o rank
   - Missões semanais e "dungeon" de fim de semana (desafio maior com mais XP)
   - Sons do Sistema nos avisos
   - Widget na tela inicial com as missões do dia
   - Registro de refeições/calorias
5. **Gerar a nova versão final** (`npx eas-cli@latest build --profile preview --platform android`), instalar por cima e atualizar o README, o portfólio e o currículo se algo grande mudar.
