# Despertar

App Android para criar hábitos saudáveis e perder peso, inspirado no "Sistema" dos animes de RPG: missões diárias, XP, níveis e ranks (E → S).

## Funcionalidades

- **Despertar:** cadastro do jogador com altura, peso atual e meta
- **Avatar do Caçador:** emblema que muda de cor e ganha detalhes a cada rank (Despertado → Aprendiz → Combatente → Elite → Campeão → Lenda), com galeria das 6 formas
- **Status:** nível, rank, barra de XP, sequência de dias, atributos (Força, Vitalidade, Resistência, Disciplina), peso, IMC e registro de peso
- **Missões diárias por quantidade:** água (+200/300/500 ml), flexões, abdominais, agachamentos e passos, mostrando quanto falta. Sono é de marcar; Alimentação conclui sozinha pelas refeições registradas
- **Dificuldade progressiva:** as metas de treino aumentam conforme o nível
- **Missões semanais:** 6 metas da semana (água, alimentação, treinos, passos, jejuns, sono) calculadas do que já foi registrado
- **Dungeon de fim de semana:** desafio maior aberto só no sábado e domingo, em rodízio (Covil dos Golens, Trilha Infinita, Torre da Disciplina, Templo do Jejum), com recompensa que cresce com o nível
- **Dieta:** registro das refeições do dia (o que comeu, calorias opcionais, saudável ou besteira); registrar durante o jejum encerra o jejum
- **Jejum intermitente:** desafios de 12h a 18h liberados aos poucos, timer, notificações de metade e fim, histórico
- **Passos automáticos:** leitura dos passos do dia pelo Health Connect (Google Fit, Samsung Health etc.), com calorias e distância estimadas
- **Treinos em casa e na academia:** cronômetro, séries com repetições/carga/minutos, calorias pela fórmula MET, XP e histórico; flexões, abdominais e agachamentos somam nas missões
- **Evolução:** peso perdido, sequência, gráfico de peso com meta e gráficos dos últimos 7 dias (missões, água, calorias gastas e consumidas)
- **Configurações:** editar perfil, meta de água, horário de dormir, os horários de cada lembrete (ou desligá-los) e os sons
- **Backup:** exportar os dados num arquivo e importar de volta (ex.: celular novo)
- **Conquistas:** 27 medalhas (sequências, água, sono, alimentação, passos, jejuns, treinos, Dungeons, peso, ranks) com XP de recompensa
- **Avisos do Sistema:** janela animada com vibração e som para level up, rank up, conquistas, missões semanais, Dungeon e penalidades
- **Sons do Sistema:** efeitos sintetizados pelo próprio projeto (`scripts/gerar-sons.py`), que respeitam o modo silencioso
- **Penalidades:** missão incompleta no fim do dia tira 5 XP por missão (sem rebaixar de nível)
- **Lembretes do Sistema:** notificações de água, refeições, treino e sono que cobram exatamente o que falta

## Tecnologias

- [Expo](https://expo.dev) SDK 57 + React Native + TypeScript
- Expo Router (navegação por abas)
- AsyncStorage (dados salvos no celular)
- expo-notifications (lembretes locais)
- expo-file-system, expo-sharing, expo-document-picker (backup)
- react-native-health-connect (passos)
- react-native-svg (gráficos e avatar)
- expo-audio (sons do Sistema)
- EAS Build (APK gerado na nuvem)

## Rodando

```bash
npm install
npx expo start --dev-client
```

O app usa módulos nativos (notificações, Health Connect, SVG, arquivos), então roda num **build de desenvolvimento**, não no Expo Go:

```bash
npx eas-cli build --platform android --profile development   # APK de desenvolvimento (conecta no servidor local)
npx eas-cli build --platform android --profile preview       # APK final, funciona sozinho
```

Os passos automáticos precisam de um app que registre passos no Health Connect (Google Fit, Samsung Health etc.).

## Próximos passos

Veja [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md).
