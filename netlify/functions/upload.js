const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// A função parseMultipartData permanece exatamente a mesma
function parseMultipartData(body, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const bodyBuffer = Buffer.from(body, 'base64');
  
  let start = 0;
  let end = bodyBuffer.indexOf(boundaryBuffer, start);
  
  while (end !== -1) {
    if (start !== 0) {
      const part = bodyBuffer.slice(start, end);
      const headerEnd = part.indexOf('\r\n\r\n');
      
      if (headerEnd !== -1) {
        const headers = part.slice(0, headerEnd).toString();
        const content = part.slice(headerEnd + 4);
        
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
        
        if (nameMatch) {
          const field = {
            name: nameMatch[1],
            content: content.slice(0, -2), // Remove trailing \r\n
            headers: {}
          };
          
          if (filenameMatch) {
            field.originalFilename = filenameMatch[1];
            field.headers['content-type'] = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
            field.buffer = field.content;
          } else {
            field.value = field.content.toString();
          }
          
          parts.push(field);
        }
      }
    }
    
    start = end + boundaryBuffer.length;
    end = bodyBuffer.indexOf(boundaryBuffer, start);
  }
  
  return parts; // Essencial: retorna o array com os dados
}

// NOVO: Configuração para o AWS S3
const s3Config = {
  region: process.env.AWS_REGION_PRJ,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_PRJ,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_PRJ,
  },
  bucketName: process.env.S3_BUCKET_NAME_PRJ
};

// NOVO: Inicializar o cliente S3
const s3Client = new S3Client({
  region: s3Config.region,
  credentials: s3Config.credentials,
});

// ALTERADO: Função de upload agora para o S3
async function uploadToS3(file, userName) {
  try {
    // Definir o caminho/chave do objeto no S3
    const key = `CasamentoLaryssaERafael/${userName}/${Date.now()}_${file.originalFilename}`;

    // Criar o comando para enviar o objeto
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: file.buffer, // O conteúdo do arquivo
      ContentType: file.headers['content-type'], // Importante para o navegador saber o tipo do arquivo
      ACL: 'public-read' // Torna o arquivo publicamente legível
    });

    console.log(`Iniciando upload para o S3: ${key}`);
    
    // Enviar o comando para o S3
    await s3Client.send(command);

    // Construir a URL pública do arquivo
    const url = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${key}`;

    console.log(`✅ Upload bem-sucedido para S3: ${file.originalFilename}`);

    return {
      id: key,
      name: file.originalFilename,
      url: url,
      size: file.buffer.length, // O tamanho em bytes
      format: file.originalFilename.split('.').pop()
    };

  } catch (error) {
    console.error(`Erro no upload para o S3 para ${file.originalFilename}:`, error.message);

    throw new Error(`Falha no upload para o S3: ${error.message}`);
  }
}
// O handler principal da função Netlify
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    
    if (!boundaryMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid content type' }),
      };
    }
    
    const boundary = boundaryMatch[1];
    const parts = parseMultipartData(event.body, boundary);
    
    // Separa os campos dos arquivos
    const fields = {};
    const files = [];
    
    // ✅ RESTAURANDO O CÓDIGO DO FOREACH
    parts.forEach(part => {
      if (part.originalFilename) {
        files.push(part);
      } else {
        fields[part.name] = part.value;
      }
    });

    const userName = fields.userName;
    const photoFiles = files.filter(f => f.name === 'photos');

    // ✅ RESTAURANDO A VALIDAÇÃO
    if (!userName || photoFiles.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Nome do usuário e pelo menos uma foto são obrigatórios' 
        }),
      };
    }

    // ✅ RESTAURANDO A VALIDAÇÃO DE TAMANHO DE ARQUIVO
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of photoFiles) {
      if (file.buffer.length > maxFileSize) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Arquivo ${file.originalFilename} é muito grande. Tamanho máximo: 10MB`
          }),
        };
      }
    }

    console.log(`Upload iniciado para usuário: ${userName} com ${photoFiles.length} arquivos para o S3`);

    const uploadedFiles = [];
    
    for (const file of photoFiles) {
      try {
        const uploadedFile = await uploadToS3(file, userName);
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        console.error(`❌ Falha no arquivo: ${file.originalFilename}`, error.message);
        throw error; // Joga o erro para o catch principal
      }
    }
    
    console.log(`✅ Upload concluído: ${uploadedFiles.length}/${photoFiles.length} arquivos enviados para o S3`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${uploadedFiles.length} fotos enviadas com sucesso para o Amazon S3`,
        user: userName,
        files: uploadedFiles,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
      }),
    };

  } catch (error) {
    console.error('Erro detalhado no upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        details: error.message,
      }),
    };
  }
};