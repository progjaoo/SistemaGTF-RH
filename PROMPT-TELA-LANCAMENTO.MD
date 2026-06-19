Crie um componente React Native (usando Expo e Tailwind CSS) para a tela de registro diário de refeições, conforme o design mobile fornecido. O objetivo é uma interface limpa, moderna e funcional para lançamento de almoços por dia. Use cores verdes e brancas predominantes. O texto deve ser em Português do Brasil.

**Estrutura do Componente:**

1.  **Header (Topo):**
    *   `View` com fundo branco.
    *   Ícone de talheres verdes (logo).
    *   `Text` 'Registro de Refeições' (bold, grande).
    *   `Text` 'Registre as refeições do dia' (menor, cinza).
    *   Ícone de menu hambúrguer à direita.

2.  **Seletor de Data:**
    *   `View` em formato de card arredondado, fundo branco, centralizado.
    *   Botão de seta para a esquerda (`<`).
    *   `Text` '18/06/2026' (bold, grande).
    *   `Text` 'Quinta-feira' (menor, cinza).
    *   Botão de seta para a direita (`>`).

3.  **Card Informativo:**
    *   `View` em formato de card arredondado, fundo verde claro, centralizado.
    *   Ícone 'i' (informação).
    *   `Text` 'Informe a quantidade de refeições para cada colaborador neste dia.'

4.  **Lista de Funcionários (Cards):**
    *   `ScrollView` para a lista de cards de funcionários.
    *   Cada funcionário é um `View` em formato de card arredondado, fundo branco.
    *   **Conteúdo do Card:**
        *   `Text` com o nome do funcionário (ex: 'João da Silva').
        *   `View` com ícone de calendário e `Text` 'Seg a Sex' (para jornada).
        *   **Seletor de Quantidade:** `View` com botões `[ - ]`, `Text` com a quantidade (ex: '2'), e botões `[ + ]`. Abaixo da quantidade, `Text` 'refeições'. Os botões devem ser grandes e verdes.

5.  **Card de Status de Salvamento:**
    *   `View` em formato de card arredondado, fundo verde claro, centralizado.
    *   Ícone de check verde.
    *   `Text` 'Os registros são salvos apenas para 18/06/2026'.

6.  **Botão de Ação Flutuante (FAB):**
    *   `TouchableOpacity` circular, verde, com sombra, posicionado no canto inferior direito.
    *   Ícone de check grande.
    *   `Text` 'SALVAR' abaixo do ícone.

7.  **Navigation Bar Inferior:**
    *   `View` fixo na parte inferior da tela.
    *   Três itens de navegação: 'Registro' (selecionado, ícone de talheres), 'Histórico' (ícone de gráfico de barras), 'Configurações' (ícone de engrenagem).
    *   O item 'Registro' deve ter um indicador visual de seleção (ex: linha verde abaixo).

**Dados Mock:**
Use um array de objetos para simular os funcionários, contendo `id`, `nome`, `jornada`, `quantidadeRefeicoes` e `avatar` (URL de imagem genérica).

**Estilo:**
Utilize classes do Tailwind CSS para todos os estilos (cores, tamanhos de fonte, espaçamento, bordas arredondadas, sombras). A cor primária deve ser um verde vibrante (ex: `bg-green-500`, `text-green-500`). Fundo geral da tela deve ser um cinza muito claro ou branco. Garanta que os elementos sejam responsivos e fáceis de interagir em telas pequenas.
