import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Configuração para o AWS S3 a partir das variáveis de ambiente
const s3Config = {
  region: process.env.AWS_REGION_PRJ || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_PRJ,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_PRJ,
  },
  bucketName: process.env.S3_BUCKET_NAME_PRJ
};

// Inicialização do cliente S3
const s3Client = new S3Client({
  region: s3Config.region,
  credentials: s3Config.credentials,
});

// Função para embaralhar um array (garante a aleatoriedade)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Função para buscar TODOS os objetos de um prefixo no S3
async function listAllObjects(prefix) {
  let objects = [];
  let isTruncated = true;
  let continuationToken;

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: s3Config.bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(command);
    if (response.Contents) {
      const validObjects = response.Contents.filter(obj => obj.Size > 0);
      objects = objects.concat(validObjects);
    }
    isTruncated = response.IsTruncated;
    continuationToken = response.NextContinuationToken;
  }
  return objects;
}

// Função para listar as "pastas" de usuários no S3 de forma eficiente
async function listUserFolders() {
  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucketName,
    Prefix: 'CasamentoLaryssaERafael/',
    Delimiter: '/',
  });
  const response = await s3Client.send(command);
  const folders = (response.CommonPrefixes || []).map(prefix =>
    prefix.Prefix.replace('CasamentoLaryssaERafael/', '').replace('/', '')
  );
  return folders.sort();
}

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'text/html; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const pathParts = event.path.split('/').filter(Boolean);
    const userName = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : '';
    const isAll = !userName;
    const prefix = isAll ? 'CasamentoLaryssaERafael/' : `CasamentoLaryssaERafael/${userName}/`;
    const bucketBaseUrl = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com`;

    // Busca os dados do S3 uma única vez
    const [folders, allS3Objects] = await Promise.all([
      listUserFolders(),
      listAllObjects(prefix),
    ]);

    // Prepara a lista de imagens para o cliente
    let imageList = allS3Objects
      .sort((a, b) => b.LastModified - a.LastModified)
      .map(obj => ({
        key: obj.Key,
        url: `${bucketBaseUrl}/${obj.Key}`,
        user: obj.Key.split('/')[1] || 'Casamento',
        name: obj.Key.split('/').pop(),
      }));

    // Se for a visão "Todas", embaralha a lista
    if (isAll) {
      imageList = shuffleArray(imageList);
    }
    
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
                --olive50:#f7f8f0; --olive100:#eef0e0; --olive200:#dde2c2; --olive600:#6b7c3f; --olive700:#556b2f; --olive800:#475a28; --amber50:#fffbeb; --green50:#f7f8f0; --g100:#f3f4f6; --g200:#e5e7eb; --g500:#6b7280; --g700:#374151;
            }
            *{ box-sizing:border-box }
            body{ margin:0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial; background:linear-gradient(135deg,var(--amber50),var(--green50)); color:var(--g700); }
            .container{ max-width:1100px; margin:0 auto; padding:16px }
            .header{ position:sticky; top:0; z-index:10; backdrop-filter:blur(6px); background:rgba(255,255,255,.9); box-shadow:0 4px 6px rgba(0,0,0,.05); border-bottom:1px solid var(--olive100); padding:0 16px; }
            .header-content{ position:relative; max-width:1100px; margin:0 auto; }
            .brand{ display:flex; align-items:center; justify-content:center; gap:8px; padding: 20px 0 8px; }
            .brand h1{ margin:0; color:var(--olive800); font-family:ui-serif, Georgia, Cambria, Times New Roman, Times, serif; font-weight: normal; font-size: 36px; }
            .subtitle{ text-align:center; color: var(--olive700); font-weight: 500; font-size:clamp(14px, 2.5vw, 16px); margin: 0 0 20px; padding:0 60px; }
            .subtitle-header{ text-align:center; color: #6B7C3F; font-weight: 300; font-size:clamp(15px, 2.5vw, 17px); margin: 0 0 20px; padding:0 60px; }
            .back-btn{ position:absolute; left:0; top:50%; transform:translateY(-50%); background:var(--olive600); color:white; border:none; padding:8px 12px; border-radius:8px; text-decoration:none; font-size:clamp(12px, 2vw, 14px); font-weight:500; transition:.2s; white-space:nowrap; }
            .back-btn:hover{ background:var(--olive700); transform:translateY(-50%) scale(1.05); }
            @media (max-width: 640px) {
                .back-btn { top: 30px; transform: translateY(-50%); left: 0; font-size: 20px; padding: 0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: transparent; color: var(--olive700); }
                .back-btn .back-btn-text { display: none; }
                .back-btn:hover { background: var(--olive100); transform: translateY(-50%) scale(1.1); }
                .subtitle { padding: 0 45px; }
                .brand h1 { font-size: 24px; }
                .brand .heart-icon { width: 24px; height: 24px; }
            }
            .toolbar{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:20px; padding:0 10px; }
            .chip{ border:2px solid var(--olive600); color:var(--olive600); background:#fff; padding:6px 12px; border-radius:999px; text-decoration:none; font-weight:500; font-size:clamp(12px, 2vw, 14px); transition:.2s; text-align:center; min-width:fit-content; }
            .chip.active, .chip:hover{ background:var(--olive100); border-color:var(--olive700); color:var(--olive700) }
            @media (max-width: 480px) { .chip { padding:4px 8px; font-size:12px; } }
            .hero{ background:rgba(255,255,255,.8); border:1px solid var(--olive100); border-radius:18px; padding:16px; margin:20px auto; text-align:center; box-shadow:0 8px 16px rgba(0,0,0,.1); backdrop-filter:blur(6px); }
            .grid{ display:grid; gap:16px; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); }
            @media (max-width: 640px) { .grid { grid-template-columns: repeat(auto-fill,minmax(250px,1fr)); gap:12px; } }
            @media (max-width: 480px) { .grid { grid-template-columns: 1fr; gap:12px; } }
            .card{ background:#fff; border:1px solid var(--olive100); border-radius:16px; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,.1); transition:transform .2s, box-shadow .2s; cursor:pointer; }
            .card:hover{ transform:scale(1.02); box-shadow:0 20px 25px -5px rgba(0,0,0,.15) }
            .thumb{ display:block; width:100%; height:220px; object-fit:cover; background:var(--g100); }
            .meta{ display:flex; align-items:center; justify-content:center; padding:12px; font-size:13px; color:var(--olive700); }
            .pill{ padding:8px 16px; border-radius:999px; background:var(--olive100); border:1px solid var(--olive200); color:var(--olive800); font-weight:600; font-size:12px; text-align:center; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; visibility:hidden; transition:all 0.3s ease; }
            .modal-overlay.active { opacity:1; visibility:visible; }
            .modal-content { background:white; border-radius:16px; max-width:90vw; max-height:90vh; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); transform:scale(0.9); transition:transform 0.3s ease; position:relative; }
            .modal-overlay.active .modal-content { transform:scale(1); }
            .modal-header { background:linear-gradient(135deg, var(--olive600), var(--olive700)); color:white; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; }
            .modal-title { font-size:18px; font-weight:600; display:flex; align-items:center; gap:8px; }
            .modal-close { background:none; border:none; color:white; font-size:24px; cursor:pointer; padding:4px; border-radius:4px; transition:background 0.2s; }
            .modal-close:hover { background:rgba(255,255,255,0.2); }
            .modal-image { width:100%; height:auto; max-height:70vh; object-fit:contain; display:block; }
            .modal-footer { padding:16px 20px; background:var(--olive50); border-top:1px solid var(--olive100); text-align:center; }
            .modal-user { color:var(--olive700); font-weight:600; font-size:16px; }
            footer{ text-align:center; color:var(--olive700); padding:24px 16px; margin-top:40px; }
            footer p{ margin:6px 0; font-weight:300 }
            .heart-icon{ animation: pulse 2s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-content">
                <a href="/" class="back-btn">←<span class="back-btn-text"> Voltar</span></a>
                <div class="brand">
                    <svg class="heart-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="#6B7C3F" stroke-width="1.5"/></svg>
                    <h1>Laryssa & Rafael</h1>
                    <svg class="heart-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="#6B7C3F" stroke-width="1.5"/></svg>
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

            ${imageList.length === 0 ? `<p class="subtitle" style="color:var(--g500)">Nenhuma imagem encontrada${!isAll ? ' para '+userName : ''}.</p>` : ''}
            
            <div class="grid" id="image-grid"></div>
            <div id="sentinel" style="height: 50px;"></div>
        </main>

        <div id="imageModal" class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/><polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/></svg>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <img id="modalImage" class="modal-image" src="" alt="" />
                <div class="modal-footer">
                    <div class="modal-user">Enviado por: <span id="modalUser">Usuário</span></div>
                </div>
            </div>
        </div>

        <footer>
            <div style="background:rgba(255,255,255,.6); backdrop-filter:blur(6px); border-radius:16px; padding:24px; border:1px solid var(--olive100);">
                <svg class="heart-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin:0 auto 8px; display:block;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#6b7c3f" /></svg>
                <p>Obrigado por fazer parte do nosso dia especial!</p>
            </div>
            <p>Com amor, Laryssa & Rafael</p>
        </footer>

        <script>
            // A lista completa de imagens é injetada aqui pelo servidor
            const allImages = ${JSON.stringify(imageList)};
            
            const IMAGES_PER_PAGE = 8;
            const SESSION_LIMIT = 48;
            
            let currentPage = 0;
            let sessionImageCount = 0;
            let isLoading = false;

            const grid = document.getElementById('image-grid');
            const sentinel = document.getElementById('sentinel');

            function createImageCard(imageData) {
                return \`
                <figure class="card" onclick="openModal('\${imageData.url}', '\${imageData.user}', '\${imageData.name}')">
                    <img class="thumb" src="\${imageData.url}" alt="\${imageData.name}" loading="lazy" />
                    <figcaption class="meta">
                        <span class="pill" title="\${imageData.user}">\${imageData.user}</span>
                    </figcaption>
                </figure>
                \`;
            }

            function loadMoreImages() {
                if (isLoading || sessionImageCount >= SESSION_LIMIT) {
                    if (sessionImageCount >= SESSION_LIMIT || (currentPage * IMAGES_PER_PAGE) >= allImages.length) {
                        sentinel.style.display = 'none';
                    }
                    return;
                }

                isLoading = true;
                const startIndex = currentPage * IMAGES_PER_PAGE;
                const endIndex = startIndex + IMAGES_PER_PAGE;
                const imagesToLoad = allImages.slice(startIndex, endIndex);

                if (imagesToLoad.length === 0) {
                    isLoading = false;
                    sentinel.style.display = 'none';
                    return;
                }

                let htmlToAppend = '';
                for (const image of imagesToLoad) {
                    htmlToAppend += createImageCard(image);
                    sessionImageCount++;
                }

                grid.insertAdjacentHTML('beforeend', htmlToAppend);
                currentPage++;
                isLoading = false;
            }

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreImages();
                }
            }, { rootMargin: '200px' });

            if (allImages.length > 0) {
                observer.observe(sentinel);
                loadMoreImages(); // Carrega o primeiro lote
            } else {
                sentinel.style.display = 'none';
            }

            function openModal(imageUrl, user) {
                const modal = document.getElementById('imageModal');
                document.getElementById('modalImage').src = imageUrl;
                document.getElementById('modalUser').textContent = user || 'Usuário';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            
            function closeModal(event) {
                if (event && event.target !== event.currentTarget) return;
                const modal = document.getElementById('imageModal');
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
            
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeModal();
                }
            });
        </script>
    </body>
    </html>`;

    return {
      statusCode: 200,
      headers,
      body: html,
    };
  } catch (error) {
    console.error('Erro ao montar galeria pública com S3:', error);
    return {
      statusCode: 500,
      headers,
      body: '<h1>Erro ao montar galeria</h1><p>Ocorreu um problema ao buscar as imagens. Tente novamente mais tarde.</p>',
    };
  }
};


