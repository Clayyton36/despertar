# Despertar

App Android para criar hábitos saudáveis e perder peso, inspirado no "Sistema" dos animes de RPG: missões diárias, XP, níveis e ranks (E → S).

## Funcionalidades

- **Despertar:** cadastro do jogador com altura, peso atual e meta
- **Status:** nível, rank, barra de XP, sequência de dias, atributos (Força, Vitalidade, Resistência, Disciplina), peso, IMC e registro de peso
- **Missões diárias por quantidade:** água (+200/300/500 ml), flexões, abdominais, agachamentos e passos, mostrando quanto falta. Alimentação e sono são de marcar
- **Dificuldade progressiva:** as metas de treino aumentam conforme o nível
- **Jejum intermitente:** desafios de 12h a 18h liberados aos poucos, timer, notificações de metade e fim, histórico
- **Passos automáticos:** leitura dos passos do dia pelo Health Connect (Google Fit, Samsung Health etc.), com calorias e distância estimadas
- **Treinos em casa e na academia:** cronômetro, séries com repetições/carga/minutos, calorias pela fórmula MET, XP e histórico; flexões, abdominais e agachamentos somam nas missões
- **Evolução:** peso perdido, sequência, gráfico de peso com meta e gráficos dos últimos 7 dias (missões, água, calorias)
- **Configurações:** editar perfil, meta de água, horário de dormir e os horários de cada lembrete (ou desligá-los)
- **Backup:** exportar os dados num arquivo e importar de volta (ex.: celular novo)
- **Conquistas:** 23 medalhas (sequências, água, sono, passos, jejuns, treinos, peso, ranks) com XP de recompensa
- **Avisos do Sistema:** janela animada com vibração para level up, rank up, conquistas e penalidades
- **Penalidades:** missão incompleta no fim do dia tira 5 XP por missão (sem rebaixar de nível)
- **Lembretes do Sistema:** notificações de água, refeições, treino e sono que cobram exatamente o que falta

## Tecnologias

- [Expo](https://expo.dev) SDK 57 + React Native + TypeScript
- Expo Router (navegação por abas)
- AsyncStorage (dados salvos no celular)
- expo-notifications (lembretes locais)
- expo-file-system, expo-sharing, expo-document-picker (backup)
- react-native-health-connect (passos)
- react-native-svg (gráficos)
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
