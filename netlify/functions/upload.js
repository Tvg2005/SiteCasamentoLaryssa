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
  // CORS headers (sem alteração)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Lógica de OPTIONS e verificação de método POST (sem alteração)
  if (event.httpMethod === 'OPTIONS') { /* ... */ }
  if (event.httpMethod !== 'POST') { /* ... */ }

  try {
    // Toda a lógica de parse e validação permanece a mesma
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) { /* ... */ }
    const boundary = boundaryMatch[1];
    const parts = parseMultipartData(event.body, boundary);
    const fields = {};
    const files = [];
    parts.forEach(part => { /* ... */ });
    const userName = fields.userName;
    const photoFiles = files.filter(f => f.name === 'photos');
    if (!userName || photoFiles.length === 0) { /* ... */ }
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of photoFiles) { /* ... */ }

    console.log(`Upload iniciado para usuário: ${userName} com ${photoFiles.length} arquivos para o S3`);

    const uploadedFiles = [];
    
    for (let index = 0; index < photoFiles.length; index++) {
      const file = photoFiles[index];
      
      try {
        console.log(`Processando arquivo ${index + 1}/${photoFiles.length}: ${file.originalFilename}`);
        
        // ALTERADO: Chama a nova função de upload
        const uploadedFile = await uploadToS3(file, userName);
        
        uploadedFiles.push(uploadedFile);
        console.log(`✅ Arquivo ${index + 1} enviado com sucesso`);
        
        if (index < photoFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Falha no arquivo ${index + 1}: ${file.originalFilename}`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ Upload concluído: ${uploadedFiles.length}/${photoFiles.length} arquivos enviados para o S3`);

    // A resposta de sucesso permanece estruturalmente a mesma
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
    // O tratamento de erro geral permanece o mesmo
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