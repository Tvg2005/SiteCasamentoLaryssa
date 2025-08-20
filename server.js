import express from 'express';
import multer from 'multer';
import { google } from 'googleapis';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('dist'));

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
  },
});

// Configuração do Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Credenciais do Google Drive (deixadas em branco para você preencher)
const credentials = {
  "type": "service_account",
  "project_id": "testegcp-461900",
  "private_key_id": "bcd25bb89b19a7c9505b7128a123a82f1d6bb5c4",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/IfCqVoB+H8+7\nujqkQ7HY8m47Trz80rIpeK9UUwZXBdRjmhEMfUbkNg130B9NnfQlrYljX8rzm9Wf\nyfcRIRwQeQgA6cwLDxewBICREr8q7lliiDu8t42g403ctXuUQsgU9vbaqHdoiqSe\nd5WzmqqbYDwugZ4oQwi1gvxN/GEx8eUFp+PcoslZUAOn/ifpzCJQ6Vk9B/hX5w2j\nplrOSG5TPPL8iVO+bG4b8PptJlmkR5aQHXrGkhEwdWYPrt1CK8y2x8MSiCmehbbn\nSpjqtgRjQP95bdIqbT6Qlq58Ddc4jg77rwY6lTf9ZD/JcIuRq6VFnnN3YERquFMr\nn09Lu3clAgMBAAECggEARgsZGENlCVN9HE3OCb6pIVkOnntndLt+AQayMhPPAfsn\n72xZjRsn7KAGZX8Gybn17AzhiWJkjMvyCIHKIiPhFgRUs4j6dp8MTjwIJaIaHpCE\nf0Bvq+QUaf6C3TxA0n96tXwf0NfmEpCkbVJjsRMgLJqi02Q64oRWX7Zl4ep4cAWS\n0pdh/VmLxxiV04V7dXH3+PwoUWfhNw7VZzQ3GKL95+A41whL8P87L1NPTnANpsNo\nWwtklhMjGSxdZzSVs7CPkW8VOPF0r3ImS3WvhFpP0BG+VBU3QJ5dXF47psS5smZY\nYE35JwISoUJorXe7b6Mf4+2aBXeNtTCC/bnlZK0ZzQKBgQD/xIndevEnV9lUf37E\ntk6ltd7h1Ya8FhNYA2C1JBXTOaLMWRYGHNMnVeVYdNC8LQfCKVQGb3FfZRM2dZoN\nMI1YYlFypyqi8enJKbwKG+OgXqh+mSor5RGvLTYG4JI5yGYRjh1QLMaElf9/cGJ+\nf+H7HjbbSa7WtTFQmSmKbpjMrwKBgQC/TmACYyYB+Tscehm7UiFuHtFylJSC16wd\n2bqQU607s8uqYefyPKI9JHrdT+Jz+4SGxC9OZkm1fWg78yCwIZVheViveiRt3GKQ\nZxnZ9wTpw7Uu0Ddrf5I4ZC5rCBWn1FSD9d/OPVr3zMWh+zqeKwiBVDXZUMxPGU4W\npARNKp82awKBgEm0k541vaT+1exZyWhauRNb89zUsb0mB3EHmCjbO0bhhx6oVYZx\nbBAb2rnBAB4aQ/AaBNLN7rf04rKA9WHzqefcfWgy8ECAwkRsOHoZS2F9pcTF0rdP\njecTekxFDx6Dt5Y7hAsEvDidGUHaWyflJnQ9YsWS2EWbdZiqaqQv9uyVAoGBAIcS\nzoVA/jgMgmkT6REy5zm6dsYBFG7h2rvk3G5FNp5dz2KI6F1H5IFpPXr/iXO81hDV\nelVPsaF8X1lcy+qwe6msJSsZAZm0Lr+onD8iw4xOS6I3D7pOA67fRUr7FVc/e0EF\nHLWg6pbmNXCuUvAUkFfIXpEHFIqQ4mrn+cWGX43rAoGBALKKXMbD8H4F5hc8G5lq\n4FHuutfM2rjHJwLQW/ESCthwstLyIB7nmFhwjfr5RPGkda8et1kcsRgAANdvfe9N\n6f2AUP/RZRiUffNpLXbZl3a/sT8rPVgnLHvDKKMsmmRdargPzk/ah1fp/5gcUp+S\nnKv4G1dsIcHWux3mxRy5HH/o\n-----END PRIVATE KEY-----\n",
  "client_email": "apiconexaogoogledrivelaryssara@testegcp-461900.iam.gserviceaccount.com",
  "client_id": "109149417440074409974",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/apiconexaogoogledrivelaryssara%40testegcp-461900.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}


// ========================================
// CONFIGURAÇÃO PARA CONTA PESSOAL DO GOOGLE
// ========================================
// 
// Para contas pessoais (sem Google Workspace), vamos usar uma pasta compartilhada
// em vez de um Shared Drive.
//
// PASSO A PASSO:
// 1. Acesse: https://drive.google.com
// 2. Crie uma nova pasta chamada "Fotos Casamento"
// 3. Clique com botão direito na pasta → "Compartilhar"
// 4. Adicione o email: apiconexaogoogledrivelaryssara@testegcp-461900.iam.gserviceaccount.com
// 5. Permissão: "Editor"
// 6. Copie o ID da pasta da URL
// 7. Cole o ID abaixo
//
// ID da pasta compartilhada (substitua pelo ID correto)
const MAIN_FOLDER_ID = '1Zs2LgeYcU3t4ztDglABV5EoL-vscMPxL';

// Para contas pessoais, não usamos Shared Drive
const USE_SHARED_DRIVE = false;

// Função para verificar se a pasta compartilhada existe e tem permissão
async function checkSharedFolder(drive) {
  try {
    console.log('Verificando pasta compartilhada...');
    const response = await drive.files.get({
      fileId: MAIN_FOLDER_ID,
      fields: 'id, name, permissions',
    });
    console.log('✅ Pasta compartilhada encontrada:', response.data.name);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao verificar pasta compartilhada:', error.message);
    throw new Error(`Pasta não encontrada ou sem permissão: ${error.message}`);
  }
}

// Função para autenticar com Google Drive
async function authenticateGoogleDrive() {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt} de autenticação Google Drive...`);
      console.log('Project ID:', credentials.project_id);
      console.log('Client Email:', credentials.client_email);
      
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: SCOPES,
      });
      
      console.log('Auth criado, obtendo cliente...');
      const drive = google.drive({ version: 'v3', auth });
      
      // Testar a autenticação fazendo uma chamada simples
      console.log('Testando autenticação...');
      await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
      });
      
      console.log('Autenticação bem-sucedida!');
      return drive;
      
    } catch (error) {
      console.error(`Erro na tentativa ${attempt} de autenticação:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Tentando novamente em 3 segundos... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('Falha definitiva na autenticação após', maxRetries, 'tentativas');
        throw new Error(`Falha na autenticação: ${error.message}`);
      }
    }
  }
}

// Função para verificar se uma pasta existe
async function checkFolderExists(drive, folderName, parentFolderId) {
  try {
    const response = await drive.files.list({
      q: `name='${folderName}' and parents in '${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });
    
    return response.data.files.length > 0 ? response.data.files[0] : null;
  } catch (error) {
    console.error('Erro ao verificar pasta:', error);
    return null;
  }
}

// Função para criar uma pasta
async function createFolder(drive, folderName, parentFolderId) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id, name',
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    throw error;
  }
}

// Função para fazer upload de arquivo com retry
async function uploadFile(drive, file, fileName, folderId, retryCount = 0) {
  const maxRetries = 3;
  const timeout = 30000; // 30 segundos
  
  try {
    console.log(`Tentativa ${retryCount + 1} de upload para: ${fileName}`);
    
    // Converter o buffer para um stream legível
    const { Readable } = await import('stream');
    const stream = Readable.from(file.buffer);
    
    // Criar um timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout no upload')), timeout);
    });
    
    // Promise do upload
    const uploadPromise = drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
      },
      fields: 'id, name',
    });
    
    // Race entre upload e timeout
    const response = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log(`Upload bem-sucedido: ${fileName} (ID: ${response.data.id})`);
    return response.data;
    
  } catch (error) {
    console.error(`Erro na tentativa ${retryCount + 1} para ${fileName}:`, error.message);
    
    if (retryCount < maxRetries) {
      console.log(`Tentando novamente em 2 segundos... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return uploadFile(drive, file, fileName, folderId, retryCount + 1);
    } else {
      console.error(`Falha definitiva após ${maxRetries} tentativas para: ${fileName}`);
      throw new Error(`Falha no upload após ${maxRetries} tentativas: ${error.message}`);
    }
  }
}

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    credentials: {
      hasProjectId: !!credentials.project_id,
      hasClientEmail: !!credentials.client_email,
      hasPrivateKey: !!credentials.private_key
    }
  });
});

// Rota para upload de fotos
app.post('/api/upload', upload.array('photos'), async (req, res) => {
  // Timeout de 5 minutos para uploads grandes
  req.setTimeout(300000);
  res.setTimeout(300000);
  try {
    console.log('Iniciando upload...');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    const { userName } = req.body;
    const files = req.files;

    if (!userName || !files || files.length === 0) {
      console.log('Dados inválidos:', { userName, filesCount: files?.length });
      return res.status(400).json({ 
        error: 'Nome do usuário e pelo menos uma foto são obrigatórios' 
      });
    }

    // Verificar tamanho dos arquivos
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > maxFileSize) {
        return res.status(400).json({
          error: `Arquivo ${file.originalname} é muito grande. Tamanho máximo: 10MB`
        });
      }
    }

    console.log(`Upload iniciado para usuário: ${userName} com ${files.length} arquivos`);

    // Verificar se as credenciais estão configuradas
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      console.error('Credenciais do Google Drive não configuradas');
      return res.status(500).json({ 
        error: 'Credenciais do Google Drive não configuradas' 
      });
    }

    console.log('Autenticando com Google Drive...');
    const drive = await authenticateGoogleDrive();
    console.log('Autenticação bem-sucedida');

    // Tentar verificar pasta compartilhada (opcional)
    try {
      await checkSharedFolder(drive);
    } catch (error) {
      console.log('⚠️ Aviso: Não foi possível verificar a pasta, mas continuando...');
      console.log('Isso pode acontecer se a pasta foi compartilhada recentemente');
    }

    // Verificar se a pasta do usuário já existe
    console.log('Verificando pasta do usuário...');
    let userFolder = await checkFolderExists(drive, userName, MAIN_FOLDER_ID);
    
    // Se não existir, tentar criar a pasta
    if (!userFolder) {
      console.log('Criando pasta do usuário...');
      try {
        userFolder = await createFolder(drive, userName, MAIN_FOLDER_ID);
        console.log('✅ Pasta criada:', userFolder);
      } catch (error) {
        console.log('⚠️ Erro ao criar pasta, tentando usar pasta principal...');
        // Se não conseguir criar, usar a pasta principal
        userFolder = { id: MAIN_FOLDER_ID, name: 'Pasta Principal' };
      }
    } else {
      console.log('✅ Pasta encontrada:', userFolder);
    }

    // Upload de cada arquivo (um por vez para evitar sobrecarga)
    console.log('Iniciando upload dos arquivos...');
    const uploadedFiles = [];
    
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}_${index + 1}_${file.originalname}`;
      
      try {
        console.log(`Processando arquivo ${index + 1}/${files.length}: ${fileName}`);
        const uploadedFile = await uploadFile(drive, file, fileName, userFolder.id);
        uploadedFiles.push(uploadedFile);
        console.log(`✅ Arquivo ${index + 1} enviado com sucesso`);
        
        // Pequena pausa entre uploads para evitar rate limiting
        if (index < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Falha no arquivo ${index + 1}: ${fileName}`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ Upload concluído: ${uploadedFiles.length}/${files.length} arquivos enviados`);

    res.json({
      success: true,
      message: `${uploadedFiles.length} fotos enviadas com sucesso para a pasta "${userName}"`,
      folder: userFolder,
      files: uploadedFiles,
    });

  } catch (error) {
    console.error('Erro detalhado no upload:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Servir arquivos estáticos do React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Para configurar o Google Drive, preencha as credenciais no arquivo server.js');
});