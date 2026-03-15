# Sistema de Gestão de Assinaturas

Este é o sistema completo para gerenciar assinaturas, clientes e pagamentos da HidraElétrica Pro.

## Estrutura do Projeto
- `/sistema`: Aplicação administrativa e gestão.
- `/app`: Aplicativo do cliente (Login e Dashboard).
- `/banco_dados_clientes`: Armazenamento de dados em formato JSON isolado por cliente.

## Credenciais Padrão
- **Admin**: `admin` / `2486`

## Como Iniciar o Servidor
1. Abra uma pasta de terminal/prompt de comando.
2. Navegue até a pasta `sistema-gestao`.
3. Certifique-se de que o Node.js está instalado.
4. Execute: `npm install` (apenas na primeira vez).
5. Execute: `node server.js` para iniciar a API.

## Acesso
- O sistema estará disponível via protocolo HTTP (ex: rodando localmente no Live Server ou pelo servidor Node).
- Certifique-se de que o backend (Porta 3001) esteja ativo para que o login funcione.
