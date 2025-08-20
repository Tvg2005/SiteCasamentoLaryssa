import cloudinary from 'cloudinary';

// Configuração do Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dm6zohuj2',
  api_key: process.env.CLOUDINARY_API_KEY || '145833586856947',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Jkt8rk3Zv8ALRqI9Glu1s6sYHgg'
};

// Parse multipart form data manually for Netlify
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
  
  return parts;
}

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
    console.log(`Tentativa ${retryCount + 1} de upload para Cloudinary: ${file.originalFilename}`);
    
    // Converter buffer para base64
    const base64Image = file.buffer.toString('base64');
    const dataURI = `data:${file.headers['content-type']};base64,${base64Image}`;
    
    // Criar um timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout no upload')), timeout);
    });
    
    // Promise do upload
    const uploadPromise = cloudinary.v2.uploader.upload(dataURI, {
      folder: `CasamentoLaryssaERafael/${userName}`,
      public_id: `${Date.now()}_${file.originalFilename}`,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
    
    // Race entre upload e timeout
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log(`✅ Upload bem-sucedido para Cloudinary: ${file.originalFilename}`);
    
    return {
      id: result.public_id,
      name: file.originalFilename,
      url: result.secure_url,
      size: result.bytes,
      format: result.format
    };
    
  } catch (error) {
    console.error(`Erro na tentativa ${retryCount + 1} para ${file.originalFilename}:`, error.message);
    
    if (retryCount < maxRetries) {
      console.log(`Tentando novamente em 2 segundos... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return uploadToCloudinary(file, userName, retryCount + 1);
    } else {
      console.error(`Falha definitiva após ${maxRetries} tentativas para: ${file.originalFilename}`);
      throw new Error(`Falha no upload após ${maxRetries} tentativas: ${error.message}`);
    }
  }
}

export const handler = async (event, context) => {
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
    // Parse multipart form data manually
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
    
    // Separate fields and files
    const fields = {};
    const files = [];
    
    parts.forEach(part => {
      if (part.originalFilename) {
        files.push(part);
      } else {
        fields[part.name] = part.value;
      }
    });

    const userName = fields.userName;
    const photoFiles = files.filter(f => f.name === 'photos');

    if (!userName || photoFiles.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Nome do usuário e pelo menos uma foto são obrigatórios' 
        }),
      };
    }

    // Verificar tamanho dos arquivos
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of photoFiles) {
      if (file.size > maxFileSize) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Arquivo ${file.originalFilename} é muito grande. Tamanho máximo: 10MB`
          }),
        };
      }
    }

    console.log(`Upload iniciado para usuário: ${userName} com ${photoFiles.length} arquivos`);

    // Upload de cada arquivo
    const uploadedFiles = [];
    
    for (let index = 0; index < photoFiles.length; index++) {
      const file = photoFiles[index];
      
      try {
        console.log(`Processando arquivo ${index + 1}/${photoFiles.length}: ${file.originalFilename}`);
        const uploadedFile = await uploadToCloudinary(file, userName);
        uploadedFiles.push(uploadedFile);
        console.log(`✅ Arquivo ${index + 1} enviado com sucesso`);
        
        // Pequena pausa entre uploads
        if (index < photoFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Falha no arquivo ${index + 1}: ${file.originalFilename}`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ Upload concluído: ${uploadedFiles.length}/${photoFiles.length} arquivos enviados`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${uploadedFiles.length} fotos enviadas com sucesso para Cloudinary`,
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