/restaurar (Para ver uma lista com todos os checkpoints salvos para o projeto atual, basta executar)

gemêos --checkpointing (Você pode habilitar o checkpointing para a sessão atual usando o -checkpointing bandeira ao iniciar a CLI de Gêmeos)

Para restaurar seu projeto para um ponto de verificação específico, use o arquivo de ponto de verificação da lista: /restaurar <checkpoint_file>


Por exemplo: /restore 2025-06-22T10-00-00_000Z-my-file.txt-write_file

/bug: Apresentar um problema sobre Gemini CLI. Por padrão, o problema é arquivado dentro do repositório GitHub para Gemini CLI. O cordel que você entra depois de /bug vai se tornar a manchete para o bug que está sendo arquivado. O padrão /bug comportamento pode ser modificado utilizando o advanced.bugCommand ambientação em seu .gemini/configurações.json arquivos.

/bate-papo: Salvar e retomar o histórico de conversas para ramificar o estado da conversa de forma interativa, ou retomar um estado anterior a partir de uma sessão posterior.
    
    Sub- comandos:
salvar

Uso: /chat salvar < tag>

Quando você corre /lista bate-papo, o CLI apenas varre esses diretórios específicos para encontrar pontos de verificação disponíveis.

currículo: Retoma uma conversa de um save anterior.
Uso: /retomação de bate-papo <tag>

lista de: Listas tags disponíveis para retomada do estado do chat.

deletar: Exclui um ponto de verificação de conversação salvo.
Uso: /chat excluir < tag>

/comprima :Substitua todo o contexto do chat por um resumo. Isso economiza em tokens usados para tarefas futuras, mantendo um resumo de alto nível do que aconteceu.

/cópia: Copia a última saída produzida pela Gemini CLI para sua área de transferência, para facilitar o compartilhamento ou reutilização.

/diretório (ou /dir(S):Gerenciar diretórios do espaço de trabalho para suporte a vários diretórios.
Sub- comandos:

    adicionar¡:: - Adicionar um diretório ao espaço de trabalho. O caminho pode ser absoluto ou relativo ao diretório de trabalho atual. Além disso, a referência do diretório pessoal também é suportada.

        Uso: /diretório add <path1>,<path2>
        Observação: Desativado em perfis restritivos do sandbox. Se estiver usando isso, use -inclua-diretórios ao iniciar a sessão em vez de.

    mostrar¡:: - Exibir todos os diretórios adicionados por /diretório adicionar e, e -inclua-diretórios.O.
    Uso: /show diretorio

/configurações: Abra o editor de configurações para visualizar e modificar as configurações do Gemini CLI.

    Detalhes: Este comando fornece uma interface amigável para alterar configurações que controlam o comportamento e a aparência do Gemini CLI. Equivale a editar manualmente o .gemini/configurações.json arquivo, mas com validação e orientação para prevenir erros.

    Uso: Simplesmente correr /configurações e o editor vai abrir. Você pode então navegar ou procurar por configurações específicas, visualizar seus valores atuais e modificá-los como desejado. Alterações em algumas configurações são aplicadas imediatamente, enquanto outras requerem reinicialização.

/estat: Exiba estatísticas detalhadas para a sessão Gemini CLI atual, incluindo uso de token, economia de token em cache (quando disponível) e duração da sessão. 
    
    Observação: As informações do token em cache são exibidas apenas quando os tokens em cache estão sendo usados, o que ocorre com a autenticação da chave da API, mas não com a autenticação do OAuth neste momento.

/ferramentas: Exibir uma lista de ferramentas que estão atualmente disponíveis dentro do Gemini CLI.

    Uso: /ferramentas [desc]
    Sub- comandos:
        desc ou ou descrições¡:: - Mostrar descrições detalhadas de cada ferramenta, incluindo o nome de cada ferramenta com sua descrição completa, conforme fornecido ao modelo.

        nósc ou ou nodescrições¡:: - Ocultar as descrições das ferramentas, mostrando apenas os nomes das ferramentas.

/init: Para ajudar os usuários a criar facilmente a GÊMEOS.md arquivo, este comando analisa o diretório atual e gera um arquivo de contexto sob medida, tornando mais simples para eles fornecer instruções específicas do projeto para o agente Gemini.       