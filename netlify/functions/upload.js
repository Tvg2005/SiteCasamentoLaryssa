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