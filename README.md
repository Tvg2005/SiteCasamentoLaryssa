# Site de Casamento - Laryssa & Rafael

Site para compartilhamento de fotos do casamento com integração ao Google Drive.

## Configuração do Google Drive API

### 1. Criar um projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a Google Drive API:
   - Vá para "APIs & Services" > "Library"
   - Procure por "Google Drive API"
   - Clique em "Enable"

### 2. Criar uma Service Account

1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "Service Account"
3. Preencha os detalhes da service account
4. Após criar, clique na service account criada
5. Vá para a aba "Keys"
6. Clique em "Add Key" > "Create New Key" > "JSON"
7. Baixe o arquivo JSON com as credenciais

### 3. Configurar as credenciais

1. Abra o arquivo `server.js`
2. Preencha o objeto `credentials` com os dados do arquivo JSON baixado:
   ```javascript
   const credentials = {
     type: "service_account",
     project_id: "seu-project-id",
     private_key_id: "sua-private-key-id",
     private_key: "sua-private-key",
     client_email: "seu-client-email",
     client_id: "seu-client-id",
     auth_uri: "https://accounts.google.com/o/oauth2/auth",
     token_uri: "https://oauth2.googleapis.com/token",
     auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
     client_x509_cert_url: "sua-client-x509-cert-url"
   };
   ```

### 4. Dar permissões à Service Account

1. Copie o email da service account (client_email)
2. Vá para o Google Drive e abra a pasta: https://drive.google.com/drive/folders/1IAvKY8c4Scwt1TOpDhfKOErEw4nKpfsw
3. Clique com o botão direito > "Compartilhar"
4. Adicione o email da service account com permissão de "Editor"

## Como executar

### Desenvolvimento
```bash
npm install
npm run dev:full
```

### Produção
```bash
npm run build
npm start
```

## Funcionalidades

- ✅ Upload de múltiplas fotos
- ✅ Organização automática por pastas com nome do usuário
- ✅ Interface responsiva para mobile
- ✅ Sugestões categorizadas de fotos
- ✅ Mural de inspiração
- ✅ Integração completa com Google Drive
- ✅ Modal de agradecimento após upload
- ✅ Links para visualizar todas as fotos

## Estrutura de pastas no Google Drive

```
Pasta Principal (1IAvKY8c4Scwt1TOpDhfKOErEw4nKpfsw)
├── Nome do Usuário 1/
│   ├── foto1.jpg
│   ├── foto2.jpg
│   └── ...
├── Nome do Usuário 2/
│   ├── foto1.jpg
│   └── ...
└── ...
```