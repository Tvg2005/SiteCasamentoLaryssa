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
    const html = `
    <!doctype html>
    <html lang="pt-br">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
        :root{
            --olive50:#f7f8f0;
            --olive100:#eef0e0;
            --olive200:#dde2c2;
            --olive600:#6b7c3f;
            --olive700:#556b2f;
            --olive800:#475a28;
            --amber50:#fffbeb;
            --green50:#f7f8f0;
            --g100:#f3f4f6;
            --g200:#e5e7eb;
            --g500:#6b7280;
            --g700:#374151;
        }

        *{ box-sizing:border-box }
        body{
            margin:0;
            font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;
            background:linear-gradient(135deg,var(--amber50),var(--green50));
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
            padding:0 16px;
        }
        
        .header-content{
            position:relative;
            max-width:1100px;
            margin:0 auto;
        }
        
        /* --- ALTERAÇÃO AQUI --- */
        .brand{ 
            display:flex; 
            align-items:center; 
            justify-content:center; 
            gap:8px; 
            padding: 20px 0 8px; /* Diminuído o padding de baixo */
        }
        .brand h1{
            margin:0;
            color:var(--olive800);
            font-family:ui-serif, Georgia, Cambria, Times New Roman, Times, serif;
            font-weight: normal;
            font-size: 36px; /* Ajustado para um bom tamanho */
        }
        /* --- ALTERAÇÃO AQUI --- */
        .subtitle{ 
            text-align:center; 
            color: var(--olive700); /* Cor mais escura para melhor leitura */ 
            font-weight: 500; /* Fonte um pouco mais grossa */
            font-size:clamp(14px, 2.5vw, 16px); 
            margin: 0 0 20px; /* Removida a margem de cima */
            padding:0 60px;
        }

        .subtitle-header{
            text-align:center; 
            color: #6B7C3F; 
            font-weight: 300; 
            font-size:clamp(15px, 2.5vw, 17px); 
            margin: 0 0 20px; 
            padding:0 60px;
        }


        /* Back button */
        .back-btn{
            position:absolute; 
            left:0; 
            top:50%; 
            transform:translateY(-50%);
            background:var(--olive600); color:white; border:none;
            padding:8px 12px; 
            border-radius:8px;
            text-decoration:none; 
            font-size:clamp(12px, 2vw, 14px); 
            font-weight:500;
            transition:.2s;
            white-space:nowrap;
        }
        .back-btn:hover{ 
            background:var(--olive700); 
            transform:translateY(-50%) scale(1.05);
        }
        
        @media (max-width: 640px) {
            /* Estilos para o botão Voltar em ecrãs pequenos */
            .back-btn {
            /* 20px (padding do .brand) + 10px (metade da altura do título) = 30px */
            top: 30px; 
            transform: translateY(-50%);
            left: 0;
            
            font-size: 20px;
            padding: 0;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: var(--olive700);
            }

            .back-btn .back-btn-text {
            display: none;
            }

            .back-btn:hover {
            background: var(--olive100);
            transform: translateY(-50%) scale(1.1);
            }
            
            .subtitle {
            padding: 0 45px;
            }
            
            .brand h1 {
            font-size: 24px;
            }

            .brand .heart-icon {
            width: 24px;
            height: 24px;
            }
        }

        /* Toolbar */
        .toolbar{ 
            display:flex; 
            flex-wrap:wrap; 
            gap:8px; 
            justify-content:center; 
            margin-bottom:20px;
            padding:0 10px;
        }
        .chip{
            border:2px solid var(--olive600);
            color:var(--olive600);
            background:#fff;
            padding:6px 12px;
            border-radius:999px;
            text-decoration:none;
            font-weight:500;
            font-size:clamp(12px, 2vw, 14px);
            transition:.2s;
            text-align:center;
            min-width:fit-content;
        }
        .chip.active, .chip:hover{ background:var(--olive100); border-color:var(--olive700); color:var(--olive700) }
        
        @media (max-width: 480px) {
            .chip {
            padding:4px 8px;
            font-size:12px;
            }
        }

        /* Hero */
        .hero{
            background:rgba(255,255,255,.8);
            border:1px solid var(--olive100);
            border-radius:18px;
            padding:16px;
            margin:20px auto;
            text-align:center;
            box-shadow:0 8px 16px rgba(0,0,0,.1);
            backdrop-filter:blur(6px);
        }

        /* Grid / Cards */
        .grid{ 
            display:grid; 
            gap:16px; 
            grid-template-columns: repeat(auto-fill,minmax(280px,1fr));
        }
        
        @media (max-width: 640px) {
            .grid {
            grid-template-columns: repeat(auto-fill,minmax(250px,1fr));
            gap:12px;
            }
        }
        
        @media (max-width: 480px) {
            .grid {
            grid-template-columns: 1fr;
            gap:12px;
            }
        }
        
        .card{
            background:#fff;
            border:1px solid var(--olive100);
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 10px 15px -3px rgba(0,0,0,.1);
            transition:transform .2s, box-shadow .2s;
            cursor:pointer;
        }
        .card:hover{ transform:scale(1.02); box-shadow:0 20px 25px -5px rgba(0,0,0,.15) }
        .thumb{ 
            display:block; 
            width:100%; 
            height:220px; 
            object-fit:cover; 
            background:var(--g100);
        }
        .meta{ 
            display:flex; 
            align-items:center; 
            justify-content:center; 
            padding:12px; 
            font-size:13px; 
            color:var(--olive700);
        }
        .pill{ 
            padding:8px 16px; 
            border-radius:999px; 
            background:var(--olive100); 
            border:1px solid var(--olive200); 
            color:var(--olive800); 
            font-weight:600;
            font-size:12px;
            text-align:center;
            max-width:100%;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
        }

        /* Modal Styles */
        .modal-overlay {
            position:fixed;
            top:0; left:0; right:0; bottom:0;
            background:rgba(0,0,0,0.8);
            backdrop-filter:blur(4px);
            z-index:1000;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            opacity:0;
            visibility:hidden;
            transition:all 0.3s ease;
        }
        
        .modal-overlay.active {
            opacity:1;
            visibility:visible;
        }
        
        .modal-content {
            background:white;
            border-radius:16px;
            max-width:90vw;
            max-height:90vh;
            overflow:hidden;
            box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);
            transform:scale(0.9);
            transition:transform 0.3s ease;
            position:relative;
        }
        
        .modal-overlay.active .modal-content {
            transform:scale(1);
        }
        
        .modal-header {
            background:linear-gradient(135deg, var(--olive600), var(--olive700));
            color:white;
            padding:16px 20px;
            display:flex;
            align-items:center;
            justify-content:space-between;
        }
        
        .modal-title {
            font-size:18px;
            font-weight:600;
            display:flex;
            align-items:center;
            gap:8px;
        }
        
        .modal-close {
            background:none;
            border:none;
            color:white;
            font-size:24px;
            cursor:pointer;
            padding:4px;
            border-radius:4px;
            transition:background 0.2s;
        }
        
        .modal-close:hover {
            background:rgba(255,255,255,0.2);
        }
        
        .modal-image {
            width:100%;
            height:auto;
            max-height:70vh;
            object-fit:contain;
            display:block;
        }
        
        .modal-footer {
            padding:16px 20px;
            background:var(--olive50);
            border-top:1px solid var(--olive100);
            text-align:center;
        }
        
        .modal-user {
            color:var(--olive700);
            font-weight:600;
            font-size:16px;
        }

        footer{
            text-align:center;
            color:var(--olive700);
            padding:24px 16px;
            margin-top:40px;
        }
        footer p{ margin:6px 0; font-weight:300 }
        
        /* Heart icon animation */
        .heart-icon{
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        </style>
    </head>
    <body>
        <div class="header">
        <div class="header-content">
            <a href="/" class="back-btn">←<span class="back-btn-text"> Voltar</span></a>
            <div class="brand">
            <svg class="heart-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path   
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="none" 
                stroke="#6B7C3F" 
                stroke-width="1.5"
                />
            </svg>

            <h1>Laryssa & Rafael</h1>
            <svg class="heart-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path 
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="none" 
                stroke="#6B7C3F" 
                stroke-width="1.5"
                />
            </svg>
            </div>
            <div class="subtitle-header">Compartilhe os momentos mágicos do nosso dia especial</div>
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
            <figure class="card" onclick="openModal('${url}', '${folder || 'Casamento'}', '${name || 'Imagem'}')">
                <img class="thumb" src="${url}" alt="${name}" loading="lazy" />
                <figcaption class="meta">
                <span class="pill" title="${folder}">${folder || 'Casamento'}</span>
                </figcaption>
            </figure>`;
            }).join('')}
        </div>
        </main>

        <div id="imageModal" class="modal-overlay" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
            <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
        </svg>
        <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <img id="modalImage" class="modal-image" src="" alt="" />
        <div class="modal-footer">
        <div class="modal-user">
            Enviado por: <span id="modalUser">Usuário</span>
        </div>
        </div>
        </div>
        </div>

        <footer>
        <div style="background:rgba(255,255,255,.6); backdrop-filter:blur(6px); border-radius:16px; padding:24px; border:1px solid var(--olive100);">
        <svg class="heart-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin:0 auto 8px; display:block;">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#6b7c3f" />
        </svg>
        <p>Obrigado por fazer parte do nosso dia especial!</p>
        </div>
        <p>Com amor, Laryssa & Rafael</p>
        </footer>

        <script>
        function openModal(imageUrl, user) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalUser = document.getElementById('modalUser');
        
        modalImage.src = imageUrl;
        modalUser.textContent = user || 'Usuário';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        }
        
        function closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        
        const modal = document.getElementById('imageModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        }
        
        // Fechar modal com ESC
        document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
        closeModal();
        }
        });
        </script>
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
