import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import cloudinaryConfig from './cloudinary-config.js';

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

// Configurar Cloudinary
cloudinary.v2.config({
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key,
  api_secret: cloudinaryConfig.api_secret,
});

// Função para fazer upload para Cloudinary
async function uploadToCloudinary(file, userName, retryCount = 0) {
  const maxRetries = 3;
  const timeout = 30000; // 30 segundos
  
  try {
    console.log(`Tentativa ${retryCount + 1} de upload para Cloudinary: ${file.originalname}`);
    
    // Converter buffer para base64
    const base64Image = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${base64Image}`;
    
    // Criar um timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout no upload')), timeout);
    });
    
    // Promise do upload
    const uploadPromise = cloudinary.v2.uploader.upload(dataURI, {
      folder: `CasamentoLaryssaERafael/${userName}`,
      public_id: `${Date.now()}_${file.originalname}`,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' }, // Otimizar qualidade
        { fetch_format: 'auto' }   // Formato automático
      ]
    });
    
    // Race entre upload e timeout
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log(`✅ Upload bem-sucedido para Cloudinary: ${file.originalname}`);
    console.log(`   URL: ${result.secure_url}`);
    
    return {
      id: result.public_id,
      name: file.originalname,
      url: result.secure_url,
      size: result.bytes,
      format: result.format
    };
    
  } catch (error) {
    console.error(`Erro na tentativa ${retryCount + 1} para ${file.originalname}:`, error.message);
    
    if (retryCount < maxRetries) {
      console.log(`Tentando novamente em 2 segundos... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return uploadToCloudinary(file, userName, retryCount + 1);
    } else {
      console.error(`Falha definitiva após ${maxRetries} tentativas para: ${file.originalname}`);
      throw new Error(`Falha no upload após ${maxRetries} tentativas: ${error.message}`);
    }
  }
}

// Helpers para Cloudinary (lista pastas e busca recursos por prefixo)
async function fetchAllResourcesByPrefix(prefix) {
  let resources = [];
  let next_cursor = undefined;
  do {
    const page = await cloudinary.v2.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix,
      max_results: 100,
      next_cursor,
    });
    resources = resources.concat(page.resources || []);
    next_cursor = page.next_cursor;
  } while (next_cursor);
  return resources;
}

async function listUserFolders() {
  try {
    const resp = await cloudinary.v2.api.sub_folders('CasamentoLaryssaERafael');
    return (resp.folders || []).map(f => f.path.replace(/^CasamentoLaryssaERafael\//, ''));
  } catch (e) {
    const all = await fetchAllResourcesByPrefix('CasamentoLaryssaERafael/');
    const set = new Set(
      all
        .map(r => (r.public_id || '').split('/'))
        .filter(parts => parts.length > 1)
        .map(parts => parts[1])
    );
    return Array.from(set).sort();
  }
}

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor Cloudinary funcionando!',
    timestamp: new Date().toISOString(),
    cloudinary: {
      cloudName: cloudinaryConfig.cloud_name,
      hasApiKey: !!cloudinaryConfig.api_key,
      hasApiSecret: !!cloudinaryConfig.api_secret
    }
  });
});

// Rota para upload de fotos
app.post('/api/upload', upload.array('photos'), async (req, res) => {
  // Timeout de 5 minutos para uploads grandes
  req.setTimeout(300000);
  res.setTimeout(300000);
  
  try {
    console.log('Iniciando upload para Cloudinary...');
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
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      console.error('Credenciais do Cloudinary não configuradas');
      return res.status(500).json({ 
        error: 'Credenciais do Cloudinary não configuradas. Configure o arquivo cloudinary-config.js' 
      });
    }

    // Upload de cada arquivo (um por vez para evitar sobrecarga)
    console.log('Iniciando upload dos arquivos para Cloudinary...');
    const uploadedFiles = [];
    
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      
      try {
        console.log(`Processando arquivo ${index + 1}/${files.length}: ${file.originalname}`);
        const uploadedFile = await uploadToCloudinary(file, userName);
        uploadedFiles.push(uploadedFile);
        console.log(`✅ Arquivo ${index + 1} enviado com sucesso`);
        
        // Pequena pausa entre uploads para evitar rate limiting
        if (index < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Falha no arquivo ${index + 1}: ${file.originalname}`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ Upload concluído: ${uploadedFiles.length}/${files.length} arquivos enviados`);

    res.json({
      success: true,
      message: `${uploadedFiles.length} fotos enviadas com sucesso para Cloudinary`,
      user: userName,
      files: uploadedFiles,
      totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
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

// Rota pública: galeria sem login (opcionalmente por usuário)
app.get(['/public', '/public/:user'], async (req, res) => {
  try {
    const userName = req.params.user || '';
    const isAll = !userName;
    const prefix = isAll ? 'CasamentoLaryssaERafael/' : `CasamentoLaryssaERafael/${userName}/`;

    // Buscar pastas e recursos via Admin API (com paginação)
    const [folders, resourcesRaw] = await Promise.all([
      listUserFolders(),
      fetchAllResourcesByPrefix(prefix)
    ]);
    const resources = (resourcesRaw || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    // HTML com estilo próximo ao App
    const title = isAll ? 'Galeria pública · Todas as fotos' : `Galeria pública · ${userName}`;
    const html = `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root{
        --olive50:#f0fdf4;
        --olive100:#dcfce7;
        --olive200:#bbf7d0;
        --olive600:#166534;
        --olive700:#14532d;
        --olive800:#064e3b;
        --amber50:#fffbeb;
        --g100:#f3f4f6;
        --g200:#e5e7eb;
        --g500:#6b7280;
        --g700:#374151;
      }

      *{ box-sizing:border-box }
      body{
        margin:0;
        font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;
        background:linear-gradient(135deg,var(--amber50),var(--olive50));
        color:var(--g700);
      }

      .container{ max-width:1100px; margin:0 auto; padding:16px }

      /* Header */
      .header{
        position:sticky; top:0; z-index:10;
        backdrop-filter:blur(6px);
        background:rgba(255,255,255,.9);
        box-shadow:0 4px 6px rgba(0,0,0,.05);
        border-bottom:1px solid var(--olive100);
        position:relative;
      }
      .brand{ display:flex; align-items:center; justify-content:center; gap:8px; padding:20px 0 }
      .brand h1{
        margin:0;
        font-size:28px;
        color:var(--olive800);
        font-family:ui-serif, Georgia, Cambria, Times New Roman, Times, serif;
      }
      .subtitle{ text-align:center; color:var(--olive600); font-size:15px; margin:6px 0 14px }

      /* Back button */
      .back-btn{
        position:absolute; left:16px; top:50%; transform:translateY(-50%);
        background:var(--olive600); color:white; border:none;
        padding:8px 12px; border-radius:8px;
        text-decoration:none; font-size:14px; font-weight:500;
        transition:.2s;
      }
      .back-btn:hover{ background:var(--olive700); transform:translateY(-50%) scale(1.05) }

      /* Toolbar */
      .toolbar{ display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-bottom:20px }
      .chip{
        border:2px solid var(--olive600);
        color:var(--olive600);
        background:#fff;
        padding:8px 16px;
        border-radius:999px;
        text-decoration:none;
        font-weight:600;
        transition:.2s;
      }
      .chip.active, .chip:hover{ background:var(--olive50); border-color:var(--olive700); color:var(--olive700) }

      /* Hero */
      .hero{
        background:rgba(255,255,255,.7);
        border:1px solid var(--olive100);
        border-radius:18px;
        padding:20px;
        margin:20px auto;
        text-align:center;
        box-shadow:0 8px 16px rgba(0,0,0,.05);
      }

      /* Grid / Cards */
      .grid{ display:grid; gap:16px; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); }
      .card{
        background:#fff;
        border:1px solid var(--olive100);
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 10px 15px -3px rgba(0,0,0,.07);
        transition:transform .2s, box-shadow .2s;
      }
      .card:hover{ transform:scale(1.02); box-shadow:0 20px 25px -5px rgba(0,0,0,.1) }
      .thumb{ display:block; width:100%; height:220px; object-fit:cover; background:var(--g100) }
      .meta{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; font-size:13px; color:var(--olive700) }
      .pill{ padding:6px 12px; border-radius:999px; background:var(--olive100); border:1px solid var(--g200); color:var(--olive800); font-weight:500 }

      footer{
        text-align:center;
        color:var(--olive700);
        padding:32px;
        margin-top:40px;
      }
      footer p{ margin:6px 0; font-weight:300 }
    </style>
  </head>
  <body>
    <div class="header">
      <a href="/" class="back-btn">← Voltar</a>
      <div class="container">
        <div class="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" />
          </svg>
          <h1>Laryssa & Rafael</h1>
        </div>
        <div class="subtitle">Compartilhe os momentos mágicos do nosso dia especial</div>
      </div>
    </div>

    <main class="container">
      <div class="hero">
        <div style="margin-bottom:14px; font-weight:600; color:var(--olive700)">Pastas (Convidados)</div>
        <div class="toolbar">
          <a class="chip ${isAll ? 'active' : ''}" href="/public">Todas</a>
          ${folders.map(f => `<a class="chip ${!isAll && f===userName ? 'active' : ''}" href="/public/${encodeURIComponent(f)}">${f}</a>`).join('')}
        </div>
      </div>

      ${resources.length === 0 ? `<p class="subtitle" style="color:var(--g500)">Nenhuma imagem encontrada${!isAll ? ' para '+userName : ''}.</p>` : ''}

      <div class="grid">
        ${resources.map(r => {
          const url = r.secure_url || r.url;
          const parts = (r.public_id || '').split('/');
          const folder = parts.length > 1 ? parts[1] : '';
          const name = parts.pop();
          return `
          <figure class="card">
            <a href="${url}" target="_blank" rel="noopener noreferrer">
              <img class="thumb" src="${url}" alt="${name}" loading="lazy" />
            </a>
            <figcaption class="meta">
              <span class="pill" title="${folder}">${folder || 'Casamento'}</span>
            </figcaption>
          </figure>`;
        }).join('')}
      </div>
    </main>

    <footer>
      <p>💚 Obrigado por fazer parte do nosso dia especial!</p>
      <p>Com amor, Laryssa & Rafael</p>
    </footer>
  </body>
</html>
`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('Erro ao montar galeria pública:', error);
    return res.status(500).send('Erro ao montar galeria pública');
  }
});

// Servir arquivos estáticos do React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Cloudinary rodando na porta ${PORT}`);
  console.log('☁️  Configure suas credenciais do Cloudinary no arquivo cloudinary-config.js');
  console.log('📝 Acesse: https://cloudinary.com/ para criar uma conta gratuita');
});
