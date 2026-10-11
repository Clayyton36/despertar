# Despertar

App Android para criar hábitos saudáveis e perder peso, inspirado no "Sistema" dos animes de RPG: missões diárias, XP, níveis e ranks (E → S).

## Funcionalidades

- **Despertar:** cadastro do jogador com altura, peso atual e meta
- **Status:** nível, rank, barra de XP, sequência de dias, atributos (Força, Vitalidade, Resistência, Disciplina), peso, IMC e registro de peso
- **Missões diárias por quantidade:** água (+200/300/500 ml), flexões, abdominais, agachamentos e passos, mostrando quanto falta. Alimentação e sono são de marcar
- **Dificuldade progressiva:** as metas de treino aumentam conforme o nível
- **Lembretes do Sistema:** notificações de água, refeições, treino e sono que cobram exatamente o que falta

## Tecnologias

- [Expo](https://expo.dev) SDK 57 + React Native + TypeScript
- Expo Router (navegação por abas)
- AsyncStorage (dados salvos no celular)
- expo-notifications (lembretes locais)
- EAS Build (APK gerado na nuvem)

## Rodando

```bash
npm install
npx expo start --dev-client
```

Os lembretes precisam do build de desenvolvimento (`npx eas-cli build --platform android --profile development`), pois o Expo Go no Android não inclui notificações.

## Próximos passos

- Jejum intermitente com timer e desafios
- Passos automáticos e calorias via Health Connect
- Treinos em casa e na academia
- Gráficos de evolução e conquistas
